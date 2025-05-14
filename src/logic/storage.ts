import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';
import type { AmazonDetailItem, AmazonItem, AmazonSearchItem } from './page-worker/types';

export const keywordsList = useWebExtensionStorage<string[]>('keywordsList', ['']);

export const asinInputText = useWebExtensionStorage<string>('asinInputText', '');

export const searchItems = useWebExtensionStorage<AmazonSearchItem[]>('searchItems', []);

export const detailItems = useWebExtensionStorage<AmazonDetailItem[]>('detailItems', []);

export const allItems = computed({
  get() {
    const sItems = searchItems.value;
    const dItems = detailItems.value.reduce<Map<string, AmazonDetailItem>>(
      (m, c) => (m.set(c.asin, c), m),
      new Map(),
    );
    return sItems.map<AmazonItem>((si) => {
      const asin = si.asin;
      const dItem = dItems.get(asin);
      return dItem ? { ...si, ...dItem, hasDetail: true } : { ...si, hasDetail: false };
    });
  },
  set(newValue) {
    const searchItemProps: (keyof AmazonSearchItem)[] = [
      'keywords',
      'asin',
      'title',
      'imageSrc',
      'link',
      'rank',
      'createTime',
    ];
    searchItems.value = newValue.map((row) => {
      const entries: [string, unknown][] = Object.entries(row).filter(([key]) =>
        searchItemProps.includes(key as keyof AmazonSearchItem),
      );
      return Object.fromEntries(entries) as AmazonSearchItem;
    });
    const detailItemsProps: (keyof AmazonDetailItem)[] = [
      'asin',
      'category1',
      'category2',
      'imageUrls',
      'rating',
      'ratingCount',
    ];
    detailItems.value = newValue
      .filter((row) => row.hasDetail)
      .map((row) => {
        const entries: [string, unknown][] = Object.entries(row).filter(([key]) =>
          detailItemsProps.includes(key as keyof AmazonDetailItem),
        );
        return Object.fromEntries(entries) as AmazonSearchItem;
      });
  },
});
