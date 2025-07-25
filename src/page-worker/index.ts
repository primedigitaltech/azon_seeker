import { AmazonPageWorkerSettings, useAmazonWorker } from './composables/amazon';
import { HomedepotWorkerSettings, useHomedepotWorker } from './composables/homedepot';
import { LowesWorkerSettings, useLowesWorker } from './composables/lowes';

export function usePageWorker(
  type: 'amazon',
  settings?: AmazonPageWorkerSettings,
): ReturnType<typeof useAmazonWorker>;
export function usePageWorker(
  type: 'homedepot',
  settings?: HomedepotWorkerSettings,
): ReturnType<typeof useHomedepotWorker>;
export function usePageWorker(
  type: 'homedepot',
  settings?: LowesWorkerSettings,
): ReturnType<typeof useLowesWorker>;
export function usePageWorker(type: Website, settings: any) {
  let worker = null;
  switch (type) {
    case 'amazon':
      worker = useAmazonWorker();
      break;
    case 'homedepot':
      worker = useHomedepotWorker();
      break;
    case 'lowes':
      worker = useLowesWorker();
      break;
    default:
      throw new Error(`Unsupported page worker type: ${type}`);
  }
  if (!!settings && !!worker.settings) {
    worker.settings.value = settings;
  }
  return worker;
}
