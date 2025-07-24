import { taskOptionBase, Listener } from './common';

export interface LowesEvents {
  /** The event is fired when detail items collect */
  ['detail-item-collected']: { item: LowesDetailItem };

  /** The event is fired when error occurs. */
  ['error']: { message: string; url?: string };
}

export interface LowesWorker {
  /**
   * Browsing item detail page and collect target information
   */
  runDetailPageTask(urls: string[], options?: taskOptionBase): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
