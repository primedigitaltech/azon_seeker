import Emittery from 'emittery';
import type { AmazonDetailItem, AmazonPageWorker, AmazonPageWorkerEvents } from './types';
import type { Tabs } from 'webextension-polyfill';
import { withErrorHandling } from '../error-handler';
import { AmazonDetailPageInjector, AmazonSearchPageInjector } from '../web-injectors';

/**
 * AmazonPageWorkerImpl can run on background & sidepanel & popup,
 *  **can't** run on content script!
 */
class AmazonPageWorkerImpl implements AmazonPageWorker {
  //#region Singleton
  private static _instance: AmazonPageWorker | null = null;
  public static getInstance() {
    if (this._instance === null) {
      this._instance = new AmazonPageWorkerImpl();
    }
    return this._instance;
  }
  //#endregion

  private constructor() {}

  private _controlChannel = new Emittery<{ interrupt: undefined }>();
  public readonly channel = new Emittery<AmazonPageWorkerEvents>();

  private async getCurrentTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    return tab;
  }

  private async createNewTab(url: string): Promise<Tabs.Tab> {
    const tab = await browser.tabs.create({
      url,
      active: true,
    });
    return tab;
  }

  private async wanderSearchSinglePage(tab: Tabs.Tab) {
    const injector = new AmazonSearchPageInjector(tab);
    // #region Wait for the Next button to appear, indicating that the product items have finished loading
    await injector.waitForPageLoaded();
    // #endregion
    // #region Determine the type of product search page https://github.com/primedigitaltech/azon_seeker/issues/1
    const pagePattern = await injector.getPagePattern();
    // #endregion
    // #region Retrieve key nodes and their information from the critical product search page
    const data = await injector.getPageData(pagePattern);
    // #endregion
    // #region get current page
    const page = await injector.getCurrentPage();
    // #endregion
    // #region Determine if it is the last page, otherwise navigate to the next page
    const hasNextPage = await injector.determineHasNextPage();
    // #endregion
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (data === null || typeof hasNextPage !== 'boolean') {
      this.channel.emit('error', { message: '爬取单页信息失败', url: tab.url });
      throw new Error('爬取单页信息失败');
    }
    return { data, hasNextPage, page };
  }

  @withErrorHandling
  public async doSearch(keywords: string): Promise<string> {
    const url = new URL('https://www.amazon.com/s');
    url.searchParams.append('k', keywords);
    let tab = await this.getCurrentTab();
    if (!tab.url?.startsWith('http')) {
      tab = await this.createNewTab('https://www.amazon.com/');
      tab.url = 'https://www.amazon.com/';
    }
    const currentUrl = new URL(tab.url!);
    if (currentUrl.hostname !== url.hostname || currentUrl.searchParams.get('k') !== keywords) {
      await browser.tabs.update(tab.id, { url: url.toString() });
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    return url.toString();
  }

  @withErrorHandling
  public async wanderSearchPage(): Promise<void> {
    let tab = await this.getCurrentTab();
    let offset = 0;
    while (true) {
      const { hasNextPage, data, page } = await this.wanderSearchSinglePage(tab);
      const keywords = new URL(tab.url!).searchParams.get('k')!;
      const objs = data.map((r, i) => ({
        ...r,
        keywords,
        page,
        rank: offset + 1 + i,
        createTime: new Date().toLocaleString(),
        asin: /(?<=\/dp\/)[A-Z0-9]{10}/.exec(r.link as string)![0],
      }));
      this.channel.emit('item-links-collected', { objs });
      offset += data.length;
      if (!hasNextPage) {
        break;
      }
    }
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  @withErrorHandling
  public async wanderDetailPage(entry: string) {
    //#region Initial Meta Info
    const params = { asin: '', url: '' };
    if (entry.match(/^https?:\/\/www\.amazon\.com.*\/dp\/[A-Z0-9]{10}/)) {
      const [asin] = /\/\/dp\/[A-Z0-9]{10}/.exec(entry)!;
      params.asin = asin;
      params.url = entry;
    } else if (entry.match(/^[A-Z0-9]{10}$/)) {
      params.asin = entry;
      params.url = `https://www.amazon.com/dp/${entry}`;
    }
    let tab = await this.getCurrentTab();
    if (!tab.url || !tab.url.startsWith('http')) {
      tab = await this.createNewTab(params.url);
    } else {
      tab = await browser.tabs.update(tab.id, {
        url: params.url,
      });
    }
    const injector = new AmazonDetailPageInjector(tab);
    //#endregion
    //#region Await Production Introduction Element Loaded and Determine Page Pattern
    await injector.waitForPageLoaded();
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds.
    //#endregion
    //#region Fetch Rating Info
    const ratingInfo = await injector.getRatingInfo();
    if (ratingInfo && (ratingInfo.rating !== 0 || ratingInfo.ratingCount !== 0)) {
      this.channel.emit('item-rating-collected', {
        asin: params.asin,
        ...ratingInfo,
      });
    }
    //#endregion
    //#region Fetch Category Rank Info
    let rawRankingText: string | null = await injector.getRankText();
    if (rawRankingText) {
      const info: Pick<AmazonDetailItem, 'category1' | 'category2'> = {};
      let statement = /#[0-9,]+\sin\s\S[\s\w',\.&\(\)]+/.exec(rawRankingText)?.[0];
      if (statement) {
        const name = /(?<=in\s).+(?=\s\(See)/.exec(statement)?.[0] || null;
        const rank = Number(/(?<=#)[0-9,]+/.exec(statement)?.[0].replaceAll(',', '')) || null;
        if (name && rank) {
          info['category1'] = { name, rank };
        }
        rawRankingText = rawRankingText.replace(statement, '');
      }
      statement = /#[0-9,]+\sin\s\S[\s\w',\.&\(\)]+/.exec(rawRankingText)?.[0];
      if (statement) {
        const name = /(?<=in\s).+/.exec(statement)?.[0].replace(/[\s]+$/, '') || null;
        const rank = Number(/(?<=#)[0-9,]+/.exec(statement)?.[0].replaceAll(',', '')) || null;
        if (name && rank) {
          info['category2'] = { name, rank };
        }
      }
      this.channel.emit('item-category-rank-collected', {
        asin: params.asin,
        ...info,
      });
    }
    //#endregion
    //#region Fetch Goods' Images
    const imageUrls = await injector.getImageUrls();
    imageUrls.length > 0 &&
      this.channel.emit('item-images-collected', {
        asin: params.asin,
        imageUrls: Array.from(new Set(imageUrls)),
      });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds.
    //#endregion
    //#region Fetch Top Reviews
    // const reviews = await injector.getReviews();
    // reviews.length > 0 &&
    //   this.channel.emit('item-top-reviews-collected', {
    //     reviews: reviews.map((r) => ({ asin: params.asin, ...r })),
    //   });
    //#endregion
  }

  public async runSearchPageTask(
    keywordsList: string[],
    progress?: (remains: string[]) => Promise<void>,
  ): Promise<void> {
    let remains = [...keywordsList];
    let interrupt = false;
    const unsubscribe = this._controlChannel.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const kw = remains.shift()!;
      await this.doSearch(kw);
      await this.wanderSearchPage();
      progress && progress(remains);
    }
    unsubscribe();
  }

  public async runDetaiPageTask(
    asins: string[],
    progress?: (remains: string[]) => Promise<void>,
  ): Promise<void> {
    let remains = [...asins];
    let interrupt = false;
    const unsubscribe = this._controlChannel.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const asin = remains.shift()!;
      await this.wanderDetailPage(asin);
      progress && progress(remains);
    }
    unsubscribe();
  }

  public async stop(): Promise<void> {
    this._controlChannel.emit('interrupt');
  }
}

class PageWorkerFactory {
  public useAmazonPageWorker(): AmazonPageWorker {
    return AmazonPageWorkerImpl.getInstance();
  }
}

const pageWorkerFactory = new PageWorkerFactory();

export default pageWorkerFactory;
