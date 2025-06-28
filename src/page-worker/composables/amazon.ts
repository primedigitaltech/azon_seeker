import { useLongTask } from '~/composables/useLongTask';
import amazon from '../amazon';
import { uploadImage } from '~/logic/upload';
import {
  detailItems as amazonDetailItems,
  reviewItems as amazonReviewItems,
  searchItems as amazonSearchItems,
} from '~/storages/amazon';
import { createGlobalState } from '@vueuse/core';

export interface AmazonPageWorkerSettings {
  objects?: ('search' | 'detail' | 'review')[];
  commitChangeIngerval?: number;
}

function buildAmazonPageWorker() {
  const settings = shallowRef<AmazonPageWorkerSettings>({});
  const { isRunning, startTask } = useLongTask();

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
        worker.on('item-top-reviews-collected', (ev) => {
          updateDetailCache(ev);
        }),
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

  const commitChange = () => {
    const { objects } = settings.value;
    if (objects?.includes('search')) {
      amazonSearchItems.value = amazonSearchItems.value.concat(searchCache);
      searchCache.splice(0, searchCache.length);
    }
    if (objects?.includes('detail')) {
      const detailItems = toRaw(amazonDetailItems.value);
      for (const [k, v] of detailCache.entries()) {
        if (detailItems.has(k)) {
          const item = detailItems.get(k)!;
          detailItems.set(k, { ...item, ...v });
        } else {
          detailItems.set(k, v);
        }
      }
      amazonDetailItems.value = detailItems;
      detailCache.clear();
    }
    if (objects?.includes('review')) {
      const reviewItems = toRaw(amazonReviewItems.value);
      for (const [asin, reviews] of reviewCache.entries()) {
        if (reviewItems.has(asin)) {
          const addIds = new Set(reviews.map((x) => x.id));
          const origin = reviewItems.get(asin)!;
          const newReviews = origin.filter((x) => !addIds.has(x.id)).concat(reviews);
          newReviews.sort((a, b) => dayjs(b.dateInfo).diff(dayjs(a.dateInfo)));
          reviewItems.set(asin, newReviews);
        } else {
          reviewItems.set(asin, reviews);
        }
      }
      amazonReviewItems.value = reviewItems;
      reviewCache.clear();
    }
  };

  const taskWrapper = <T extends (...params: any) => any>(func: T) => {
    const { commitChangeIngerval = 10000 } = settings.value;
    searchCache.splice(0, searchCache.length);
    detailCache.clear();
    reviewCache.clear();
    return (...params: Parameters<T>) =>
      startTask(async () => {
        const interval = setInterval(() => commitChange(), commitChangeIngerval);
        await func(...params);
        clearInterval(interval);
        commitChange();
      });
  };

  const runDetailPageTask = taskWrapper(worker.runDetailPageTask.bind(worker));
  const runSearchPageTask = taskWrapper(worker.runSearchPageTask.bind(worker));
  const runReviewPageTask = taskWrapper(worker.runReviewPageTask.bind(worker));

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
