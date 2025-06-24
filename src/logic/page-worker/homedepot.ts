import Emittery from 'emittery';
import type { HomedepotEvents, HomedepotWorker, LanchTaskBaseOptions } from './types';
import { Tabs } from 'webextension-polyfill';
import { withErrorHandling } from '../error-handler';
import { HomedepotDetailPageInjector } from '~/logic/web-injectors/homedepot';

class HomedepotWorkerImpl implements HomedepotWorker {
  private static _instance: HomedepotWorker | null = null;
  public static getInstance() {
    if (!HomedepotWorkerImpl._instance) {
      HomedepotWorkerImpl._instance = new HomedepotWorkerImpl();
    }
    return HomedepotWorkerImpl._instance as HomedepotWorker;
  }
  protected constructor() {}

  readonly channel: Emittery<HomedepotEvents> = new Emittery();

  private readonly _controlChannel = new Emittery<{ interrupt: undefined }>();

  private async createNewTab(url?: string): Promise<Tabs.Tab> {
    const tab = await browser.tabs.create({ url, active: true });
    return tab;
  }

  @withErrorHandling
  private async wanderingDetailPage(OSMID: string) {
    const url = `https://www.homedepot.com/p/${OSMID}`;
    const tab = await this.createNewTab(url);
    const injector = new HomedepotDetailPageInjector(tab);
    await injector.waitForPageLoad();
    const info = await injector.getInfo();
    this.channel.emit('detail-item-collected', { item: { OSMID, ...info } });
    setTimeout(() => {
      browser.tabs.remove(tab.id!);
    }, 1000);
  }

  async runDetailPageTask(OSMIDs: string[], options: LanchTaskBaseOptions = {}): Promise<void> {
    const { progress } = options;
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
