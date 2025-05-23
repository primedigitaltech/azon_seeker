import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';
import type { AmazonDetailItem, AmazonItem, AmazonSearchItem } from './page-worker/types';

export const keywordsList = useWebExtensionStorage<string[]>('keywordsList', ['']);

export const asinInputText = useWebExtensionStorage<string>('asinInputText', '');

export const searchItems = useWebExtensionStorage<AmazonSearchItem[]>('searchItems', []);

export const detailItems = useWebExtensionStorage<Map<string, AmazonDetailItem>>(
  'detailItems',
  new Map(),
  {
    listenToStorageChanges: false,
  },
);

export const allItems = computed({
  get() {
    const sItems = searchItems.value;
    const dItems = detailItems.value;
    return sItems.map<AmazonItem>((si) => {
      const asin = si.asin;
      const dItem = dItems.get(asin);
      return dItems.has(asin) ? { ...si, ...dItem, hasDetail: true } : { ...si, hasDetail: false };
    });
  },
  set(newValue) {
    const searchItemProps: (keyof AmazonSearchItem)[] = [
      'keywords',
      'asin',
      'page',
      'title',
      'imageSrc',
      'price',
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
      'topReviews',
    ];
    detailItems.value = newValue
      .filter((row) => row.hasDetail)
      .reduce<Map<string, AmazonDetailItem>>((m, row) => {
        const entries = Object.entries(row).filter(([key]) =>
          detailItemsProps.includes(key as keyof AmazonDetailItem),
        );
        const obj = Object.fromEntries(entries) as AmazonDetailItem;
        m.set(obj.asin, obj);
        return m;
      }, new Map());
  },
});
