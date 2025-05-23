import { exec } from './execute-script';
import type { Tabs } from 'webextension-polyfill';
import type { AmazonReview, AmazonSearchItem } from './page-worker/types';

class BaseInjector {
  readonly _tab: Tabs.Tab;

  constructor(tab: Tabs.Tab) {
    this._tab = tab;
  }

  run<T>(func: (payload?: any) => Promise<T>, payload?: any): Promise<T> {
    return exec(this._tab.id!, func, payload);
  }
}

export class AmazonSearchPageInjector extends BaseInjector {
  public waitForPageLoaded() {
    return this.run(async () => {
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
    return this.run(async () => {
      return Array.from(
        document.querySelectorAll<HTMLDivElement>(
          '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
        ),
      ).filter((e) => e.getClientRects().length > 0).length > 0
        ? 'pattern-1'
        : 'pattern-2';
    });
  }

  public async getPageData(pattern: 'pattern-1' | 'pattern-2') {
    let data: Pick<AmazonSearchItem, 'link' | 'title' | 'imageSrc' | 'price'>[] | null = null;
    switch (pattern) {
      // 处理商品以列表形式展示的情况
      case 'pattern-1':
        data = await this.run(async () => {
          const items = Array.from(
            document.querySelectorAll<HTMLDivElement>(
              '.puisg-row:has(.a-section.a-spacing-small.a-spacing-top-small:not(.a-text-right))',
            ),
          ).filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<
            Pick<AmazonSearchItem, 'link' | 'title' | 'imageSrc' | 'price'>[]
          >((objs, el) => {
            const link = el.querySelector<HTMLAnchorElement>('a')?.href;
            const title = el
              .querySelector<HTMLHeadingElement>('h2.a-color-base')!
              .getAttribute('aria-label')!;
            const imageSrc = el.querySelector<HTMLImageElement>('img.s-image')!.src!;
            const price =
              el.querySelector<HTMLElement>('.a-price:not(.a-text-price) .a-offscreen')
                ?.innerText ||
              (
                document.evaluate(
                  `.//div[@data-cy="secondary-offer-recipe"]//span[@class='a-color-base' and contains(., '$') and not(*)]`,
                  el,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                ).singleNodeValue as HTMLSpanElement | null
              )?.innerText;
            link && objs.push({ link, title, imageSrc, price });
            return objs;
          }, []);
          return linkObjs;
        });
        break;
      // 处理商品以二维图片格展示的情况
      case 'pattern-2':
        data = await this.run(async () => {
          const items = Array.from(
            document.querySelectorAll<HTMLDivElement>(
              '.puis-card-container:has(.a-section.a-spacing-small.puis-padding-left-small)',
            ) as unknown as HTMLDivElement[],
          ).filter((e) => e.getClientRects().length > 0);
          const linkObjs = items.reduce<
            Pick<AmazonSearchItem, 'link' | 'title' | 'imageSrc' | 'price'>[]
          >((objs, el) => {
            const link = el.querySelector<HTMLAnchorElement>('a.a-link-normal')?.href;
            const title = el.querySelector<HTMLHeadingElement>('h2.a-color-base')!.innerText;
            const imageSrc = el.querySelector<HTMLImageElement>('img.s-image')!.src!;
            const price =
              el.querySelector<HTMLElement>('.a-price:not(.a-text-price) .a-offscreen')
                ?.innerText ||
              (
                document.evaluate(
                  `.//div[@data-cy="secondary-offer-recipe"]//span[@class='a-color-base' and contains(., '$') and not(*)]`,
                  el,
                  null,
                  XPathResult.FIRST_ORDERED_NODE_TYPE,
                ).singleNodeValue as HTMLSpanElement | null
              )?.innerText;
            link && objs.push({ link, title, imageSrc, price });
            return objs;
          }, []);
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
    return this.run(async () => {
      const node = document.querySelector<HTMLDivElement>(
        '.s-pagination-item.s-pagination-selected',
      );
      return node ? Number(node.innerText) : 1;
    });
  }

  public async determineHasNextPage() {
    return this.run(async () => {
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

export class AmazonDetailPageInjector extends BaseInjector {
  public async waitForPageLoaded() {
    return this.run(async () => {
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

  public async getBaseInfo() {
    return this.run(async () => {
      const title = document.querySelector<HTMLElement>('#title')!.innerText;
      const price = document.querySelector<HTMLElement>(
        '.a-price:not(.a-text-price) .a-offscreen',
      )?.innerText;
      return { title, price };
    });
  }

  public async getRatingInfo() {
    return this.run(async () => {
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
    return this.run(async () => {
      const xpathExps = [
        `//div[@id='detailBulletsWrapper_feature_div']//ul[.//li[contains(., 'Best Sellers Rank')]]//span[@class='a-list-item' and contains(., 'Best Sellers Rank')]`,
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
    return this.run(async () => {
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
        urls = Array.from(
          document.querySelectorAll<HTMLDivElement>('#ivThumbs .ivThumbImage[style]'),
        ).map((e) => e.style.background);
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
    return this.run(async () => {
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
      const items: AmazonReview[] = [];
      for (let i = 0; i < xResult.snapshotLength; i++) {
        const commentNode = xResult.snapshotItem(i) as HTMLDivElement | null;
        if (!commentNode) {
          continue;
        }
        const id = commentNode.id.split('-')[0];
        const username = commentNode.querySelector<HTMLDivElement>('.a-profile-name')!.innerText;
        const title = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-title"] > span:not(.a-letter-space)',
        )!.innerText;
        const rating = commentNode.querySelector<HTMLDivElement>(
          '[data-hook*="review-star-rating"]',
        )!.innerText;
        const dateInfo = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-date"]',
        )!.innerText;
        const content = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-body"]',
        )!.innerText;
        items.push({ id, username, title, rating, dateInfo, content });
      }
      return items;
    });
  }
}

export class AmazonReviewPageInjector extends BaseInjector {
  public async waitForPageLoad() {
    return this.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      while (true) {
        const targetNode = document.querySelector(
          '#cm_cr-review_list .reviews-content,ul[role="list"]:not(.histogram)',
        );
        targetNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (
          targetNode &&
          targetNode.getClientRects().length > 0 &&
          document.readyState !== 'loading'
        ) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      while (true) {
        const loadingNode = document.querySelector('.reviews-loading');
        if (loadingNode && loadingNode.getClientRects().length === 0) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
  }

  public async getSinglePageReviews() {
    return this.run(async () => {
      const targetNode = document.querySelector('#cm_cr-review_list');
      if (!targetNode) {
        return [];
      }
      // targetNode.scrollIntoView({ behavior: "smooth", block: "end" })
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const xResult = document.evaluate(
        `.//div[contains(@id, 'review-card')]`,
        targetNode,
        null,
        XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      );
      const items: AmazonReview[] = [];
      for (let i = 0; i < xResult.snapshotLength; i++) {
        console.log('handling', i);

        const commentNode = xResult.snapshotItem(i) as HTMLDivElement;
        if (!commentNode) {
          continue;
        }
        const id = commentNode.id.split('-')[0];
        const username = commentNode.querySelector<HTMLDivElement>('.a-profile-name')!.innerText;
        const title = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-title"] > span:not(.a-letter-space)',
        )!.innerText;
        const rating = commentNode.querySelector<HTMLDivElement>(
          '[data-hook*="review-star-rating"]',
        )!.innerText;
        const dateInfo = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-date"]',
        )!.innerText;
        const content = commentNode.querySelector<HTMLDivElement>(
          '[data-hook="review-body"]',
        )!.innerText;
        items.push({ id, username, title, rating, dateInfo, content });
      }
      return items;
    });
  }

  public jumpToNextPageIfExist() {
    return this.run(async () => {
      const latestReview = document.evaluate(
        `//*[@id='cm_cr-review_list']//li[@data-hook='review'][last()]`,
        document.body,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as HTMLElement | null;
      latestReview?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const nextPageNode = document.querySelector<HTMLDivElement>(
        '[data-hook="pagination-bar"] .a-pagination > *:nth-of-type(2)',
      );
      nextPageNode?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const ret = nextPageNode && !nextPageNode.classList.contains('a-disabled');
      ret && nextPageNode?.querySelector('a')?.click();
      return ret;
    });
  }
}
