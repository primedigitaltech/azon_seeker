import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const keywordsList = useWebExtensionStorage<string[]>('keywordsList', ['']);

export const detailAsinInput = useWebExtensionStorage<string>('detailAsinInputText', '');

export const reviewAsinInput = useWebExtensionStorage<string>('reviewAsinInputText', '');

export const itemColumnSettings = useWebExtensionStorage<
  Set<keyof Pick<AmazonItem, 'keywords' | 'page' | 'rank' | 'createTime' | 'timestamp'>>
>('itemColumnSettings', new Set(['keywords', 'page', 'rank', 'createTime']));

export const searchItems = useWebExtensionStorage<AmazonSearchItem[]>('searchItems', []);

export const detailWorkerSettings = useWebExtensionStorage<{ aplus: boolean }>(
  'amazon-detail-worker-settings',
  { aplus: false },
);

export const detailItems = useWebExtensionStorage<Map<string, AmazonDetailItem>>(
  'detailItems',
  new Map(),
  {
    listenToStorageChanges: 'options',
  },
);

export const reviewItems = useWebExtensionStorage<Map<string, AmazonReview[]>>(
  'reviewItems',
  new Map(),
  {
    listenToStorageChanges: 'options',
  },
);

export const allReviews = computed({
  get() {
    const reviews: ({ asin: string } & AmazonReview)[] = [];
    for (const [asin, values] of reviewItems.value) {
      for (const review of values) {
        reviews.push({ asin, ...review });
      }
    }
    return reviews;
  },
  set(newVal) {
    const reviews = newVal.reduce<Map<string, AmazonReview[]>>((m, r) => {
      if (!m.has(r.asin)) {
        m.set(r.asin, []);
      }
      const reviews = m.get(r.asin)!;
      reviews.push(r);
      return m;
    }, new Map());
    for (const [_, values] of reviews) {
      values.sort((a, b) => dayjs(b.dateInfo).diff(a.dateInfo));
    }
    reviewItems.value = reviews;
  },
});

export const allItems = computed({
  get() {
    const sItems = unref(searchItems);
    const sItemSet = new Set(sItems.map((si) => si.asin));
    const dItems = unref(detailItems);
    return sItems
      .map<AmazonItem>((si) => {
        const asin = si.asin;
        const dItem = dItems.get(asin);
        return dItems.has(asin)
          ? { ...si, ...dItem, hasDetail: true }
          : { ...si, hasDetail: false };
      })
      .concat(
        Array.from(dItems.values())
          .filter((di) => !sItemSet.has(di.asin))
          .map((di) => ({ ...di, link: `https://www.amazon.com/dp/${di.asin}`, hasDetail: true })),
      );
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
    searchItems.value = newValue
      .filter((row) => row.keywords)
      .map((row) => {
        const entries: [string, unknown][] = Object.entries(row).filter(([key]) =>
          searchItemProps.includes(key as keyof AmazonSearchItem),
        );
        return Object.fromEntries(entries) as AmazonSearchItem;
      });
    const detailItemsProps: (keyof AmazonDetailItem)[] = [
      'asin',
      'title',
      'timestamp',
      'price',
      'category1',
      'category2',
      'imageUrls',
      'rating',
      'ratingCount',
      'topReviews',
      'aplus',
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
