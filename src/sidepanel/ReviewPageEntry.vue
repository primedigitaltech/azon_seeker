<script lang="ts" setup>
import { useLongTask } from '~/composables/useLongTask';
import pageWorker from '~/logic/page-worker';
import { reviewAsinInput } from '~/logic/storage';

const worker = pageWorker.useAmazonPageWorker();
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
});
worker.channel.on('item-review-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价`,
    time: new Date().toLocaleString(),
    content: `获取到 ${ev.reviews.length} 条评价`,
  });
});

const { isRunning, startTask } = useLongTask();

const asinInputRef = useTemplateRef('asin-input');

const message = useMessage();

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const task = async () => {
  const asinList = reviewAsinInput.value.split(/\n|\s|,|;/).filter((item) => item.length > 0);
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: '开始数据采集',
    },
  ];
  await worker.runReviewPageTask(asinList, async (remains) => {
    reviewAsinInput.value = remains.join('\n');
  });
  timelines.value.push({
    type: 'info',
    title: '结束',
    time: new Date().toLocaleString(),
    content: '数据采集完成',
  });
};

const handleStart = () => {
  asinInputRef.value?.validate().then(async (success) => success && startTask(task));
};

const handleInterrupt = () => {
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="review-page-entry">
    <header-title>Review Page</header-title>
    <div class="interative-section">
      <asins-input v-model="reviewAsinInput" :disabled="isRunning" ref="asin-input" />
      <n-button v-if="!isRunning" round size="large" type="primary" @click="handleStart">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        开始
      </n-button>
      <n-button v-else round size="large" type="primary" @click="handleInterrupt">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        停止
      </n-button>
    </div>
    <div v-if="isRunning" class="running-tip-section">
      <n-alert title="Warning" type="warning"> 警告，在插件运行期间请勿与浏览器交互。 </n-alert>
    </div>
    <progress-report class="progress-report" :timelines="timelines" />
  </div>
</template>

<style lang="scss" scoped>
.review-page-entry {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.interative-section {
  display: flex;
  flex-direction: column;
  padding: 15px;
  align-items: stretch;
  justify-content: center;
  width: 85%;
  border-radius: 10px;
  border: 1px #00000020 dashed;
  margin: 0 0 10px 0;
}

.running-tip-section {
  border-radius: 10px;
  cursor: wait;
}

.progress-report {
  width: 90%;
}
</style>
