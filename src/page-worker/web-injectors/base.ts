import { Tabs } from 'webextension-polyfill';
import { exec } from '~/logic/execute-script';
import type { ProtocolMap } from 'webext-bridge';

export class BaseInjector {
  readonly _tab: Tabs.Tab;
  readonly _timeout: number;
  readonly _appContext: AppContext;

  constructor(tab: Tabs.Tab, options: { timeout?: number; appContext?: AppContext } = {}) {
    const { timeout = 30000, appContext = 'sidepanel' } = options;
    this._tab = tab;
    this._timeout = timeout;
    this._appContext = appContext;
  }

  protected async getMessageSender() {
    let sender = null;
    switch (this._appContext) {
      case 'sidepanel':
        sender = await import('webext-bridge/sidepanel');
        return { sendMessage: sender.sendMessage };
      case 'options':
        sender = await import('webext-bridge/options');
        return { sendMessage: sender.sendMessage };
    }
  }

  protected async screenshot(
    data: ProtocolMap['dom-to-image']['data'],
  ): Promise<ProtocolMap['dom-to-image']['return']> {
    const sender = await this.getMessageSender();
    return sender!.sendMessage('dom-to-image', data, {
      context: 'content-script',
      tabId: this._tab.id!,
    });
  }

  protected run<T, P extends Record<string, unknown>>(
    func: (payload: P) => Promise<T>,
    payload?: P,
  ): Promise<T> {
    return exec(this._tab.id!, func, payload as P, { timeout: this._timeout });
  }
}
