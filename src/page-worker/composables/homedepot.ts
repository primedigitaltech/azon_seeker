import { useLongTask } from '~/composables/useLongTask';
import { detailItems as homedepotDetailItems } from '~/storages/homedepot';
import homedepot from '../impls/homedepot';
import { createGlobalState } from '@vueuse/core';
import { WorkerComposable } from '../interfaces/common';
import { HomedepotWorker } from '../interfaces/homedepot';

export interface HomedepotWorkerSettings {
  objects?: 'detail'[];
  commitChangeIngerval?: number;
}

function buildHomedepotWorker(): WorkerComposable<HomedepotWorker, HomedepotWorkerSettings> {
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
      for (const [k, v] of detailCache.entries()) {
        if (homedepotDetailItems.value.has(k)) {
          const origin = homedepotDetailItems.value.get(k)!;
          homedepotDetailItems.value.set(k, { ...origin, ...v });
        } else {
          homedepotDetailItems.value.set(k, v);
        }
      }
      detailCache.clear();
    }
  };

  const taskWrapper1 = <T extends (...params: any) => any>(func: T) => {
    const { commitChangeIngerval = 10000 } = settings.value;
    return (...params: Parameters<T>) =>
      startTask(async () => {
        const interval = setInterval(() => commitChange(), commitChangeIngerval);
        await func(...params);
        clearInterval(interval);
        commitChange();
      });
  };

  const runDetailPageTask = taskWrapper1(worker.runDetailPageTask.bind(worker));

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
