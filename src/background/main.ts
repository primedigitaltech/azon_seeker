// https://github.com/serversideup/webext-bridge/issues/67#issuecomment-2676094094
import('webext-bridge/background');

// only on dev mode
if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client');
  // load latest content script
  import('./contentScriptHMR');
}

// remove or turn this off if you don't use side panel
const USE_SIDE_PANEL = true;

// to toggle the sidepanel with the action button in chromium:
if (USE_SIDE_PANEL) {
  // @ts-expect-error missing types
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error: unknown) => console.error(error));
}

browser.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log('Azon Seeker installed');

  browser.contextMenus.create({
    id: 'show-result',
    title: '结果页',
    contexts: ['action'],
  });
});

browser.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId === 'show-result') {
    browser.runtime.openOptionsPage();
  }
});
