<script setup lang="ts">
import { keywordsList } from '~/storages/amazon';
import type { Timeline } from '~/components/ProgressReport.vue';
import { usePageWorker } from '~/page-worker';

const message = useMessage();

//#region Initial Page Worker
const worker = usePageWorker('amazon', { objects: ['search'] });
worker.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
});
worker.on('item-links-collected', ({ objs }) => {
  timelines.value.push({
    type: 'success',
    title: '检测到数据',
    time: new Date().toLocaleString(),
    content: `成功采集到 ${objs.length} 条数据`,
  });
});
//#endregion

const timelines = ref<Timeline[]>([]);

const launch = async () => {
  const kws = unref(keywordsList);
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: `关键词: ${kws[0]} 数据采集开始`,
    },
  ];
  timelines.value.push();
  await worker.runSearchPageTask(kws, {
    progress: (remains) => {
      if (remains.length > 0) {
        timelines.value.push({
          type: 'info',
          title: '开始',
          time: new Date().toLocaleString(),
          content: `关键词: ${remains[0]} 数据采集开始`,
        });
        keywordsList.value = remains;
      }
    },
  });
  timelines.value.push({
    type: 'info',
    title: '结束',
    time: new Date().toLocaleString(),
    content: `搜索任务结束`,
  });
};

const handleStart = async () => {
  if (keywordsList.value.length === 0) {
    return;
  }
  launch();
};

const handleInterrupt = () => {
  if (!worker.isRunning.value) return;
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="search-page-entry">
    <header-title>Amazon Search</header-title>
    <div class="interactive-section">
      <n-dynamic-input
        :disabled="worker.isRunning.value"
        v-model:value="keywordsList"
        :min="1"
        :max="10"
        class="search-input-box"
        autosize
        size="large"
        round
        placeholder="请输入关键词采集信息"
      />
      <n-button
        v-if="!worker.isRunning.value"
        type="primary"
        round
        size="large"
        @click="handleStart"
      >
        <template #icon>
          <n-icon>
            <ant-design-thunderbolt-outlined />
          </n-icon>
        </template>
        开始
      </n-button>
      <n-button v-else type="primary" round size="large" @click="handleInterrupt">
        <template #icon>
          <n-icon>
            <ant-design-thunderbolt-outlined />
          </n-icon>
        </template>
        中断
      </n-button>
    </div>
    <div v-if="worker.isRunning.value" class="running-tip-section">
      <n-alert title="Warning" type="warning"> 警告，在插件运行期间请勿与浏览器交互。 </n-alert>
    </div>
    <progress-report class="progress-report" :timelines="timelines" />
  </div>
</template>

<style scoped lang="scss">
.search-page-entry {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;

  .interactive-section {
    border-radius: 10px;
    width: 80%;
    outline: 1px #00000020 dashed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: stretch;
    gap: 15px;
    padding: 15px 25px;

    .search-input-box {
      min-width: 240px;
    }
  }

  .running-tip-section {
    border-radius: 10px;
    cursor: wait;
  }

  .progress-report {
    width: 90%;
  }
}
</style>
