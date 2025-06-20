export function useLongTask() {
  const isRunning = ref(false);

  const startTask = async <T = undefined>(task: () => Promise<T>) => {
    if (isRunning.value) {
      throw Error('Task is still running.');
    }
    isRunning.value = true;
    let result = undefined;
    try {
      result = await task();
    } catch (error) {
      console.error('Task failed:', error);
    }
    isRunning.value = false;
    return result as T;
  };

  return {
    isRunning,
    startTask,
  };
}
