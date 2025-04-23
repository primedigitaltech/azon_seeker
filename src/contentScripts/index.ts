/* eslint-disable no-console */
import App from './views/App.vue';
import { setupApp } from '~/logic/common-setup';

// 是否在ContentScript挂载Vue APP
const MOUNT_COMPONENT = false;

/**
 * mount component to context window
 */
const mountComponent = () => {
  const container = document.createElement('div');
  container.id = __NAME__;
  const root = document.createElement('div');
  const styleEl = document.createElement('link');
  const shadowDOM = container.attachShadow?.({ mode: __DEV__ ? 'open' : 'closed' }) || container;
  styleEl.setAttribute('rel', 'stylesheet');
  styleEl.setAttribute('href', browser.runtime.getURL('dist/contentScripts/index.css'));
  shadowDOM.appendChild(styleEl);
  shadowDOM.appendChild(root);
  document.body.appendChild(container);
  const app = createApp(App);
  setupApp(app);
  app.mount(root);
};

// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  if (MOUNT_COMPONENT) {
    mountComponent();
  }
})();
