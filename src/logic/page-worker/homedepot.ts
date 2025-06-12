import Emittery from 'emittery';
import { HomedepotEvents, HomedepotWorker } from './types';
import { Tabs } from 'webextension-polyfill';
import { isForbiddenUrl } from '~/env';
import { withErrorHandling } from '../error-handler';
import { HomedepotDetailPageInjector } from '../web-injectors';

class HomedepotWorkerImpl implements HomedepotWorker {
  private static _instance: HomedepotWorker | null = null;
  public static getInstance() {
    if (!HomedepotWorkerImpl._instance) {
      HomedepotWorkerImpl._instance = new HomedepotWorkerImpl();
    }
    return HomedepotWorkerImpl._instance as HomedepotWorker;
  }
  private constructor() {}

  readonly channel: Emittery<HomedepotEvents> = new Emittery();

  private readonly _controlChannel = new Emittery<{ interrupt: undefined }>();

  private async getCurrentTab(): Promise<Tabs.Tab> {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    return tab;
  }

  private async createNewTab(url?: string): Promise<Tabs.Tab> {
    const tab = await browser.tabs.create({ url, active: true });
    return tab;
  }

  @withErrorHandling
  private async wanderingDetailPage(OSMID: string) {
    const url = `https://www.homedepot.com/p/${OSMID}`;
    let tab = await this.getCurrentTab();
    if (!tab.url || isForbiddenUrl(tab.url)) {
      tab = await this.createNewTab(url);
    } else {
      await browser.tabs.update(tab.id!, { url });
    }
    const injector = new HomedepotDetailPageInjector(tab);
    await injector.waitForPageLoad();
    const info = await injector.getInfo();
    this.channel.emit('detail-item-collected', { item: { OSMID, ...info } });
  }

  async runDetailPageTask(
    OSMIDs: string[],
    progress?: (remains: string[]) => Promise<void> | void,
  ): Promise<void> {
    const remains = [...OSMIDs];
    let interrupt = false;
    const unsubscribe = this._controlChannel.on('interrupt', () => {
      interrupt = true;
    });
    while (remains.length > 0 && !interrupt) {
      const OSMIDs = remains.shift()!;
      await this.wanderingDetailPage(OSMIDs);
      progress && progress(remains);
    }
    unsubscribe();
  }

  stop(): Promise<void> {
    return this._controlChannel.emit('interrupt');
  }
}

export default {
  useHomedepotWorker() {
    return HomedepotWorkerImpl.getInstance();
  },
};
