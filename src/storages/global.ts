import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const site = useWebExtensionStorage<Website>('site', 'amazon', { flush: 'sync' });
