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
        if (isLoaded()) {
          break;
        }
      }
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
      } as Omit<HomedepotDetailItem, 'OSMID'>;
    });
  }
}
