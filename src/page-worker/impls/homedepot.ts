import { Tabs } from 'webextension-polyfill';
import { withErrorHandling } from '../utils/error-handler';
import { HomedepotDetailPageInjector } from '../web-injectors/homedepot';
import { BaseWorker } from './base';
import { taskOptionBase } from '../interfaces/common';
import { HomedepotEvents, HomedepotWorker } from '../interfaces/homedepot';

class HomedepotWorkerImpl
  extends BaseWorker<HomedepotEvents & { interrupt: undefined }>
  implements HomedepotWorker
{
  private static _instance: HomedepotWorker | null = null;
  public static getInstance() {
    if (!HomedepotWorkerImpl._instance) {
      HomedepotWorkerImpl._instance = new HomedepotWorkerImpl();
    }
    return HomedepotWorkerImpl._instance as HomedepotWorker;
  }
  protected constructor() {
    super();
  }

  private async createNewTab(url?: string): Promise<Tabs.Tab> {
    const tab = await browser.tabs.create({ url, active: true });
    return tab;
  }

  @withErrorHandling
  private async wanderingDetailPage(OSMID: string, review?: boolean) {
    const url = `https://www.homedepot.com/p/${OSMID}`;
    const tab = await this.createNewTab(url);
    const injector = new HomedepotDetailPageInjector(tab);
    const available = await injector.waitForPageLoad();
    if (!available) {
      setTimeout(() => {
        browser.tabs.remove(tab.id!);
      }, 1000);
      return;
    }
    const info = await injector.getInfo();
    const imageUrls = await injector.getImageUrls();
    await this.emit('detail-item-collected', {
      item: { OSMID, ...info, imageUrls, timestamp: dayjs().format('YYYY/M/D HH:mm:ss') },
    });
    if (!review) {
      setTimeout(() => {
        browser.tabs.remove(tab.id!);
      }, 1000);
      return;
    }
    await injector.waitForReviewLoad();
    let reviews = await injector.getReviews();
    reviews.length > 0 && (await this.emit('review-collected', { OSMID, reviews }));
    while ((await injector.tryJumpToNextPage()) && reviews.length > 0) {
      reviews = await injector.getReviews();
      reviews.length > 0 && (await this.emit('review-collected', { OSMID, reviews }));
    }
    setTimeout(() => {
      browser.tabs.remove(tab.id!);
    }, 1000);
  }

  async runDetailPageTask(
    OSMIDs: string[],
    options: taskOptionBase & { review?: boolean } = {},
  ): Promise<void> {
    const { progress, review } = options;
    const remains = [...OSMIDs];
    let interrupt = false;
    const unsubscribe = this.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const OSMIDs = remains.shift()!;
      await this.wanderingDetailPage(OSMIDs, review);
      progress && progress(remains);
    }
    unsubscribe();
  }

  stop(): Promise<void> {
    return this.emit('interrupt');
  }
}

export default {
  getHomedepotWorker() {
    return HomedepotWorkerImpl.getInstance();
  },
};
