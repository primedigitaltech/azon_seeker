import type Emittery from 'emittery';

export type Listener<T> = Pick<Emittery<T>, 'on' | 'off' | 'once'>;

export interface taskOptionBase {
  progress?: (remains: string[]) => Promise<void> | void;
}

export type WorkerComposable<Base, S = {}> = Base & {
  settings: Ref<S>;
  isRunning: Ref<boolean>;
};
