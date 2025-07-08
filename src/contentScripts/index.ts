// Firefox `browser.tabs.executeScript()` requires scripts return a primitive value
(() => {
  Object.assign(self, { appContext: 'content script' });
  import('./dom-to-image');
})();
