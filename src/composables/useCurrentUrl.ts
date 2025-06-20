export function useCurrentUrl() {
  const currentUrl = ref<string | undefined>(undefined);

  const updateUrl = async () => {
    const tab = await browser.tabs.query({ active: true, currentWindow: true }).then((ts) => ts[0]);
    currentUrl.value = tab.url || undefined;
  };

  onMounted(() => {
    updateUrl();
    browser.tabs.onUpdated.addListener(updateUrl);
    browser.tabs.onHighlighted.addListener(updateUrl);
  });

  onUnmounted(() => {
    browser.tabs.onUpdated.removeListener(updateUrl);
    browser.tabs.onHighlighted.removeListener(updateUrl);
  });

  return currentUrl;
}
