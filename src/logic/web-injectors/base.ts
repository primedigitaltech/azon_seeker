import { Tabs } from 'webextension-polyfill';
import { exec } from '~/logic/execute-script';

export class BaseInjector {
  readonly _tab: Tabs.Tab;

  readonly _timeout: number;

  constructor(tab: Tabs.Tab, timeout: number = 30000) {
    this._tab = tab;
    this._timeout = timeout;
  }

  run<T, P extends Record<string, unknown>>(
    func: (payload: P) => Promise<T>,
    payload?: P,
  ): Promise<T> {
    return exec(this._tab.id!, func, payload as P, { timeout: this._timeout });
  }
}
