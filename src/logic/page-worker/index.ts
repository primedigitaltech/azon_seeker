import Emittery from 'emittery';
import type { AmazonDetailItem, AmazonPageWorker, AmazonPageWorkerEvents } from './types';
import type { Tabs } from 'webextension-polyfill';
import { exec } from '../execute-script';
import { withErrorHandling } from '../error-handler';

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
    const tabId = tab.id!;
    // #region Wait for the Next button to appear, indicating that the product items have finished loading
    await exec(tabId, async () => {
      await new Promise((resolve) => setTimeout(resolve, 500 + ~~(500 * Math.random())));
      while (true) {
        const targetNode = document.querySelector('.s-pagination-next');
        window.scrollBy(0, ~~(Math.random() * 500) + 500);
        await new Promise((resolve) => setTimeout(resolve, ~~(Math.random() * 50) + 500));
        if (targetNode || document.readyState === 'complete') {
          targetNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500 + ~~(500 * Math.random())));
        const spins = Array.from(document.querySelectorAll<HTMLDivElement>('.a-spinner')).filter(
          (e) => e.getClientRects().length > 0,
        );
        if (spins.length === 0) {
          break;
        }
      }
    });
    // #endregion
    // #region Determine the type of product search page https://github.com/primedigitaltech/azon_seeker/issues/1
    const pagePattern = await exec(tabId, async () => {
      return [
        ...(document.querySelectorAll<HTMLDivElement>(
          '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
        ) as unknown as HTMLDivElement[]),
      ].filter((e) => e.getClientRects().length > 0).length > 0
        ? 'pattern-1'
        : 'pattern-2';
    });
    if (typeof pagePattern !== 'string') {
      this.channel.emit('error', { message: '无法判断商品搜索页类型', url: tab.url });
      throw new Error('无法判断商品搜索页类型');
    }
    // #endregion
    // #region Retrieve key nodes and their information from the critical product search page
    let data: { link: string; title: string; imageSrc: string }[] | null = null;
    switch (pagePattern) {
      // 处理商品以列表形式展示的情况
      case 'pattern-1':
        data = await exec(tabId, async () => {
          const items = Array.from(
            document.querySelectorAll<HTMLDivElement>(
              '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
            ),
          ).filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<{ link: string; title: string; imageSrc: string }[]>(
            (objs, el) => {
              const link = el.querySelector<HTMLAnchorElement>('a')?.href;
              const title = el
                .querySelector<HTMLHeadingElement>('h2.a-color-base')!
                .getAttribute('aria-label')!;
              const imageSrc = el.querySelector<HTMLImageElement>('img.s-image')!.src!;
              link && objs.push({ link, title, imageSrc });
              return objs;
            },
            [],
          );
          return linkObjs;
        });
        break;
      // 处理商品以二维图片格展示的情况
      case 'pattern-2':
        data = await exec(tabId, async () => {
          const items = Array.from(
            document.querySelectorAll<HTMLDivElement>(
              '.puis-card-container:has(.a-section.a-spacing-small.puis-padding-left-small)',
            ) as unknown as HTMLDivElement[],
          ).filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<{ link: string; title: string; imageSrc: string }[]>(
            (objs, el) => {
              const link = el.querySelector<HTMLAnchorElement>('a.a-link-normal')?.href;
              const title = el.querySelector<HTMLHeadingElement>('h2.a-color-base')!.innerText;
              const imageSrc = el.querySelector<HTMLImageElement>('img.s-image')!.src!;
              link && objs.push({ link, title, imageSrc });
              return objs;
            },
            [],
          );
          return linkObjs;
        });
        break;
      default:
        break;
    }
    // #endregion
    // #region get current page
    const page = (await exec<number>(tab.id!, async () => {
      const node = document.querySelector<HTMLDivElement>(
        '.s-pagination-item.s-pagination-selected',
      );
      return node ? Number(node.innerText) : 1;
    }))!;
    // #endregion
    // #region Determine if it is the last page, otherwise navigate to the next page
    const hasNextPage = await exec(tabId, async () => {
      const nextButton = document.querySelector<HTMLLinkElement>('.s-pagination-next');
      if (nextButton) {
        if (!nextButton.classList.contains('s-pagination-disabled')) {
          await new Promise((resolve) => setTimeout(resolve, 500 + ~~(500 * Math.random())));
          nextButton.click();
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    });
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
    //#endregion
    //#region Await Production Introduction Element Loaded and Determine Page Pattern
    await exec(tab.id!, async () => {
      while (true) {
        window.scrollBy(0, ~~(Math.random() * 500) + 500);
        await new Promise((resolve) => setTimeout(resolve, ~~(Math.random() * 100) + 200));
        const targetNode = document.querySelector(
          '#prodDetails:has(td), #detailBulletsWrapper_feature_div:has(li), .av-page-desktop',
        );
        const exceptionalNodeSelectors = ['music-detail-header', '.avu-retail-page'];
        for (const selector of exceptionalNodeSelectors) {
          if (document.querySelector(selector)) {
            return false;
          }
        }
        if (targetNode && document.readyState !== 'loading') {
          targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          break;
        }
      }
      return true;
    });
    await new Promise((resolve) => setTimeout(resolve, 3000)); // Wait 3 seconds.
    //#endregion
    //#region Fetch Rating Info
    const ratingInfo = await exec(tab.id!, async () => {
      const review = document.querySelector('#averageCustomerReviews');
      const rating = Number(
        review?.querySelector('#acrPopover')?.getAttribute('title')?.split(' ')[0],
      );
      const ratingCount = Number(
        review
          ?.querySelector('#acrCustomerReviewText')
          ?.getAttribute('aria-label')
          ?.split(' ')[0]
          ?.replace(',', ''),
      );
      return {
        rating: isNaN(rating) || rating == 0 ? 0 : rating,
        ratingCount: isNaN(ratingCount) || ratingCount == 0 ? 0 : ratingCount,
      };
    });
    if (ratingInfo && (ratingInfo.rating !== 0 || ratingInfo.ratingCount !== 0)) {
      this.channel.emit('item-rating-collected', {
        asin: params.asin,
        ...ratingInfo,
      });
    }
    //#endregion
    //#region Fetch Category Rank Info
    let rawRankingText: string | null = await exec(tab.id!, async () => {
      const xpathExps = [
        `//div[@id='detailBulletsWrapper_feature_div']//ul[.//li[contains(., 'Best Sellers Rank')]]//span[@class='a-list-item']`,
        `//div[@id='prodDetails']//table/tbody/tr[th[1][contains(text(), 'Best Sellers Rank')]]/td`,
        `//div[@id='productDetails_db_sections']//table/tbody/tr[th[1][contains(text(), 'Best Sellers Rank')]]/td`,
      ];
      for (const xpathExp of xpathExps) {
        const targetNode = document.evaluate(
          xpathExp,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null,
        ).singleNodeValue as HTMLDivElement | null;
        if (targetNode) {
          targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return targetNode.innerText;
        }
      }
      return null;
    });
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
    const imageUrls = await exec(tab.id!, async () => {
      let urls = Array.from(document.querySelectorAll<HTMLImageElement>('.imageThumbnail img')).map(
        (e) => e.src,
      );
      //#region process more images https://github.com/primedigitaltech/azon_seeker/issues/4
      const overlay = document.querySelector<HTMLDivElement>('.overlayRestOfImages');
      if (overlay) {
        if (document.querySelector<HTMLDivElement>('#ivThumbs')!.getClientRects().length === 0) {
          overlay.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        urls = [
          ...(document.querySelectorAll(
            '#ivThumbs .ivThumbImage[style]',
          ) as unknown as HTMLDivElement[]),
        ].map((e) => e.style.background);
        urls = urls.map((s) => {
          const [url] = /(?<=url\(").+(?=")/.exec(s)!;
          return url;
        });
        await new Promise((resolve) => setTimeout(resolve, 1000));
        document
          .querySelector<HTMLButtonElement>(".a-popover button[data-action='a-popover-close']")
          ?.click();
      }
      //#endregion
      //#region post-process image urls
      urls = urls.map((rawUrl) => {
        const imgUrl = new URL(rawUrl);
        const paths = imgUrl.pathname.split('/');
        const chunks = paths[paths.length - 1].split('.');
        const [name, ext] = [chunks[0], chunks[chunks.length - 1]];
        paths[paths.length - 1] = `${name}.${ext}`;
        imgUrl.pathname = paths.join('/');
        return imgUrl.toString();
      });
      //#endregion
      return urls;
    });
    imageUrls.length > 0 &&
      this.channel.emit('item-images-collected', {
        asin: params.asin,
        imageUrls: Array.from(new Set(imageUrls)),
      });
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds.
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
