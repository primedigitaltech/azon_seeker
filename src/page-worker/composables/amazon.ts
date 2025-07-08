import { useLongTask } from '~/composables/useLongTask';
import amazon from '../impls/amazon';
import { uploadImage } from '~/logic/upload';
import { detailItems, reviewItems, searchItems } from '~/storages/amazon';
import { createGlobalState } from '@vueuse/core';
import { useAmazonService } from '~/services/amazon';
import { LanchTaskBaseOptions } from '../types';

export interface AmazonPageWorkerSettings {
  objects?: ('search' | 'detail' | 'review')[];
  commitChangeIngerval?: number;
}

function buildAmazonPageWorker() {
  const settings = shallowRef<AmazonPageWorkerSettings>({});
  const { isRunning, startTask } = useLongTask();
  const service = useAmazonService();

  const worker = amazon.getAmazonPageWorker();

  const searchCache = [] as AmazonSearchItem[];
  const detailCache = new Map<string, AmazonDetailItem>();
  const reviewCache = new Map<string, AmazonReview[]>();

  const updateSearchCache = (data: AmazonSearchItem[]) => {
    searchCache.push(...data);
  };

  const updateDetailCache = (data: { asin: string } & Partial<AmazonDetailItem>) => {
    const asin = data.asin;
    if (detailCache.has(data.asin)) {
      const origin = detailCache.get(data.asin);
      detailCache.set(asin, { ...origin, ...data } as AmazonDetailItem);
    } else {
      detailCache.set(asin, data as AmazonDetailItem);
    }
  };

  const updateReviews = (data: { asin: string; reviews: AmazonReview[] }) => {
    const { asin, reviews } = data;
    const values = reviewCache.get(asin) || [];
    const ids = new Set(values.map((item) => item.id));
    for (const review of reviews) {
      ids.has(review.id) || values.push(review);
    }
    reviewCache.set(asin, values);
  };

  const commitChange = async () => {
    const { objects } = settings.value;
    if (objects?.includes('search')) {
      searchItems.value = searchItems.value.concat(searchCache);
      await service.commitSearchItems(searchCache);
      searchCache.splice(0, searchCache.length);
    }
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

  const unsubscribeFuncs = [] as (() => void)[];

  onMounted(() => {
    unsubscribeFuncs.push(
      ...[
        worker.on('error', () => {
          worker.stop();
        }),
        worker.on('item-links-collected', ({ objs }) => {
          updateSearchCache(objs);
        }),
        worker.on('item-base-info-collected', (ev) => {
          updateDetailCache(ev);
        }),
        worker.on('item-category-rank-collected', (ev) => {
          updateDetailCache(ev);
        }),
        worker.on('item-images-collected', (ev) => {
          updateDetailCache(ev);
        }),
        // worker.on('item-top-reviews-collected', (ev) => {
        //   updateDetailCache(ev);
        // }),
        worker.on('item-aplus-screenshot-collect', async (ev) => {
          const url = await uploadImage(ev.base64data, `${ev.asin}.png`);
          url && updateDetailCache({ asin: ev.asin, aplus: url });
        }),
        worker.on('item-review-collected', (ev) => {
          updateReviews(ev);
        }),
      ],
    );
  });

  onUnmounted(() => {
    unsubscribeFuncs.forEach((unsubscribe) => unsubscribe());
    unsubscribeFuncs.splice(0, unsubscribeFuncs.length);
  });

  /**Commit change by interval time */
  const taskWrapper1 = <T extends (...params: any[]) => Promise<void>>(func: T) => {
    const { commitChangeIngerval = 10000 } = settings.value;
    searchCache.splice(0, searchCache.length);
    detailCache.clear();
    reviewCache.clear();
    return (...params: Parameters<T>) =>
      startTask(async () => {
        const interval = setInterval(() => commitChange(), commitChangeIngerval);
        await func(...params);
        clearInterval(interval);
        await commitChange();
      });
  };

  /**Commit changes in the end of task unit */
  const taskWrapper2 = <T extends (input: any, options?: LanchTaskBaseOptions) => Promise<void>>(
    func: T,
  ) => {
    searchCache.splice(0, searchCache.length);
    detailCache.clear();
    reviewCache.clear();
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

  const runSearchPageTask = taskWrapper1(worker.runSearchPageTask.bind(worker));
  const runDetailPageTask = taskWrapper2(worker.runDetailPageTask.bind(worker));
  const runReviewPageTask = taskWrapper1(worker.runReviewPageTask.bind(worker));

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

export const useAmazonWorker = createGlobalState(buildAmazonPageWorker);
