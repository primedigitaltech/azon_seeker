import type Emittery from 'emittery';

export type Listener<T> = Pick<Emittery<T>, 'on' | 'off' | 'once'>;

export interface LanchTaskBaseOptions {
  progress?: (remains: string[]) => Promise<void> | void;
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

export type WorkerComposable<Base, S = {}> = Base & {
  settings: Ref<S>;
  isRunning: Ref<boolean>;
};
