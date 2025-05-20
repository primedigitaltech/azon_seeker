<script setup lang="ts">
import { keywordsList } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';
import { NButton } from 'naive-ui';
import { searchItems } from '~/logic/storage';

const message = useMessage();
//#region Initial Page Worker
const worker = pageWorker.useAmazonPageWorker();
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
  worker.stop();
  running.value = false;
});
worker.channel.on('item-links-collected', ({ objs }) => {
  timelines.value.push({
    type: 'success',
    title: '检测到数据',
    time: new Date().toLocaleString(),
    content: `成功采集到 ${objs.length} 条数据`,
  });
  searchItems.value = searchItems.value.concat(objs); // Add records
});
//#endregion
const running = ref(false);

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const handleFetchInfoFromPage = async () => {
  if (keywordsList.value.length === 0) {
    return;
  }
  const kws = unref(keywordsList);
  running.value = true;
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: `关键词: ${kws[0]} 数据采集开始`,
    },
  ];
  timelines.value.push();
  await worker.runSearchPageTask(kws, async (remains) => {
    if (remains.length > 0) {
      timelines.value.push({
        type: 'info',
        title: '开始',
        time: new Date().toLocaleString(),
        content: `关键词: ${remains[0]} 数据采集开始`,
      });
      keywordsList.value = remains;
    }
  });
  timelines.value.push({
    type: 'info',
    title: '结束',
    time: new Date().toLocaleString(),
    content: `搜索任务结束`,
  });
  running.value = false;
};

const handleInterrupt = () => {
  if (!running.value) return;
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="search-page-entry">
    <header-title>Search Page</header-title>
    <div class="interactive-section">
      <n-dynamic-input
        :disabled="running"
        v-model:value="keywordsList"
        :min="1"
        :max="10"
        class="search-input-box"
        autosize
        size="large"
        round
        placeholder="请输入关键词采集信息"
      />
      <n-button v-if="!running" type="primary" round size="large" @click="handleFetchInfoFromPage">
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
    <div v-if="running" class="running-tip-section">
      <n-alert title="Warning" type="warning"> 警告，在插件运行期间请勿与浏览器交互。 </n-alert>
    </div>
    <progress-report class="progress-report" :timelines="timelines" />
  </div>
</template>

<style lang="scss" scoped>
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
