import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const detailItems = useWebExtensionStorage<Map<string, LowesDetailItem>>(
  'lowes-details',
  new Map(),
);
