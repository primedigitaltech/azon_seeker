/**
 *
 * @param tabId
 * @param func
 * @returns
 */
export async function executeScript<T>(tabId: number, func: () => Promise<T>): Promise<T | null> {
  const injectResults = await browser.scripting.executeScript({
    target: { tabId },
    func,
  });
  const ret = injectResults.pop();
  if (ret?.error) {
    console.error('注入脚本时发生错误', ret.error);
  }
  return ret?.result as T | null;
}
