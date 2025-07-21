import { taskOptionBase, Listener } from './common';

export interface HomedepotEvents {
  /**The event is fired when detail base info collected */
  ['detail-base-info-collect']: { item: LowesDetailItem };
  /**The event is fired when error occur */
  ['error']: { message: string };
}

export interface HomedepotWorker extends Listener<HomedepotEvents> {
  /**
   * Browsing item detail page and collect target information
   */
  runDetailPageTask(urls: string[], options: taskOptionBase): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
