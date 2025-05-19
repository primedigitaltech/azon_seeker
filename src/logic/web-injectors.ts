import { exec } from './execute-script';
import type { Tabs } from 'webextension-polyfill';
import type { AmazonReview } from './page-worker/types';

export class AmazonSearchPageInjector {
  readonly _tab: Tabs.Tab;

  constructor(tab: Tabs.Tab) {
    this._tab = tab;
  }

  public async waitForPageLoaded() {
    return exec(this._tab.id!, async () => {
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
  }

  public async getPagePattern() {
    return exec(this._tab.id!, async () => {
      return [
        ...(document.querySelectorAll<HTMLDivElement>(
          '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
        ) as unknown as HTMLDivElement[]),
      ].filter((e) => e.getClientRects().length > 0).length > 0
        ? 'pattern-1'
        : 'pattern-2';
    });
  }

  public async getPageData(pattern: 'pattern-1' | 'pattern-2') {
    let data: { link: string; title: string; imageSrc: string }[] | null = null;
    switch (pattern) {
      // 处理商品以列表形式展示的情况
      case 'pattern-1':
        data = await exec(this._tab.id!, async () => {
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
        data = await exec(this._tab.id!, async () => {
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
    data = data && data.filter((r) => new URL(r.link).pathname.includes('/dp/'));
    return data;
  }

  public async getCurrentPage() {
    return exec<number>(this._tab.id!, async () => {
      const node = document.querySelector<HTMLDivElement>(
        '.s-pagination-item.s-pagination-selected',
      );
      return node ? Number(node.innerText) : 1;
    });
  }

  public async determineHasNextPage() {
    return exec(this._tab.id!, async () => {
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
  }
}

export class AmazonDetailPageInjector {
  readonly _tab: Tabs.Tab;

  constructor(tab: Tabs.Tab) {
    this._tab = tab;
  }

  public async waitForPageLoaded() {
    return exec(this._tab.id!, async () => {
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
  }

  public async getRatingInfo() {
    return await exec(this._tab.id!, async () => {
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
  }

  public async getRankText() {
    return exec(this._tab.id!, async () => {
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
  }

  public async getImageUrls() {
    return exec(this._tab.id!, async () => {
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
  }

  public async getTopReviews() {
    return exec<Omit<AmazonReview, 'asin'>[]>(this._tab.id!, async () => {
      const targetNode = document.querySelector<HTMLDivElement>('.cr-widget-FocalReviews');
      if (!targetNode) {
        return [];
      }
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'end' });
      while (targetNode.getClientRects().length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const xResult = document.evaluate(
        `.//div[contains(@id, 'review-card')]`,
        targetNode,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      );
      const items: Omit<AmazonReview, 'asin'>[] = [];
      for (let i = 0; i < xResult.snapshotLength; i++) {
        const commentNode = xResult.snapshotItem(i) as HTMLDivElement | null;
        if (!commentNode) {
          continue;
        }
        const username = commentNode.querySelector<HTMLDivElement>('.a-profile-name')!.innerText;
        const title = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-title"] > span:not(.a-letter-space)',
        )!.innerText;
        const rating = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-star-rating"]',
        )!.innerText;
        const dateInfo = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-date"]',
        )!.innerText;
        const content = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-body"]',
        )!.innerText;
        items.push({ username, title, rating, dateInfo, content });
      }
      return items;
    });
  }
}
