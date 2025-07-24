import { Tabs } from 'webextension-polyfill';
import { BaseInjector } from './base';

export class HomedepotDetailPageInjector extends BaseInjector {
  constructor(tab: Tabs.Tab) {
    super(tab, { timeout: 60000 });
  }

  public waitForPageLoad() {
    return this.run(async () => {
      let timeout = false;
      setTimeout(() => (timeout = true), 15000);
      const isLoaded = () => {
        const reviewSuffix = document.evaluate(
          `//*[@id='product-section-rr']//p/text()[starts-with(., ' out of 5')]`,
          document,
          null,
          XPathResult.STRING_TYPE,
        );
        const writeFirstReviewButton = document.evaluate(
          `//section[@id='product-section-ratings-reviews']//span[starts-with(text(), 'Write the First Review')]`,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
        );
        return (
          (!!writeFirstReviewButton.singleNodeValue || !!reviewSuffix.stringValue) &&
          (document.readyState == 'complete' || timeout)
        );
      };
      const needToSkip = () => {
        return !!document.evaluate(
          `//p[text() = 'The product you are trying to view is not currently available.']`,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
        ).singleNodeValue;
      };
      while (true) {
        await new Promise((resolve) => setTimeout(resolve, 500 + ~~(Math.random() * 500)));
        document
          .querySelector<HTMLElement>(
            `#product-section-rr div[role='button'][aria-expanded='false'], #product-section-overview div[role='button'][aria-expanded='false']`,
          )
          ?.click();
        const { scrollHeight, scrollTop } = document.documentElement;
        scrollHeight - scrollTop > 100
          ? window.scrollBy({ top: 100, behavior: 'smooth' })
          : document
              .querySelector('[data-component^="product-details:ProductDetailsTitle"]')
              ?.scrollIntoView({ behavior: 'smooth' });
        if (needToSkip()) {
          return false;
        }
        if (isLoaded()) {
          break;
        }
      }
      return true;
    });
  }

  public getInfo() {
    return this.run(async () => {
      const link = document.location.toString();
      const brandName = document.querySelector<HTMLDivElement>(
        `[data-component^="product-details:ProductDetailsBrandCollection"]`,
      )?.innerText;
      const title = document.querySelector<HTMLDivElement>(
        `[data-component^="product-details:ProductDetailsTitle"]`,
      )!.innerText;
      const price = document
        .querySelector<HTMLDivElement>(`#standard-price`)!
        .innerText.replaceAll('\n', '');
      const rateEl = document.querySelector<HTMLDivElement>(
        `[data-component^="ratings-and-reviews"] .sui-mr-1`,
      );
      const rate = rateEl ? /\d(\.\d)?/.exec(rateEl.innerText)![0] : undefined;
      const reviewCount = rateEl
        ? Number(
            /\d+/.exec(
              document.querySelector<HTMLDivElement>(
                `[data-component^="ratings-and-reviews"] [name="simple-rating"] + span`,
              )!.innerText,
            )![0],
          )
        : undefined;
      const mainImageUrl = document.querySelector<HTMLImageElement>(
        `.mediagallery__mainimage img`,
      )!.src;
      const modelInfoEl = document.evaluate(
        `//*[@id="product-section-product-overview"]//*[@class="product-info-bar"]//*[starts-with(text(), "Model #")]`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as HTMLDivElement | null;
      const [modelInfo] = /(?<=#\s).+/.exec(modelInfoEl?.innerText || '') || [];
      return {
        link,
        brandName,
        title,
        price,
        rate,
        reviewCount,
        mainImageUrl,
        modelInfo,
      } as Omit<HomedepotDetailItem, 'OSMID' | 'imageUrls' | 'timestamp'>;
    });
  }

  public getImageUrls() {
    return this.run(async () => {
      const text = document.querySelector<HTMLElement>(
        'script#thd-helmet__script--productStructureData',
      )!.innerText;
      const obj = JSON.parse(text);
      return (obj['image'] as string[]).map((url) => url.slice(1, -1));
    });
  }

  public waitForReviewLoad() {
    return this.run(async () => {
      while (true) {
        const el = document.querySelector('.review_item');
        document
          .querySelector("#product-section-rr div[role='button']")
          ?.scrollIntoView({ behavior: 'smooth' });
        document.querySelector<HTMLElement>('li:not(.sui-border-accent) .navlink-rr')?.click();
        if (el && el.getClientRects().length > 0 && el.getClientRects()[0].height > 0) {
          el?.scrollIntoView({ behavior: 'smooth' });
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      return true;
    });
  }

  public getReviews() {
    return this.run(async () => {
      const elements = document.querySelectorAll('.review_item');
      return Array.from(elements).map((root) => {
        const title = root.querySelector<HTMLElement>('.review-content__title')!.innerText;
        const content = root.querySelector<HTMLElement>('.review-content-body')!.innerText;
        const username = root.querySelector<HTMLElement>(
          '.review-content__no-padding > button',
        )!.innerText;
        const dateInfo = root.querySelector<HTMLElement>('.review-content__date')!.innerText;
        const rating = root
          .querySelector<HTMLElement>('[name="simple-rating"]')!
          .getAttribute('aria-label')!;
        const badges = Array.from(
          root.querySelectorAll<HTMLElement>('.review-status-icons__list, li.review-badge > *'),
        )
          .map((el) => el.innerText.trim())
          .filter((t) => !["(What's this?)"].includes(t))
          .filter((t) => t.length !== 0);
        const imageUrls = Array.from(
          root.querySelectorAll<HTMLElement>('.media-carousel__media > button'),
        ).map((el) => el.style.backgroundImage.split(/[\(\)]/, 3)[1]);
        return { title, content, username, dateInfo, rating, badges, imageUrls } as HomedepotReview;
      });
    });
  }

  public tryJumpToNextPage() {
    return this.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const final = document.querySelector<HTMLElement>(
        '.pager__summary--bold:nth-last-of-type(2)',
      )!.innerText;
      const anchor = document.querySelector<HTMLElement>(
        '.pager__summary--bold + .pager__summary--bold',
      )!.innerText;
      if (final === anchor) {
        return false;
      }
      const button = document.querySelector<HTMLElement>('[data-testid="pagination-Next"]');
      button!.click();
      while (true) {
        const newAnchor = document.querySelector<HTMLElement>(
          '.pager__summary--bold + .pager__summary--bold',
        )!.innerText;
        if (newAnchor !== anchor) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      return true;
    });
  }
}
