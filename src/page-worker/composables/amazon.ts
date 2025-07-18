import { useLongTask } from '~/composables/useLongTask';
import amazon from '../impls/amazon';
import { uploadImage } from '~/logic/upload-image';
import { detailItems, reviewItems, searchItems } from '~/storages/amazon';
import { createGlobalState } from '@vueuse/core';
import { useAmazonService } from '~/page-worker/services/amazon';
import { LanchTaskBaseOptions, WorkerComposable } from '../interfaces/common';
import { AmazonPageWorker } from '../interfaces/amazon';

/** Settings interface for the Amazon page worker */
export interface AmazonPageWorkerSettings {
  objects?: ('search' | 'detail' | 'review')[];
  commitChangeInterval?: number;
}

/** Main function to build the Amazon page worker composable */
function buildAmazonPageWorker(): WorkerComposable<AmazonPageWorker, AmazonPageWorkerSettings> {
  // Reactive settings object
  const settings = shallowRef<AmazonPageWorkerSettings>({});
  // Long task management
  const { isRunning, startTask } = useLongTask();
  // Amazon service instance
  const service = useAmazonService();

  // Get the worker instance from implementation
  const worker = amazon.getAmazonPageWorker();

  // Caches for different item types
  const searchCache = [] as AmazonSearchItem[];
  const detailCache = new Map<string, AmazonDetailItem>();
  const reviewCache = new Map<string, AmazonReview[]>();

  // Add search items to cache
  const updateSearchCache = (data: AmazonSearchItem[]) => {
    searchCache.push(...data);
  };

  // Update or add detail item in cache
  const updateDetailCache = (data: { asin: string } & Partial<AmazonDetailItem>) => {
    const asin = data.asin;
    if (detailCache.has(data.asin)) {
      const origin = detailCache.get(data.asin);
      detailCache.set(asin, { ...origin, ...data } as AmazonDetailItem);
    } else {
      detailCache.set(asin, data as AmazonDetailItem);
    }
  };

  // Update or add reviews in cache
  const updateReviewCache = (data: { asin: string; reviews: AmazonReview[] }) => {
    const { asin, reviews } = data;
    const values = reviewCache.get(asin) || [];
    const ids = new Set(values.map((item) => item.id));
    for (const review of reviews) {
      ids.has(review.id) || values.push(review);
    }
    reviewCache.set(asin, values);
  };

  // Clear all caches
  const clearAllCaches = () => {
    searchCache.splice(0, searchCache.length);
    detailCache.clear();
    reviewCache.clear();
  };

  // Commit cached changes to storage and service
  const commitChange = async () => {
    const { objects } = settings.value;
    // Commit search items
    if (objects?.includes('search')) {
      searchItems.value = searchItems.value.concat(searchCache);
      await service.commitSearchItems(searchCache);
      searchCache.splice(0, searchCache.length);
    }
    // Commit detail items
    if (objects?.includes('detail')) {
      for (const [k, v] of detailCache.entries()) {
        if (detailItems.value.has(k)) {
          const item = detailItems.value.get(k)!;
          detailItems.value.set(k, { ...item, ...v });
        } else {
          detailItems.value.set(k, v);
        }
      }
      await service.commitDetailItems(detailCache);
      detailCache.clear();
    }
    // Commit reviews
    if (objects?.includes('review')) {
      for (const [asin, reviews] of reviewCache.entries()) {
        if (reviewItems.value.has(asin)) {
          const addIds = new Set(reviews.map((x) => x.id));
          const origin = reviewItems.value.get(asin)!;
          const newReviews = origin.filter((x) => !addIds.has(x.id)).concat(reviews);
          newReviews.sort((a, b) => dayjs(b.dateInfo).diff(dayjs(a.dateInfo)));
          reviewItems.value.set(asin, newReviews);
        } else {
          reviewItems.value.set(asin, reviews);
        }
      }
      await service.commitReviews(reviewCache);
      reviewCache.clear();
    }
  };

  // Store unsubscribe functions for worker events
  const unsubscribes: (() => void)[] = [];

  // Register all relevant worker event handlers
  function registerWorkerEvents() {
    return [
      // Stop worker on error
      worker.on('error', () => {
        worker.stop();
      }),
      // Collect search item links
      worker.on('item-links-collected', ({ objs }) => {
        updateSearchCache(objs);
      }),
      // Collect base info for detail items
      worker.on('item-base-info-collected', (ev) => {
        updateDetailCache(ev);
      }),
      // Collect category rank for detail items
      worker.on('item-category-rank-collected', (ev) => {
        updateDetailCache(ev);
      }),
      // Collect images for detail items
      worker.on('item-images-collected', (ev) => {
        updateDetailCache(ev);
      }),
      // Collect A+ content screenshots and upload
      worker.on('item-aplus-screenshot-collect', async (ev) => {
        const url = await uploadImage(ev.base64data, `${ev.asin}.png`);
        url && updateDetailCache({ asin: ev.asin, aplus: url });
      }),
      // Collect extra info for detail items
      worker.on('item-extra-info-collect', (ev) => {
        updateDetailCache({ asin: ev.asin, ...ev.info });
      }),
      // Collect reviews
      worker.on('item-review-collected', (ev) => {
        updateReviewCache(ev);
      }),
    ];
  }

  // Register event handlers on mount
  onMounted(() => {
    unsubscribes.push(...registerWorkerEvents());
  });

  // Unregister event handlers on unmount
  onUnmounted(() => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    unsubscribes.splice(0, unsubscribes.length);
  });

  /**
   * Task wrapper: commit changes by interval during task execution
   */
  const taskWrapper1 = <T extends (...params: any[]) => Promise<void>>(func: T) => {
    const { commitChangeInterval: commitChangeIngerval = 10000 } = settings.value;
    clearAllCaches();
    return (...params: Parameters<T>) =>
      startTask(async () => {
        const interval = setInterval(() => commitChange(), commitChangeIngerval);
        await func(...params);
        clearInterval(interval);
        await commitChange();
      });
  };

  /**
   * Task wrapper: commit changes at the end of each progress step
   */
  const taskWrapper2 = <T extends (input: any, options?: LanchTaskBaseOptions) => Promise<void>>(
    func: T,
  ) => {
    clearAllCaches();
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

  // Wrapped task runners for each page type
  const runSearchPageTask = taskWrapper1(worker.runSearchPageTask.bind(worker));
  const runDetailPageTask = taskWrapper2(worker.runDetailPageTask.bind(worker));
  const runReviewPageTask = taskWrapper1(worker.runReviewPageTask.bind(worker));

  // Expose API for the composable
  return {
    settings,
    isRunning,
    runSearchPageTask,
    runDetailPageTask,
    runReviewPageTask,
    on: worker.on.bind(worker),
    off: worker.off.bind(worker),
    once: worker.once.bind(worker),
    stop: worker.stop.bind(worker),
  };
}

/** Create a global state composable for the Amazon worker */
export const useAmazonWorker = createGlobalState(buildAmazonPageWorker);
