import Emittery from 'emittery';
import type { AmazonPageWorker, AmazonPageWorkerEvents } from './types';
import type { Tabs } from 'webextension-polyfill';
import { exec } from '../execute-script';

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
  private constructor() {}
  //#endregion

  /**
   * The channel for communication with the Amazon page worker.
   */
  readonly channel = new Emittery<AmazonPageWorkerEvents>();

  /**
   * The signal to interrupt the current operation.
   */
  private _interruptSignal = false;

  private async getCurrentTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    return tab;
  }

  private async wanderSearchSinglePage(tab: Tabs.Tab) {
    const tabId = tab.id!;
    // #region Wait for the Next button to appear, indicating that the product items have finished loading
    await exec(tabId, async () => {
      await new Promise((resolve) => setTimeout(resolve, 500 + ~~(500 * Math.random())));
      while (!document.querySelector('.s-pagination-strip')) {
        window.scrollBy(0, ~~(Math.random() * 500) + 500);
        await new Promise((resolve) => setTimeout(resolve, ~~(Math.random() * 50) + 50));
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
          const items = [
            ...(document.querySelectorAll<HTMLDivElement>(
              '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
            ) as unknown as HTMLDivElement[]),
          ].filter((e) => e.getClientRects().length > 0);
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
          const items = [
            ...(document.querySelectorAll<HTMLDivElement>(
              '.puis-card-container:has(.a-section.a-spacing-small.puis-padding-left-small)',
            ) as unknown as HTMLDivElement[]),
          ].filter((e) => e.getClientRects().length > 0);
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
        throw new Error('Error: next page button not found');
      }
    });
    // #endregion
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (data === null || typeof hasNextPage !== 'boolean') {
      this.channel.emit('error', { message: '爬取单页信息失败', url: tab.url });
      throw new Error('爬取单页信息失败');
    }
    return { data, hasNextPage };
  }

  public async doSearch(keywords: string): Promise<string> {
    const url = new URL('https://www.amazon.com/s');
    url.searchParams.append('k', keywords);

    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    const currentUrl = new URL(tab.url!);
    if (currentUrl.hostname !== url.hostname || currentUrl.searchParams.get('k') !== keywords) {
      await browser.tabs.update(tab.id, { url: url.toString() });
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    return url.toString();
  }

  public async wanderSearchPage(): Promise<void> {
    const tab = await this.getCurrentTab();
    this._interruptSignal = false;
    const stop = async (_: unknown): Promise<void> => {
      this._interruptSignal = true;
    };
    this.channel.on('error', stop);
    let result = {
      hasNextPage: true,
      data: [] as unknown[],
    };
    while (result.hasNextPage && !this._interruptSignal) {
      result = await this.wanderSearchSinglePage(tab);
      this.channel.emit('item-links-collected', {
        objs: result.data as { link: string; title: string; imageSrc: string }[],
      });
    }
    this._interruptSignal = false;
    this.channel.off('error', stop);
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  public async wanderDetailPage(entry: string): Promise<void> {
    const tab = await this.getCurrentTab();
    const params = { asin: '', url: '' };
    if (entry.match(/^https?:\/\/www\.amazon\.com.*\/dp\/[A-Z0-9]{10}/)) {
      const [asin] = /\/\/dp\/[A-Z0-9]{10}/.exec(entry)!;
      params.asin = asin;
      params.url = entry;
    } else if (entry.match(/^[A-Z0-9]{10}$/)) {
      params.asin = entry;
      params.url = `https://www.amazon.com/dp/${entry}`;
    }
    if (!tab.url?.includes(`www.amazon.com`) || !tab.url?.includes(`/dp/${params.asin}`)) {
      await browser.tabs.update(tab.id!, {
        url: params.url,
      });
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    //#region Await Production Introduction Element Loaded and Determine Page Pattern
    const pattern = await exec(tab.id!, async () => {
      let targetNode = document.querySelector('#prodDetails, #detailBulletsWrapper_feature_div');
      while (!targetNode) {
        window.scrollBy(0, ~~(Math.random() * 500) + 500);
        await new Promise((resolve) => setTimeout(resolve, ~~(Math.random() * 50) + 50));
        targetNode = document.querySelector('#prodDetails, #detailBulletsWrapper_feature_div');
      }
      return targetNode.getAttribute('id') === 'prodDetails' ? 'pattern-1' : 'pattern-2';
    });
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
    let rawRankingText: string | null = null;
    switch (pattern) {
      case 'pattern-1':
        rawRankingText = await exec(tab.id!, async () => {
          const xpathExp = `//div[@id='prodDetails']//table/tbody/tr[th[1][contains(text(), 'Best Sellers Rank')]]/td`;
          const targetNode = document.evaluate(
            xpathExp,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue as HTMLDivElement | null;
          return targetNode?.innerText || null;
        });
        break;
      case 'pattern-2':
        rawRankingText = await exec(tab.id!, async () => {
          const xpathExp = `//div[@id='detailBulletsWrapper_feature_div']//ul[.//li[contains(., 'Best Sellers Rank')]]//span[@class='a-list-item']`;
          const targetNode = document.evaluate(
            xpathExp,
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null,
          ).singleNodeValue as HTMLDivElement | null;
          return targetNode?.innerText || null;
        });
        break;
    }
    if (rawRankingText) {
      const [category1Statement, category2Statement] = rawRankingText.split('\n');
      const category1Ranking =
        Number(/(?<=#)[0-9,]+/.exec(category1Statement)?.[0].replace(',', '')) || null; // "," should be removed
      const category1Name = /(?<=in\s).+(?=\s\(See)/.exec(category1Statement)?.[0] || null;
      const category2Ranking =
        Number(/(?<=#)[0-9,]+/.exec(category2Statement)?.[0].replace(',', '')) || null; // "," should be removed
      const category2Name = /(?<=in\s).+/.exec(category2Statement)?.[0] || null;
      this.channel.emit('item-category-rank-collected', {
        asin: params.asin,
        category1: ![category1Name, category1Ranking].includes(null)
          ? { name: category1Name!, rank: category1Ranking! }
          : undefined,
        category2: ![category2Name, category2Ranking].includes(null)
          ? { name: category2Name!, rank: category2Ranking! }
          : undefined,
      });
    }
    //#endregion
    //#region Fetch Goods' Images
    const imageUrls = await exec(tab.id!, async () => {
      let urls = [
        ...(document.querySelectorAll('.imageThumbnail img') as unknown as HTMLImageElement[]),
      ].map((e) => e.src);
      // https://github.com/primedigitaltech/azon_seeker/issues/4
      if (document.querySelector('.overlayRestOfImages')) {
        const overlay = document.querySelector<HTMLDivElement>('.overlayRestOfImages')!;
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
      }
      return urls;
    });
    imageUrls &&
      this.channel.emit('item-images-collected', {
        asin: entry,
        urls: imageUrls,
      });
    //#endregion
  }

  public async stop(): Promise<void> {
    this._interruptSignal = true;
  }
}

class PageWorkerFactory {
  public useAmazonPageWorker(): AmazonPageWorker {
    return AmazonPageWorkerImpl.getInstance();
  }
}

const pageWorkerFactory = new PageWorkerFactory();

export default pageWorkerFactory;
