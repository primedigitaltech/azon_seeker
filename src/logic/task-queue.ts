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

export interface TaskInit<
  T = undefined,
  F extends (...args: unknown[]) => Promise<T> = (...args: unknown[]) => Promise<T>,
> {
  func: F;
  args?: Parameters<F>;
  callback?: (result: TaskExecutionResult<T>) => Promise<void> | void;
}

export class Task<
  T = undefined,
  F extends (...args: unknown[]) => Promise<T> = (...args: unknown[]) => Promise<T>,
> {
  private _name: string;
  private _func: F;
  private _args: Parameters<F>;
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

  constructor(name: string, init: TaskInit<T, F>) {
    this._name = name;
    this._func = init.func;
    this._args = init.args ?? ([] as unknown as Parameters<F>);
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
  private _queue: Task<any>[] = [];
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

  public add<T>(task: Task<T>) {
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

/**
 * A decorator function that wraps a method to manage its execution as a task in a task queue.
 *
 * This function takes a method and returns a new method that, when called, will create a
 * `Task` and add it to the `taskQueue` of the `TaskController`. The original method will be
 * executed asynchronously, and the result will be resolved or rejected based on the task's
 * outcome.
 */
export function taskUnit<T>(
  target: (this: TaskController, ...args: any[]) => Promise<T>,
  context: ClassMethodDecoratorContext,
): (this: TaskController, ...args: any[]) => Promise<T> {
  // target 就是当前被装饰的 class 方法
  const originalMethod = target;
  // 定义一个新方法
  const decoratedMethod = async function (this: TaskController, ...args: any[]) {
    return new Promise<T>((resolve, reject) => {
      const task = new Task<T, typeof originalMethod>(context.name.toString(), {
        func: (o, ...a) => originalMethod.call(o, ...a),
        args: [this, ...args],
        callback: (r) => {
          if (r.status === 'success') {
            resolve(r.result);
          } else if (r.status === 'failure') {
            reject(r.message);
          }
        },
      });
      this.taskQueue.add(task);
      if (!this.taskQueue.running) {
        this.taskQueue.start();
      }
    });
  };
  // 返回装饰后的方法
  return decoratedMethod;
}
