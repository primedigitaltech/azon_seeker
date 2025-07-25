import { createGlobalState } from '@vueuse/core';
import lowes from '../impls/lowes';
import { useLongTask } from '~/composables/useLongTask';
import { detailItems } from '~/storages/lowes';
import { taskOptionBase, WorkerComposable } from '../interfaces/common';
import { LowesWorker } from '../interfaces/lowes';

export interface LowesWorkerSettings {
  objects?: 'detail'[];
  commitChangeIngerval?: number;
}

function buildLowesWorkerComposable(): WorkerComposable<LowesWorker, LowesWorkerSettings> {
  const settings = shallowRef<LowesWorkerSettings>({});
  const worker = lowes.getLowesWorker();
  const { isRunning, startTask } = useLongTask();

  const detailCache = new Map<string, LowesDetailItem>();

  function registerWorkerEvent() {
    const unsubscribes = [
      worker.on('error', () => worker.stop()),
      worker.on('detail-item-collected', (ev) => {
        const { item } = ev;
        if (detailCache.has(item.link)) {
          const origin = detailCache.get(item.link);
          detailCache.set(item.link, { ...origin, ...item });
        } else {
          detailCache.set(item.link, item);
        }
      }),
    ];
    return () => unsubscribes.forEach((unsbuscribe) => unsbuscribe());
  }

  const unsbuscribe = registerWorkerEvent();

  onUnmounted(() => {
    unsbuscribe();
  });

  const commitChange = async () => {
    const { objects } = settings.value;
    if (objects?.includes('detail')) {
      for (const [k, v] of detailCache.entries()) {
        if (detailItems.value.has(k)) {
          const origin = detailItems.value.get(k)!;
          detailItems.value.set(k, { ...origin, ...v });
        } else {
          detailItems.value.set(k, v);
        }
      }
      detailCache.clear();
    }
  };

  const taskWrapper2 = <T extends (input: any, options?: taskOptionBase) => Promise<void>>(
    func: T,
  ) => {
    return (...params: Parameters<T>) =>
      startTask(async () => {
        if (!params?.[1]) {
          params[1] = {};
        }
        const progressReporter = params[1].progress;
        if (progressReporter) {
          params[1].progress = async (...p: Parameters<typeof progressReporter>) => {
            await commitChange();
            return progressReporter(...p);
          };
        } else {
          params[1].progress = async () => {
            await commitChange();
          };
        }
        await func(params[0], params[1]);
        await commitChange();
      });
  };

  const runDetailPageTask = taskWrapper2(worker.runDetailPageTask.bind(worker));

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

export const useLowesWorker = createGlobalState(buildLowesWorkerComposable);
