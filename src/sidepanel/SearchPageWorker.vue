<script setup lang="ts">
import { keywords } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';
import type { AmazonGoodsLinkItem } from '~/logic/page-worker/types';
import { NButton } from 'naive-ui';
import { itemList as items } from '~/logic/storage';

const message = useMessage();
const worker = pageWorker.useAmazonPageWorker();
const workerRunning = ref(false);

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const onItemLinksCollected = (ev: { objs: Record<string, unknown>[] }) => {
  timelines.value.push({
    type: 'success',
    title: '检测到数据',
    time: new Date().toLocaleString(),
    content: `成功采集到 ${ev.objs.length} 条数据`,
  });
  const addedRows = ev.objs.map((v, i) => {
    const [asin] = /(?<=\/dp\/)[A-Z0-9]{10}/.exec(v.link as string)!;
    return { ...v, asin, rank: items.value.length + i + 1 } as AmazonGoodsLinkItem;
  });
  items.value = items.value.concat(addedRows);
};

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
  worker.channel.on('error', ({ message: msg }) => {
    timelines.value.push({
      type: 'error',
      title: '错误',
      time: new Date().toLocaleString(),
      content: msg,
    });
    message.error(msg);
  });
  worker.channel.on('item-links-collected', onItemLinksCollected);
  await worker.doSearch(keywords.value);
  await worker.wanderSearchPage();
  worker.channel.off('item-links-collected', onItemLinksCollected);
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
  message.info('停止收集');
};

const openOptionsPage = async () => {
  await browser.runtime.openOptionsPage();
};
</script>

<template>
  <main class="search-page-worker">
    <div class="header-menu">
      <n-button :disabled="workerRunning" class="setting-button" round @click="openOptionsPage">
        <template #icon>
          <n-icon size="20" color="#0f0f0f">
            <stash:search-results />
          </n-icon>
        </template>
        <template #default> 数据 </template>
      </n-button>
    </div>
    <n-space class="app-title">
      <mdi-cat style="font-size: 60px; color: black" />
      <h1>Azon Seeker</h1>
    </n-space>
    <n-space>
      <n-input
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
    <div style="height: 10px"></div>
    <n-card class="progress-report" title="数据获取情况">
      <n-timeline v-if="timelines.length > 0">
        <n-timeline-item
          v-for="(item, index) in timelines"
          :key="index"
          :type="item.type"
          :title="item.title"
          :time="item.time"
        >
          {{ item.content }}
        </n-timeline-item>
      </n-timeline>
      <n-empty v-else size="large">
        <template #icon>
          <n-icon size="50">
            <solar-cat-linear />
          </n-icon>
        </template>
        <template #default>还未开始</template>
      </n-empty>
    </n-card>
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

  .header-menu {
    width: 95%;
    display: flex;
    flex-direction: row-reverse;
    justify-content: flex-start;

    .setting-button {
      opacity: 0.7;
      &:hover {
        opacity: 1;
      }
    }
  }

  .app-title {
    margin-top: 60px;
  }

  .search-input-box {
    min-width: 240px;
  }

  .progress-report {
    width: 95%;
  }
}
</style>
