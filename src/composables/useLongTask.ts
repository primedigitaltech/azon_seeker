export function useLongTask() {
  const isRunning = ref(false);

  const startTask = async (task: () => Promise<void>) => {
    isRunning.value = true;

    try {
      await task();
      isRunning.value = false;
    } catch (error) {
      isRunning.value = false;
      console.error('Task failed:', error);
      throw error;
    }
  };

  return {
    isRunning,
    startTask,
  };
}
