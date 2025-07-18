import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const detailInputText = useWebExtensionStorage('homedepot-detail-input-text', '');

export const detailWorkerSettings = useWebExtensionStorage('homedepot-detail-worker-settings', {
  review: false,
});

export const detailItems = useWebExtensionStorage<Map<string, HomedepotDetailItem>>(
  'homedepot-details',
  new Map(),
  {
    listenToStorageChanges: 'options',
  },
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
