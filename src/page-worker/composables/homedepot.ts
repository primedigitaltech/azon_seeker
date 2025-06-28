import { useLongTask } from '~/composables/useLongTask';
import { detailItems as homedepotDetailItems } from '~/storages/homedepot';
import homedepot from '../homedepot';
import { createGlobalState } from '@vueuse/core';

export interface HomedepotWorkerSettings {
  objects?: 'detail'[];
  commitChangeIngerval?: number;
}

function buildHomedepotWorker() {
  const settings = shallowRef<HomedepotWorkerSettings>({});
  const worker = homedepot.getHomedepotWorker();
  const { isRunning, startTask } = useLongTask();

  const detailCache = new Map<string, HomedepotDetailItem>();

  const unsubscribeFuncs = [] as (() => void)[];

  onMounted(() => {
    unsubscribeFuncs.push(
      ...[
        worker.on('error', () => {
          worker.stop();
        }),
        worker.on('detail-item-collected', (ev) => {
          const { item } = ev;
          if (detailCache.has(item.OSMID)) {
            const origin = detailCache.get(item.OSMID);
            detailCache.set(item.OSMID, { ...origin, ...item });
          } else {
            detailCache.set(item.OSMID, item);
          }
        }),
      ],
    );
  });

  onUnmounted(() => {
    unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
    unsubscribeFuncs.splice(0, unsubscribeFuncs.length);
  });

  const commitChange = () => {
    const { objects } = settings.value;
    if (objects?.includes('detail')) {
      const detailItems = toRaw(homedepotDetailItems.value);
      for (const [k, v] of detailCache.entries()) {
        if (detailItems.has(k)) {
          const origin = detailItems.get(k)!;
          detailItems.set(k, { ...origin, ...v });
        } else {
          detailItems.set(k, v);
        }
      }
      homedepotDetailItems.value = detailItems;
      detailCache.clear();
    }
  };

  const taskWrapper = <T extends (...params: any) => any>(func: T) => {
    const { commitChangeIngerval = 10000 } = settings.value;
    return (...params: Parameters<T>) =>
      startTask(async () => {
        const interval = setInterval(() => commitChange(), commitChangeIngerval);
        await func(...params);
        clearInterval(interval);
        commitChange();
      });
  };

  const runDetailPageTask = taskWrapper(worker.runDetailPageTask.bind(worker));

  return {
    settings,
    isRunning,
    runDetailPageTask,
    on: worker.on.bind(worker),
    off: worker.off.bind(worker),
    once: worker.once.bind(worker),
    stop: worker.stop.bind(worker),
  };
}

export const useHomedepotWorker = createGlobalState(buildHomedepotWorker);
