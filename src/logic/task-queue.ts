import Emittery from 'emittery';

export type TaskExecutionResult<T = undefined> =
  | {
      name: string;
      status: 'success';
      result: T;
    }
  | {
      name: string;
      status: 'failure';
      message: string;
    };

export interface TaskInit<T = undefined, P extends any[] = unknown[]> {
  func: (...args: P) => Promise<T>;
  args?: P;
  callback?: (result: TaskExecutionResult<T>) => Promise<void> | void;
}

export class Task<T = undefined, P extends any[] = any[]> {
  private _name: string;
  private _func: (...args: P) => Promise<T>;
  private _args: P;
  private _status: 'initialization' | 'running' | 'success' | 'failure' = 'initialization';
  private _result: TaskExecutionResult<T> | null = null;
  private _callback: ((result: TaskExecutionResult<T>) => Promise<void> | void) | undefined;

  public get name() {
    return this._name;
  }

  public get status() {
    return this._status;
  }

  public get result() {
    return this._result;
  }

  constructor(name: string, init: TaskInit<T, P>) {
    this._name = name;
    this._func = init.func;
    this._args = init.args ?? ([] as unknown as P);
    this._callback = init.callback;
  }

  public async execute(): Promise<TaskExecutionResult<T>> {
    const ret = await new Promise<TaskExecutionResult<T>>((resolve) => {
      this._status = 'running';
      const task = this._func(...this._args);
      task
        .then((ret) => {
          this._status = 'success';
          this._result = {
            name: this.name,
            status: 'success',
            result: ret,
          };
          resolve(this._result);
        })
        .catch((reason) => {
          this._status = 'failure';
          this._result = {
            name: this.name,
            status: 'failure',
            message: `${reason}`,
          };
          resolve(this._result);
        });
    });
    this._callback && this._callback(ret);
    return ret;
  }
}

export class TaskQueue {
  private _queue: Task<any, any[]>[] = [];
  private _running = false;
  private _channel: Emittery<{ interrupt: undefined; start: undefined; stop: undefined }> =
    new Emittery();

  constructor() {
    this._channel.on('start', () => {
      this._running = true;
    });
    this._channel.on('stop', () => {
      this._running = false;
    });
  }

  public get running() {
    return this._running;
  }

  public get channel() {
    return this._channel;
  }

  public add(task: Task<any, any>) {
    this._queue.push(task);
  }

  public async start() {
    this._channel.emit('start');
    let stopSignal = false;
    const unsubscribe = this._channel.on('interrupt', () => {
      stopSignal = true;
    });
    while (this._queue.length > 0 && !stopSignal) {
      const task = this._queue.shift()!;
      await task.execute();
    }
    unsubscribe();
    this._channel.emit('stop');
  }

  public async stop() {
    if (!this._running) {
      return;
    }
    return new Promise((resolve) => {
      this._channel.once('stop').then(resolve);
      this._channel.emit('interrupt');
    });
  }

  public clear() {
    this._queue.length = 0;
  }
}

/**
 * Represents a controller for managing tasks within a task queue.
 */
export interface TaskController {
  /**
   * The queue that manages the tasks for this controller.
   */
  readonly taskQueue: TaskQueue;
}
