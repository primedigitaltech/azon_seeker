import { useWebExtensionStorage } from '~/composables/useWebExtensionStorage';
import type { AmazonGoodsLinkItem } from './page-worker/types';

export const keywords = useWebExtensionStorage<string>('keywords', '');

export const itemList = useWebExtensionStorage<AmazonGoodsLinkItem[]>('itemList', []);
