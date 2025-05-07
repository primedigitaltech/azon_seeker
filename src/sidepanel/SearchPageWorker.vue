<script setup lang="ts">
import { keywords } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';
import type { AmazonSearchItem } from '~/logic/page-worker/types';
import { NButton } from 'naive-ui';
import { searchItems } from '~/logic/storage';

const message = useMessage();
//#region Initial Page Worker
const worker = pageWorker.useAmazonPageWorker();
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
  worker.stop();
});
worker.channel.on('item-links-collected', ({ objs }) => {
  timelines.value.push({
    type: 'success',
    title: '检测到数据',
    time: new Date().toLocaleString(),
    content: `成功采集到 ${objs.length} 条数据`,
  });
  const addedRows = objs.map<AmazonSearchItem>((v) => {
    return {
      ...v,
      keywords: keywords.value,
    };
  });
  searchItems.value = searchItems.value.concat(addedRows);
});
//#endregion
const workerRunning = ref(false);

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const onCollectStart = async () => {
  workerRunning.value = true;
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: '开始数据采集',
    },
  ];
  if (keywords.value.trim() === '') {
    return;
  }
  //#region start page worker
  await worker.doSearch(keywords.value);
  await worker.wanderSearchPage();
  //#endregion
  timelines.value.push({
    type: 'info',
    title: '结束',
    time: new Date().toLocaleString(),
    content: '数据采集完成',
  });
  workerRunning.value = false;
};

const onCollectStop = async () => {
  workerRunning.value = false;
  worker.stop();
  message.info('停止收集');
};
</script>

<template>
  <main class="search-page-worker">
    <header-menu />
    <n-space class="app-title">
      <mdi-cat style="font-size: 60px; color: black" />
      <h1>Search Page</h1>
    </n-space>
    <div class="interactive-section">
      <n-space>
        <n-input
          :disabled="workerRunning"
          v-model:value="keywords"
          class="search-input-box"
          autosize
          size="large"
          round
          placeholder="请输入关键词采集信息"
        >
          <template #prefix>
            <n-icon size="20">
              <ion-search />
            </n-icon>
          </template>
        </n-input>
        <n-button
          type="primary"
          round
          size="large"
          @click="!workerRunning ? onCollectStart() : onCollectStop()"
        >
          <template #icon>
            <n-icon v-if="!workerRunning" size="20">
              <ant-design-thunderbolt-outlined />
            </n-icon>
            <n-icon v-else size="20">
              <ion-stop-outline />
            </n-icon>
          </template>
        </n-button>
      </n-space>
    </div>
    <div style="height: 10px"></div>
    <progress-report class="progress-report" :timelines="timelines" />
  </main>
</template>

<style lang="scss" scoped>
.search-page-worker {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;

  .app-title {
    margin-top: 60px;
  }

  .interactive-section {
    padding: 10px 15px;
    border-radius: 10px;
    border: 1px #00000020 dashed;

    .search-input-box {
      min-width: 240px;
    }
  }

  .progress-report {
    width: 90%;
  }
}
</style>
