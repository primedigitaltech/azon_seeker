import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const keywords = useWebExtensionStorage<string>('keywords', '');