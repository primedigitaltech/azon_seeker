/**
 * Executes a provided asynchronous function in the context of a specific browser tab.
 * @param tabId - The ID of the browser tab where the script will be executed.
 * @param func - The asynchronous function to execute in the tab's context. This function
 *               should be serializable and must not rely on external closures.
 * @param payload - An optional payload object to pass as an argument to the executed function.
 *
 * @returns A promise that resolves to the result of the executed function, or `null` if an error occurs.
 *
 * @throws This function does not throw directly but logs an error to the console if the script injection fails.
 *
 * @example
 * ```typescript
 * const result = await exec<number, { value: number }>(
 *   tabId,
 *   async (payload) => {
 *     return payload?.value ?? 0;
 *   },
 *   { value: 42 }
 * );
 * console.log(result); // Outputs: 42
 * ```
 */
export async function exec<T>(tabId: number, func: () => Promise<T>): Promise<T>;
export async function exec<T, P extends Record<string, unknown>>(
  tabId: number,
  func: (payload: P) => Promise<T>,
  payload: P,
): Promise<T>;
export async function exec<T, P extends Record<string, unknown>>(
  tabId: number,
  func: (payload?: P) => Promise<T>,
  payload?: P,
): Promise<T> {
  const { timeout } = {
    timeout: 30000,
  };
  return new Promise<T>(async (resolve, reject) => {
    setTimeout(() => reject('脚本运行超时'), timeout);
    const injectResults = await browser.scripting.executeScript({
      target: { tabId },
      func,
      args: payload ? [payload] : undefined,
    });
    const ret = injectResults.pop();
    if (ret?.error) {
      reject(`注入脚本时发生错误: ${ret.error}`); // 似乎无法走到这一步
    }
    resolve(ret!.result as T);
  });
}
