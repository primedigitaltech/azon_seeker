import amazon from './amazon';
import homedepot from './homedepot';
import { uploadImage } from '~/logic/upload';
import { useLongTask } from '~/composables/useLongTask';

export interface AmazonPageWorkerSettings {
  searchItems?: Ref<AmazonSearchItem[]>;
  detailItems?: Ref<Map<string, AmazonDetailItem>>;
  reviewItems?: Ref<Map<string, AmazonReview[]>>;
  commitChangeIngerval?: number;
}

class AmazonPageWorkerFactory {
  public amazonWorker: ReturnType<typeof this.buildAmazonPageWorker> | null = null;

  public amazonWorkerSettings: AmazonPageWorkerSettings = {};

  public buildAmazonPageWorker() {
    const { isRunning, startTask } = useLongTask();

    const worker = amazon.getAmazonPageWorker();

    const searchCache = [] as AmazonSearchItem[];
    const detailCache = new Map<string, AmazonDetailItem>();
    const reviewCache = new Map<string, AmazonReview[]>();

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

    const commitChange = () => {
      const { searchItems, detailItems, reviewItems } = this.amazonWorkerSettings;
      if (typeof searchItems !== 'undefined') {
        searchItems.value = searchItems.value.concat(searchCache);
      }
      if (typeof detailItems !== 'undefined') {
        for (const [k, v] of detailCache.entries()) {
          detailItems.value.delete(k); // Trigger update
          detailItems.value.set(k, v);
        }
      }
      if (typeof reviewItems !== 'undefined') {
        for (const [asin, reviews] of reviewCache.entries()) {
          if (reviewItems.value.has(asin)) {
            const adds = new Set(reviews.map((x) => x.id));
            const newReviews = reviewItems.value
              .get(asin)!
              .filter((x) => !adds.has(x.id))
              .concat(reviews);
            newReviews.sort((a, b) => dayjs(b.dateInfo).diff(dayjs(a.dateInfo)));
            reviewItems.value.delete(asin); // Trigger update
            reviewItems.value.set(asin, newReviews);
          } else {
            reviewItems.value.set(asin, reviews);
          }
        }
      }
    };

    const taskWrapper = <T extends (...params: any) => any>(func: T) => {
      const { commitChangeIngerval = 10000 } = this.amazonWorkerSettings;
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

  loadAmazonPageWorker(settings?: AmazonPageWorkerSettings) {
    if (settings) {
      this.amazonWorkerSettings = { ...this.amazonWorkerSettings, ...settings };
    }
    if (!this.amazonWorker) {
      this.amazonWorker = this.buildAmazonPageWorker();
    }
    return this.amazonWorker;
  }
}

export interface HomedepotWorkerSettings {
  detailItems?: Ref<Map<string, HomedepotDetailItem>>;
  commitChangeIngerval?: number;
}

class HomedepotWorkerFactory {
  public homedepotWorkerSettings: HomedepotWorkerSettings = {};

  public homedepotWorker: ReturnType<typeof this.buildHomedepotWorker> | null = null;

  public buildHomedepotWorker() {
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
      const { detailItems } = this.homedepotWorkerSettings;
      if (typeof detailItems !== 'undefined') {
        for (const [k, v] of detailCache.entries()) {
          detailItems.value.delete(k); // Trigger update
          detailItems.value.set(k, v);
        }
        detailCache.clear();
      }
    };

    const taskWrapper = <T extends (...params: any) => any>(func: T) => {
      const { commitChangeIngerval = 10000 } = this.homedepotWorkerSettings;
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
      isRunning,
      runDetailPageTask,
      on: worker.on.bind(worker),
      off: worker.off.bind(worker),
      once: worker.once.bind(worker),
      stop: worker.stop.bind(worker),
    };
  }

  loadHomedepotWorker(settings?: HomedepotWorkerSettings) {
    if (settings) {
      this.homedepotWorkerSettings = { ...this.homedepotWorkerSettings, ...settings };
    }
    if (!this.homedepotWorker) {
      this.homedepotWorker = this.buildHomedepotWorker();
    }
    return this.homedepotWorker;
  }
}

const amazonfacotry = new AmazonPageWorkerFactory();
const homedepotfactory = new HomedepotWorkerFactory();

export function usePageWorker(
  type: 'amazon',
  settings?: AmazonPageWorkerSettings,
): ReturnType<typeof amazonfacotry.loadAmazonPageWorker>;
export function usePageWorker(
  type: 'homedepot',
  settings?: HomedepotWorkerSettings,
): ReturnType<typeof homedepotfactory.loadHomedepotWorker>;
export function usePageWorker(type: 'amazon' | 'homedepot', settings?: any) {
  switch (type) {
    case 'amazon':
      return amazonfacotry.loadAmazonPageWorker(settings);
    case 'homedepot':
      return homedepotfactory.loadHomedepotWorker(settings);
    default:
      throw new Error(`Unsupported page worker type: ${type}`);
  }
}
