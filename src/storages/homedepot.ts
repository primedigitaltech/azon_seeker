import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const detailInputText = useWebExtensionStorage('homedepot-detail-input-text', '');

export const detailWorkerSettings = useWebExtensionStorage('homedepot-detail-worker-settings', {
  review: false,
});

export const detailItems = useWebExtensionStorage<Map<string, HomedepotDetailItem>>(
  'homedepot-details',
  new Map(),
);

export const reviewItems = useWebExtensionStorage<Map<string, HomedepotReview[]>>(
  'homedepot-reviews',
  new Map(),
);

export const allItems = computed({
  get() {
    return Array.from(detailItems.value.values());
  },
  set(newValue) {
    detailItems.value = newValue.reduce((m, c) => {
      m.set(c.OSMID, c);
      return m;
    }, new Map());
  },
});

export const allReviews = computed({
  get() {
    const reviewItemMap = toRaw(reviewItems.value);
    return Array.from(
      reviewItemMap
        .entries()
        .map(([OSMID, reviews]) =>
          reviews.map<{ OSMID: string } & HomedepotReview>((r) => ({ ...r, OSMID })),
        ),
    ).flat();
  },
  set(newVal) {
    reviewItems.value = newVal.reduce<typeof reviewItems.value>((m, c) => {
      const { OSMID, ...review } = c;
      const reveiws = m.get(OSMID) || [];
      reveiws.push(review);
      m.set(OSMID, reveiws);
      return m;
    }, new Map());
  },
});
