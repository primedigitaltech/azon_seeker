import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';
import type { AmazonDetailItem, AmazonItem, AmazonSearchItem } from './page-worker/types';

export const keywordsList = useWebExtensionStorage<string[]>('keywordsList', ['']);

export const asinInputText = useWebExtensionStorage<string>('asinInputText', '');

export const searchItems = useWebExtensionStorage<AmazonSearchItem[]>('itemList', []);

export const detailItems = useWebExtensionStorage<{ [asin: string]: AmazonDetailItem }>(
  'detailItems',
  {},
);

export const allItems = computed({
  get() {
    const sItems = searchItems.value;
    const dItems = detailItems.value;
    return sItems.map<AmazonItem>((si) => {
      const asin = si.asin;
      return asin in dItems
        ? { ...si, ...dItems[asin], hasDetail: true }
        : { ...si, hasDetail: false };
    });
  },
  set(newValue) {
    searchItems.value = newValue.map((row) => {
      const props: (keyof AmazonSearchItem)[] = [
        'keywords',
        'asin',
        'title',
        'imageSrc',
        'link',
        'rank',
        'createTime',
      ];
      const entries: [string, unknown][] = Object.entries(row).filter(([key]) =>
        props.includes(key as keyof AmazonSearchItem),
      );
      return Object.fromEntries(entries) as AmazonSearchItem;
    });
    detailItems.value = newValue
      .filter((row) => row.hasDetail)
      .reduce<Record<string, AmazonDetailItem>>((o, row) => {
        const { asin } = row;
        const props: (keyof AmazonDetailItem)[] = [
          'asin',
          'category1',
          'category2',
          'imageUrls',
          'rating',
          'ratingCount',
        ];
        const entries: [string, unknown][] = Object.entries(row).filter(([key]) =>
          props.includes(key as keyof AmazonDetailItem),
        );
        const item = Object.fromEntries(entries) as AmazonDetailItem;
        o[asin] = item;
        return o;
      }, {});
  },
});
