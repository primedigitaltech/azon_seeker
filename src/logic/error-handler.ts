import Emittery from 'emittery';

export interface ErrorChannelContainer {
  channel: Emittery<{ error: { message: string } }>;
}

/**
 * Process unknown errors.
 */
export function withErrorHandling(
  target: (this: ErrorChannelContainer, ...args: any[]) => Promise<any>,
  _context: ClassMethodDecoratorContext,
): (this: ErrorChannelContainer, ...args: any[]) => Promise<any> {
  // target 就是当前被装饰的 class 方法
  const originalMethod = target;
  // 定义一个新方法
  const decoratedMethod = async function (this: ErrorChannelContainer, ...args: any[]) {
    try {
      return await originalMethod.call(this, ...args); // 调用原有方法
    } catch (error) {
      this.channel.emit('error', { message: `发生未知错误：${error}` });
      throw error;
    }
  };
  // 返回装饰后的方法
  return decoratedMethod;
}
