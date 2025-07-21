import { taskOptionBase, Listener } from './common';

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
    options?: taskOptionBase & { review?: boolean },
  ): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
