import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';

export const site = useWebExtensionStorage<'amazon' | 'homedepot'>('site', 'amazon');
