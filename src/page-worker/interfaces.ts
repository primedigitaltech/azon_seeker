import type Emittery from 'emittery';

type Listener<T> = Pick<Emittery<T>, 'on' | 'off' | 'once'>;

export type LanchTaskBaseOptions = { progress?: (remains: string[]) => Promise<void> | void };

export interface AmazonPageWorkerEvents {
  /** The event is fired when worker collected links to items on the Amazon search page. */
  ['item-links-collected']: { objs: AmazonSearchItem[] };

  /** The event is fired when worker collected goods' base info on the Amazon detail page.*/
  ['item-base-info-collected']: Pick<
    AmazonDetailItem,
    | 'asin'
    | 'title'
    | 'boughtInfo'
    | 'price'
    | 'rating'
    | 'ratingCount'
    | 'categories'
    | 'timestamp'
    | 'shipFrom'
    | 'soldBy'
  >;

  /** The event is fired when worker */
  ['item-category-rank-collected']: Pick<AmazonDetailItem, 'asin' | 'category1' | 'category2'>;

  /** The event is fired when images collected */
  ['item-images-collected']: Pick<AmazonDetailItem, 'asin' | 'imageUrls'>;

  /** The event is fired when top reviews collected in detail page*/
  // ['item-top-reviews-collected']: Pick<AmazonDetailItem, 'asin' | 'topReviews'>;

  /** The event is fired when aplus screenshot collect */
  ['item-aplus-screenshot-collect']: { asin: string; base64data: string };

  /** The event is fired when extra amazon info collected*/
  ['item-extra-info-collect']: {
    asin: string;
    info: Pick<
      AmazonDetailItem,
      'abouts' | 'brand' | 'flavor' | 'unitCount' | 'itemForm' | 'productDimensions'
    >;
  };

  /** The event is fired when reviews collected in all review page */
  ['item-review-collected']: { asin: string; reviews: AmazonReview[] };

  /** Error event that occurs when there is an issue with the Amazon page worker*/
  ['error']: { message: string; url?: string };
}

export interface AmazonPageWorker extends Listener<AmazonPageWorkerEvents> {
  /**
   * Browsing goods search page and collect links to those goods.
   * @param keywordsList - The keywords list to search for on Amazon.
   * @param options The Options Specify Behaviors.
   */
  runSearchPageTask(keywordsList: string[], options?: LanchTaskBaseOptions): Promise<void>;

  /**
   * Browsing goods detail page and collect target information.
   * @param asins Amazon Standard Identification Numbers.
   * @param options The Options Specify Behaviors.
   */
  runDetailPageTask(
    asins: string[],
    options?: LanchTaskBaseOptions & { aplus?: boolean; extra?: boolean },
  ): Promise<void>;

  /**
   * Browsing goods review page and collect target information.
   * @param asins Amazon Standard Identification Numbers.
   * @param options The Options Specify Behaviors.
   */
  runReviewPageTask(
    asins: string[],
    options?: LanchTaskBaseOptions & { recent?: boolean },
  ): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}

export interface HomedepotEvents {
  /** The event is fired when detail items collect */
  ['detail-item-collected']: { item: HomedepotDetailItem };

  /** The event is fired when reviews collect */
  ['review-collected']: { reviews: HomedepotReview[] };

  /** The event is fired when error occurs. */
  ['error']: { message: string; url?: string };
}

export interface HomedepotWorker extends Listener<HomedepotEvents> {
  /**
   * Browsing goods detail page and collect target information
   */
  runDetailPageTask(
    OSMIDs: string[],
    options?: LanchTaskBaseOptions & { review?: boolean },
  ): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}

export interface LowesEvents {
  /** The event is fired when detail items collect */
  ['detail-item-collected']: { item: LowesDetailItem };

  /** The event is fired when error occurs. */
  ['error']: { message: string; url?: string };
}

export interface LowesWorker {
  /**
   * The channel for communication with the Lowes page worker.
   */
  readonly channel: Emittery<LowesEvents>;

  /**
   * Browsing goods detail page and collect target information
   */
  runDetailPageTask(urls: string[], options?: LanchTaskBaseOptions): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
