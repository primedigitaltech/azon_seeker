import { useLongTask } from '~/composables/useLongTask';
import { detailItems, reviewItems } from '~/storages/homedepot';
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
  const reviewCache = new Map<string, HomedepotReview[]>();

  function registerWorkerEvents() {
    const unsubscribes = [
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
      worker.on('review-collected', (ev) => {
        const { OSMID, reviews } = ev;
        reviewCache.set(OSMID, (reviewCache.get(OSMID) || []).concat(reviews));
      }),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }

  const unsubscribe = registerWorkerEvents();

  onUnmounted(() => {
    unsubscribe();
  });

  const commitChange = () => {
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
      for (const [k, v] of reviewCache.entries()) {
        if (reviewItems.value.has(k)) {
          const uid = (x: HomedepotReview) => `${x.username}-${x.title}`;
          const addedUids = new Set(v.map(uid));
          const origin = reviewItems.value.get(k)!;
          const newReviews = origin.filter((x) => !addedUids.has(uid(x))).concat(v);
          newReviews.sort((a, b) => dayjs(b.dateInfo).diff(dayjs(a.dateInfo)));
          reviewItems.value.set(k, newReviews);
        } else {
          reviewItems.value.set(k, v);
        }
      }
      reviewCache.clear();
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
