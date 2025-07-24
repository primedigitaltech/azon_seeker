import { taskOptionBase } from '../interfaces/common';
import { BaseWorker } from './base';
import { LowesEvents, LowesWorker } from '../interfaces/lowes';

class LowesWorkerImpl extends BaseWorker<LowesEvents> implements LowesWorker {
  private static instance: LowesWorker | null = null;
  public static getInstance() {
    if (!this.instance) {
      this.instance = new LowesWorkerImpl();
    }
    return this.instance;
  }
  protected constructor() {
    super();
  }

  runDetailPageTask(urls: string[], options?: taskOptionBase): Promise<void> {
    throw new Error('Method not implemented.');
  }

  stop(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export default {
  getLowesWorker() {
    return LowesWorkerImpl.getInstance();
  },
};
