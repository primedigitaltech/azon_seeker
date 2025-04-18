import Emittery from 'emittery';
import type { AmazonGoodsLinkItem, AmazonPageWorker, AmazonPageWorkerEvents } from './types';
import Browser from 'webextension-polyfill';
import { exec } from '../execute-script';

class AmazonPageWorkerImpl implements AmazonPageWorker {
  private static _instance: AmazonPageWorker | null = null;
  public static getInstance() {
    if (this._instance === null) {
      this._instance = new AmazonPageWorkerImpl();
    }
    return this._instance;
  }
  private constructor() {}

  readonly channel = new Emittery<AmazonPageWorkerEvents>();

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

  private async wanderSearchSinglePage(tab: Browser.Tabs.Tab) {
    const tabId = tab.id!;
    // #region Wait for the Next button to appear, indicating that the product items have finished loading
    await exec(tabId, async () => {
      await new Promise((resolve) => setTimeout(resolve, 500 + ~~(500 * Math.random())));
      while (!document.querySelector('.s-pagination-strip')) {
        window.scrollBy(0, ~~(Math.random() * 500) + 500);
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    });
    // #endregion
    // #region Determine the type of product search page https://github.com/primedigitaltech/azon_seeker/issues/1
    const pagePattern = await exec(tabId, async () => {
      return [
        ...(document.querySelectorAll<HTMLDivElement>(
          '.a-section.a-spacing-small.puis-padding-left-small',
        ) as unknown as HTMLDivElement[]),
      ].filter((e) => e.getClientRects().length > 0).length === 0
        ? 'pattern-1'
        : 'pattern-2';
    });
    if (typeof pagePattern !== 'string') {
      this.channel.emit('error', { message: '无法判断商品搜索页类型', url: tab.url });
      throw new Error('无法判断商品搜索页类型');
    }
    // #endregion
    // #region Retrieve key nodes and their information from the critical product search page
    let data: AmazonGoodsLinkItem[] | null = null;
    switch (pagePattern) {
      // 处理商品以列表形式展示的情况
      case 'pattern-1':
        data = await exec(tabId, async () => {
          const items = [
            ...(document.querySelectorAll<HTMLDivElement>(
              '.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right)',
            ) as unknown as HTMLDivElement[]),
          ].filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<AmazonGoodsLinkItem[]>((objs, el) => {
            const link = el.querySelector<HTMLAnchorElement>('a')?.href;
            const title = el
              .querySelector<HTMLHeadingElement>('h2.a-color-base')
              ?.getAttribute('aria-label');
            link && objs.push({ link, title: title || '' });
            return objs;
          }, []);
          return linkObjs;
        });
        break;
      // 处理商品以二维图片格展示的情况
      case 'pattern-2':
        data = await exec(tabId, async () => {
          const items = [
            ...(document.querySelectorAll<HTMLDivElement>(
              '.a-section.a-spacing-small.puis-padding-left-small',
            ) as unknown as HTMLDivElement[]),
          ].filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<AmazonGoodsLinkItem[]>((objs, el) => {
            const link = el.querySelector<HTMLAnchorElement>('a.a-link-normal')?.href;
            const title = el.querySelector<HTMLHeadingElement>('h2.a-color-base')?.innerText;
            link && objs.push({ link, title: title || '' });
            return objs;
          }, []);
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

  public async wanderSearchList(): Promise<void> {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    let stopSignal = false;
    let result = { hasNextPage: true, data: [] as AmazonGoodsLinkItem[] };
    while (result.hasNextPage && !stopSignal) {
      result = await this.wanderSearchSinglePage(tab);
      this.channel.emit('item-links-collected', { objs: result.data });
      this.channel.on('error', () => {
        stopSignal = true;
      });
    }
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  public async wanderDetailPage(): Promise<void> {}
}

class PageWorkerFactory {
  public useAmazonPageWorker(): AmazonPageWorker {
    return AmazonPageWorkerImpl.getInstance();
  }
}

const pageWorkerFactory = new PageWorkerFactory();

export default pageWorkerFactory;
