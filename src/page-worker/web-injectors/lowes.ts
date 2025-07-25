import { Tabs } from 'webextension-polyfill';
import { BaseInjector } from './base';

export class LowesDetailPageInjector extends BaseInjector {
  constructor(tab: Tabs.Tab) {
    super(tab, { timeout: 60000 });
  }

  public waitForPageLoad() {
    return this.run(async () => {
      while (true) {
        if (document.readyState === 'complete') {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    });
  }

  public getBaseInfo() {
    return this.run(async () => {
      // 获取Item #
      const itemNumberEl = document.evaluate(
        `//p[starts-with(text(), "Item #")]`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as HTMLElement | null;
      const itemSeries = itemNumberEl?.innerText.replace('Item #', '').replace('|', '').trim();

      // 获取Model #
      const modelNumberEl = document.evaluate(
        `//p[starts-with(text(), "Model #")]`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as HTMLElement | null;
      const modelSeries = modelNumberEl?.innerText.replace('Model #', '').trim();

      // 获取品牌名称
      const brandName = document.querySelector<HTMLElement>(
        '[data-component-name="RatingsNLinks"] a .label',
      )?.innerText;

      // 销量信息
      const boughtInfo = document.querySelector<HTMLElement>(
        '[data-component-name="ExclusiveBadge"]',
      )?.innerText;

      // 获取标题
      const title = document.querySelector<HTMLElement>(`h1.product-brand-description`)!.innerText;

      // 获取价格
      const price = document
        .querySelector<HTMLElement>(`.screen-reader`)!
        .innerText.replaceAll('\n', '');

      // 获取评分
      const rate = document.querySelector<HTMLElement>(`.avgrating`)?.innerText;

      // 获取评价数量
      const reviewCount = Number(
        document.querySelector<HTMLElement>(`[data-testid="rating-trigger"] > div > div > span`)
          ?.innerText || '0',
      );

      // 获取图片URL
      const mainImageUrl = document.querySelector<HTMLImageElement>(
        `#mfe-gallery .productImage.tile-img`,
      )!.src;

      return {
        brandName,
        title,
        price,
        rate,
        reviewCount,
        mainImageUrl,
        boughtInfo,
        itemSeries,
        modelSeries,
      };
    });
  }
}
