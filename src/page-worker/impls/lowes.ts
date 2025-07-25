import { taskOptionBase } from '../interfaces/common';
import { BaseWorker } from './base';
import { LowesEvents, LowesWorker } from '../interfaces/lowes';
import { LowesDetailPageInjector } from '../web-injectors/lowes';

class LowesWorkerImpl
  extends BaseWorker<LowesEvents & { interrupt: undefined }>
  implements LowesWorker
{
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

  async runDetailPageTask(urls: string[], options: taskOptionBase = {}): Promise<void> {
    const { progress } = options;
    let interrupt = false;
    const remains = [...urls];
    this.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const url = remains.shift()!;
      const tab = await browser.tabs.create({ url });
      const injector = new LowesDetailPageInjector(tab);
      await injector.waitForPageLoad();
      const baseInfo = await injector.getBaseInfo();
      baseInfo &&
        (await this.emit('detail-item-collected', {
          item: { ...baseInfo, timestamp: dayjs().format('YYYY/M/D HH:mm:ss'), link: url },
        }));
      progress && progress(remains);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTimeout(() => browser.tabs.remove(tab.id!), 1500);
    }
  }

  stop(): Promise<void> {
    return this.emit('interrupt');
  }
}

export default {
  getLowesWorker() {
    return LowesWorkerImpl.getInstance();
  },
};
