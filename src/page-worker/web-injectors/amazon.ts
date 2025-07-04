import { BaseInjector } from './base';

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
              '.puis-card-container',
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
    data = data && data.filter((r) => new URL(r.link).pathname.includes('/dp/')); // No advertisement only
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
          '#prodDetails:has(td), #detailBulletsWrapper_feature_div:has(li), .av-page-desktop, #productDescription_feature_div',
        );
        const exceptionalNodeSelectors = ['.music-detail-header', '.avu-retail-page'];
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
        '.aok-offscreen, .a-price:not(.a-text-price) .a-offscreen',
      )?.innerText;
      const broughtInfo = document.querySelector<HTMLElement>(
        `#social-proofing-faceout-title-tk_bought`,
      )?.innerText;
      return { title, price, broughtInfo };
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
      const overlay = document.querySelector<HTMLDivElement>('.overlayRestOfImages');
      if (overlay) {
        if (document.querySelector<HTMLDivElement>('#ivThumbs')!.getClientRects().length === 0) {
          overlay.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      let script = document.evaluate(
        `//script[starts-with(text(), "\nP.when(\'A\').register") or contains(text(), "\nP.when('A').register")]`,
        document,
        null,
        XPathResult.STRING_TYPE,
      ).stringValue;
      const extractUrls = (pattern: RegExp) =>
        Array.from(script.matchAll(pattern)).map((e) => e[0]);
      let urls = extractUrls(
        /(?<="hiRes":")https:\/\/m.media-amazon.com\/images\/I\/[\w\d\.\-+]+(?=")/g,
      );
      if (urls.length === 0) {
        urls = extractUrls(
          /(?<="large":")https:\/\/m.media-amazon.com\/images\/I\/[\w\d\.\-+]+(?=")/g,
        );
      }
      document.querySelector<HTMLElement>('header > [data-action="a-popover-close"]')?.click();
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
        const imageSrc = Array.from(
          commentNode.querySelectorAll<HTMLImageElement>(
            '.review-image-tile-section img[src] img[src]',
          ),
        ).map((e) => {
          const url = new URL(e.getAttribute('src')!);
          const paths = url.pathname.split('/');
          const chunks = paths[paths.length - 1].split('.');
          paths[paths.length - 1] = `${chunks[0]}.${chunks[chunks.length - 1]}`;
          url.pathname = paths.join('/');
          return url.toString();
        });
        items.push({ id, username, title, rating, dateInfo, content, imageSrc });
      }
      return items;
    });
  }

  public async scanAPlus() {
    return this.run(async () => {
      const aplusEl = document.querySelector<HTMLElement>('#aplus_feature_div');
      if (
        !aplusEl ||
        aplusEl.getClientRects().length === 0 ||
        aplusEl.getClientRects()[0].height === 0
      ) {
        return false;
      }
      while (aplusEl.getClientRects().length === 0) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      aplusEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      while (true) {
        const rect = aplusEl.getClientRects()[0];
        if (rect.top + rect.height < 100) {
          break;
        }
        window.scrollBy({ top: 100, behavior: 'smooth' });
        await new Promise((resolve) => setTimeout(resolve, 100 + ~~(100 * Math.random())));
      }
      return true;
    });
  }

  public async captureAPlus() {
    return this.screenshot({ type: 'CSS', selector: '#aplus_feature_div' });
  }
}

export class AmazonReviewPageInjector extends BaseInjector {
  public async waitForPageLoad() {
    return this.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      while (true) {
        const targetNode = document.querySelector(
          '.reviews-content, #cm_cr-review_list ul[role="list"]:not(.histogram)',
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
        const imageSrc = Array.from(
          commentNode.querySelectorAll<HTMLImageElement>('.review-image-tile-section img[src]'),
        ).map((e) => {
          const url = new URL(e.getAttribute('src')!);
          const paths = url.pathname.split('/');
          const chunks = paths[paths.length - 1].split('.');
          paths[paths.length - 1] = `${chunks[0]}.${chunks[chunks.length - 1]}`;
          url.pathname = paths.join('/');
          return url.toString();
        });
        items.push({ id, username, title, rating, dateInfo, content, imageSrc });
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

  public async showStarsDropDownMenu() {
    return this.run(async () => {
      while (true) {
        const dropdown = document.querySelector<HTMLDivElement>('#star-count-dropdown')!;
        dropdown.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dropdown.click();
        if (dropdown.getAttribute('aria-expanded') === 'true') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    });
  }

  public async selectStar(star: number) {
    return this.run(
      async ({ star }) => {
        const starNode = document.evaluate(
          `//ul[@role='listbox']/li/a[text()="${star} star only"]`,
          document.body,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
        ).singleNodeValue as HTMLElement;
        starNode.click();
        await new Promise((resolve) => setTimeout(resolve, 100));
      },
      { star },
    );
  }
}
