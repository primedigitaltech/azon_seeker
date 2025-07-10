import type { AmazonPageWorker, AmazonPageWorkerEvents, LanchTaskBaseOptions } from '../interfaces';
import type { Tabs } from 'webextension-polyfill';
import { withErrorHandling } from '../error-handler';
import {
  AmazonDetailPageInjector,
  AmazonReviewPageInjector,
  AmazonSearchPageInjector,
} from '../web-injectors/amazon';
import { isForbiddenUrl } from '~/env';
import { BaseWorker } from './base';

/**
 * AmazonPageWorkerImpl can run on background & sidepanel & popup,
 *  **can't** run on content script!
 */
class AmazonPageWorkerImpl
  extends BaseWorker<AmazonPageWorkerEvents & { interrupt: undefined }>
  implements AmazonPageWorker
{
  //#region Singleton
  private static _instance: AmazonPageWorker | null = null;
  public static getInstance() {
    if (this._instance === null) {
      this._instance = new AmazonPageWorkerImpl();
    }
    return this._instance;
  }
  protected constructor() {
    super();
  }
  //#endregion

  private async getCurrentTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    return tab;
  }

  private async createNewTab(url: string): Promise<Tabs.Tab> {
    const tab = await browser.tabs.create({ url, active: true });
    return tab;
  }

  private async wanderSearchSinglePage(tab: Tabs.Tab) {
    const injector = new AmazonSearchPageInjector(tab);
    // Wait for the Next button to appear, indicating that the product items have finished loading
    await injector.waitForPageLoaded();
    // Determine the type of product search page https://github.com/primedigitaltech/azon_seeker/issues/1
    const pagePattern = await injector.getPagePattern();
    // Retrieve key nodes and their information from the critical product search page
    const data = await injector.getPageData(pagePattern);
    // get current page
    const page = await injector.getCurrentPage();
    // Determine if it is the last page, otherwise navigate to the next page
    const hasNextPage = await injector.determineHasNextPage();
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (data === null || typeof hasNextPage !== 'boolean') {
      this.emit('error', { message: '爬取单页信息失败', url: tab.url });
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
      tab = await browser.tabs.update(tab.id, { url: url.toString(), active: true });
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    return url.toString();
  }

  @withErrorHandling
  public async wanderSearchPage(): Promise<void> {
    const tab = await this.getCurrentTab();
    let offset = 0;
    while (true) {
      const { hasNextPage, data, page } = await this.wanderSearchSinglePage(tab);
      const keywords = new URL(tab.url!).searchParams.get('k')!;
      const objs = data.map((r, i) => ({
        ...r,
        keywords,
        page,
        rank: offset + 1 + i,
        createTime: dayjs().format('YYYY/M/D HH:mm:ss'),
        asin: /(?<=\/dp\/)[A-Z0-9]{10}/.exec(r.link as string)![0],
      }));
      this.emit('item-links-collected', { objs });
      offset += data.length;
      if (!hasNextPage) {
        break;
      }
    }
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  @withErrorHandling
  public async wanderDetailPage(
    entry: string,
    options: Parameters<typeof this.runDetailPageTask>[1] = {},
  ) {
    //#region Initial Meta Info
    const { aplus = false, extra = false } = options;
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
    if (!tab.url || isForbiddenUrl(tab.url)) {
      tab = await this.createNewTab(params.url);
    } else {
      tab = await browser.tabs.update(tab.id, {
        url: params.url,
      });
    }
    const injector = new AmazonDetailPageInjector(tab);
    //#endregion
    //#region Await Production Introduction Element Loaded
    await injector.waitForPageLoaded();
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds.
    //#endregion
    //#region Fetch Base Info
    const baseInfo = await injector.getBaseInfo();
    const ratingInfo = await injector.getRatingInfo();
    await this.emit('item-base-info-collected', {
      asin: params.asin,
      ...baseInfo,
      ...ratingInfo,
      timestamp: dayjs().format('YYYY/M/D HH:mm:ss'),
    });
    //#endregion
    //#region Fetch Category Rank Info
    let rawRankingText: string | null = await injector.getRankText();
    if (rawRankingText) {
      const info: Pick<AmazonDetailItem, 'category1' | 'category2'> = {};
      let statement = /#[0-9,]+\sin\s\S[\s\w',\.&\(\)\-]+/.exec(rawRankingText)?.[0];
      if (statement) {
        const name = /(?<=in\s).+/.exec(statement)?.[0].replace(/\s\(See\sTop.+\)/, '');
        const rank = Number(/(?<=#)[0-9,]+/.exec(statement)?.[0].replaceAll(',', ''));
        if (name && !Number.isNaN(rank)) {
          info['category1'] = { name, rank };
        }
        rawRankingText = rawRankingText.replace(statement, '');
      }
      statement = /#[0-9,]+\sin\s\S[\s\w',\.&\(\)\-]+/.exec(rawRankingText)?.[0];
      if (statement) {
        const name = /(?<=in\s).+/.exec(statement)?.[0].replace(/[\s]+$/, '');
        const rank = Number(/(?<=#)[0-9,]+/.exec(statement)?.[0].replaceAll(',', ''));
        if (name && !Number.isNaN(rank)) {
          info['category2'] = { name, rank };
        }
      }
      await this.emit('item-category-rank-collected', {
        asin: params.asin,
        ...info,
      });
    }
    //#endregion
    //#region Fetch Goods' Images
    const imageUrls = await injector.getImageUrls();
    imageUrls.length > 0 &&
      (await this.emit('item-images-collected', {
        asin: params.asin,
        imageUrls: Array.from(new Set(imageUrls)),
      }));
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds.
    //#endregion
    //#region Fetch Top Reviews
    // const reviews = await injector.getTopReviews();
    // reviews.length > 0 &&
    //   await this.emit('item-top-reviews-collected', {
    //     asin: params.asin,
    //     topReviews: reviews,
    //   });
    //#endregion
    // #region Get APlus Sreen shot
    if (aplus && (await injector.scanAPlus())) {
      const { b64: base64data } = await injector.captureAPlus();
      await this.emit('item-aplus-screenshot-collect', { asin: params.asin, base64data });
    }
    // #endregion
    //#region Get Extra Info
    if (extra) {
      const extraInfo = await injector.getExtraInfo();
      this.emit('item-extra-info-collect', { asin: params.asin, info: extraInfo });
    }
    //#endregion
  }

  @withErrorHandling
  public async wanderReviewPage(asin: string, options: { recent?: boolean } = {}) {
    const { recent } = options;
    const url = new URL(
      `https://www.amazon.com/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews`,
    );
    recent && url.searchParams.set('sortBy', 'recent');
    const tab = await this.createNewTab(url.toString());
    const injector = new AmazonReviewPageInjector(tab);
    await injector.waitForPageLoad();
    for (let star = 1; star <= 5; star++) {
      await injector.showStarsDropDownMenu();
      await injector.selectStar(star);
      while (true) {
        await injector.waitForPageLoad();
        const reviews = await injector.getSinglePageReviews();
        reviews.length > 0 && this.emit('item-review-collected', { asin, reviews });
        const hasNextPage = await injector.jumpToNextPageIfExist();
        if (!hasNextPage) {
          break;
        }
      }
    }
    setTimeout(() => browser.tabs.remove(tab.id!), 1000);
  }

  public async runSearchPageTask(
    keywordsList: string[],
    options: LanchTaskBaseOptions = {},
  ): Promise<void> {
    const { progress } = options;
    let remains = [...keywordsList];
    let interrupt = false;
    const unsubscribe = this.on('interrupt', () => {
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

  public async runDetailPageTask(
    asins: string[],
    options: LanchTaskBaseOptions & { aplus?: boolean; extra?: boolean } = {},
  ): Promise<void> {
    const { progress, aplus = false } = options;
    const remains = [...asins];
    let interrupt = false;
    const unsubscribe = this.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const asin = remains.shift()!;
      await this.wanderDetailPage(asin, options);
      progress && progress(remains);
    }
    unsubscribe();
  }

  public async runReviewPageTask(
    asins: string[],
    options: LanchTaskBaseOptions & { recent?: boolean } = {},
  ): Promise<void> {
    const { progress } = options;
    const remains = [...asins];
    let interrupt = false;
    const unsubscribe = this.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const asin = remains.shift()!;
      await this.wanderReviewPage(asin, options);
      progress && progress(remains);
    }
    unsubscribe();
  }

  public stop(): Promise<void> {
    return this.emit('interrupt');
  }
}

export default {
  getAmazonPageWorker(): AmazonPageWorker {
    return AmazonPageWorkerImpl.getInstance();
  },
};
