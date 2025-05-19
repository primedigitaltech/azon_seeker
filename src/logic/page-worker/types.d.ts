import type Emittery from 'emittery';
import { TaskQueue } from '../task-queue';

type AmazonSearchItem = {
  keywords: string;
  page: number;
  link: string;
  title: string;
  asin: string;
  rank: number;
  imageSrc: string;
  createTime: string;
};

type AmazonDetailItem = {
  asin: string;
  rating?: number;
  ratingCount?: number;
  category1?: { name: string; rank: number };
  category2?: { name: string; rank: number };
  imageUrls?: string[];
  topReviews?: AmazonReview[];
};

type AmazonReview = {
  asin: string;
  username: string;
  title: string;
  rating: string;
  dateInfo: string;
  content: string;
};

type AmazonItem = AmazonSearchItem & Partial<AmazonDetailItem> & { hasDetail: boolean };

interface AmazonPageWorkerEvents {
  /**
   * The event is fired when worker collected links to items on the Amazon search page.
   */
  ['item-links-collected']: { objs: AmazonSearchItem[] };

  /**
   * The event is fired when worker collected goods' rating on the Amazon detail page.
   */
  ['item-rating-collected']: Pick<AmazonDetailItem, 'asin' | 'rating' | 'ratingCount'>;

  /**
   * The event is fired when worker
   */
  ['item-category-rank-collected']: Pick<AmazonDetailItem, 'asin' | 'category1' | 'category2'>;

  /**
   * The event is fired when images collected
   */
  ['item-images-collected']: Pick<AmazonDetailItem, 'asin' | 'imageUrls'>;

  /**
   * The event is fired when top reviews collected
   */
  ['item-top-reviews-collected']: { reviews: AmazonReview[] };

  /**
   * Error event that occurs when there is an issue with the Amazon page worker.
   */
  ['error']: { message: string; url?: string };
}

interface AmazonPageWorker {
  /**
   * The channel for communication with the Amazon page worker.
   * This is an instance of Emittery, which allows for event-based communication.
   */
  readonly channel: Emittery<AmazonPageWorkerEvents>;

  /**
   * Browsing goods search page and collect links to those goods.
   * @param keywordsList - The keywords list to search for on Amazon.
   * @param progress The callback that receive remaining keywords as the parameter.
   */
  runSearchPageTask(
    keywordsList: string[],
    progress?: (remains: string[]) => Promise<void>,
  ): Promise<void>;

  /**
   * Browsing goods detail page and collect target information.
   * @param asins Amazon Standard Identification Numbers.
   * @param progress The callback that receive remaining asins as the parameter.
   */
  runDetaiPageTask(asins: string[], progress?: (remains: string[]) => Promise<void>): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
