import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const detailInputText = useWebExtensionStorage('lowes-detail-input-text', '');

export const detailItems = useWebExtensionStorage<Map<string, LowesDetailItem>>(
  'lowes-details',
  new Map(),
);

export const allItems = computed({
  get() {
    return Array.from(detailItems.value.values());
  },
  set(newValue) {
    detailItems.value = newValue.reduce((m, c) => {
      m.set(c.link, c);
      return m;
    }, new Map());
  },
});
