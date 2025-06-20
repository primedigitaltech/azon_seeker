import { Tabs } from 'webextension-polyfill';
import { BaseInjector } from './base';

export class LowesDetailPageInjector extends BaseInjector {
  constructor(tab: Tabs.Tab) {
    super(tab, 60000);
  }

  public waitForPageLoad() {
    return this.run(async () => {
      while (true) {
        if (document.readyState === 'complete') {
          break;
        }
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
      ).singleNodeValue as HTMLDivElement | null;
      const itemSeries = itemNumberEl?.innerText.replace('Item #', '').trim();

      // 获取Model #
      const modelNumberEl = document.evaluate(
        `//p[starts-with(text(), "Model #")]`,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
      ).singleNodeValue as HTMLDivElement | null;
      const modelSeries = modelNumberEl?.innerText.replace('Model #', '').trim();

      // 获取品牌名称
      const brandName = (
        document.evaluate(
          `//h1[contains(@class, "product-brand-description")]/parent::*/parent::*/following-sibling::*[1]//a`,
          document,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
        ).singleNodeValue as HTMLDivElement
      ).innerText;

      // 获取标题
      const title = document.querySelector<HTMLDivElement>(
        `h1.product-brand-description`,
      )?.innerText;

      // 获取价格
      const price = document
        .querySelector<HTMLDivElement>(`.screen-reader`)
        ?.innerText.replaceAll('\n', '');

      // 获取评分
      const rate = document.querySelector<HTMLDivElement>(`.avgrating`)?.innerText;

      // 获取评价数量
      const reviewCount = Number(
        document.querySelector<HTMLDivElement>(`[data-testid="rating-trigger"] > div > div > span`)
          ?.innerText || '0',
      );

      // 获取图片URL
      const mainImageUrl = document.querySelector<HTMLImageElement>(
        `#mfe-gallery .productImage.tile-img`,
      )?.src;

      return {
        brandName,
        title,
        price,
        rate,
        reviewCount,
        mainImageUrl,
        itemSeries,
        modelSeries,
      };
    });
  }
}
