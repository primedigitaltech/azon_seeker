import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const keywordsList = useWebExtensionStorage<string[]>('keywordsList', ['']);

export const detailAsinInput = useWebExtensionStorage<string>('detailAsinInputText', '');

export const reviewAsinInput = useWebExtensionStorage<string>('reviewAsinInputText', '');

export const itemColumnSettings = useWebExtensionStorage<
  Set<keyof Pick<AmazonItem, 'keywords' | 'page' | 'rank' | 'createTime' | 'timestamp'>>
>('itemColumnSettings', new Set(['keywords', 'page', 'rank', 'createTime']));

export const detailWorkerSettings = useWebExtensionStorage<{ aplus: boolean }>(
  'amazon-detail-worker-settings',
  { aplus: false },
);

export const reviewWorkerSettings = useWebExtensionStorage<{ recent: boolean }>(
  'amazon-review-worker-settings',
  { recent: true },
);

export const searchItems = useWebExtensionStorage<AmazonSearchItem[]>('searchItems', []);

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

export const allItems = computed<AmazonItem[]>({
  get() {
    const sItems = toRaw(searchItems.value);
    const dItems = toRaw(detailItems.value);
    const sItemSet = new Set(sItems.map((si) => si.asin));
    const baseAllItems = sItems.map<AmazonItem>((si) => {
      const asin = si.asin;
      const dItem = dItems.get(asin);
      return dItems.has(asin) ? { ...si, ...dItem, hasDetail: true } : { ...si, hasDetail: false };
    });
    const additionalItems = Array.from(dItems.values())
      .filter((di) => !sItemSet.has(di.asin))
      .map((di) => ({ ...di, link: `https://www.amazon.com/dp/${di.asin}`, hasDetail: true }));
    return baseAllItems.concat(additionalItems);
  },
  set(newValue) {
    const searchItemKeys: (keyof AmazonSearchItem)[] = [
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
          searchItemKeys.includes(key as keyof AmazonSearchItem),
        );
        return Object.fromEntries(entries) as AmazonSearchItem;
      });
    const detailItemExcludedKeys = [
      'hasDetail',
      ...searchItemKeys.filter((k) => !['price', 'title', 'asin'].includes(k)),
    ];
    detailItems.value = newValue
      .filter((row) => row.hasDetail)
      .reduce<Map<string, AmazonDetailItem>>((m, row) => {
        const entries = Object.entries(row).filter(
          ([key]) => !detailItemExcludedKeys.includes(key),
        );
        const obj = Object.fromEntries(entries) as AmazonDetailItem;
        m.set(obj.asin, obj);
        return m;
      }, new Map());
  },
});

export const allDetailItems = computed<AmazonItem[]>(() => {
  const sItems = toRaw(searchItems.value)
    .toSorted((a, b) => dayjs(b.createTime).diff(dayjs(a.createTime)))
    .reduce((m, r) => {
      m.has(r.asin) || m.set(r.asin, r);
      return m;
    }, new Map<string, AmazonSearchItem>());
  return Array.from(
    toRaw(detailItems.value)
      .values()
      .map((di) => {
        if (sItems.has(di.asin)) {
          return { ...sItems.get(di.asin)!, ...di, hasDetail: true };
        } else {
          return { ...di, hasDetail: true };
        }
      }),
  );
});

export const allReviews = computed<({ asin: string } & AmazonReview)[]>({
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
