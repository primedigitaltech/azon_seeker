<script lang="ts" setup>
import type { Timeline } from '~/components/ProgressReport.vue';
import { useLongTask } from '~/composables/useLongTask';
import { amazon as pageWorker } from '~/logic/page-worker';
import { reviewAsinInput, reviewItems } from '~/logic/storages/amazon';

const { isRunning, startTask } = useLongTask();

const emit = defineEmits<{
  start: [];
  stop: [];
}>();

watch(isRunning, (newVal) => {
  newVal ? emit('start') : emit('stop');
});

const worker = pageWorker.getAmazonPageWorker();
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  worker.stop();
});
worker.channel.on('item-review-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价`,
    time: new Date().toLocaleString(),
    content: `获取到 ${ev.reviews.length} 条评价`,
  });
  updateReviews(ev);
});

const asinInputRef = useTemplateRef('asin-input');

const message = useMessage();

const timelines = ref<Timeline[]>([]);

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
  await worker.runReviewPageTask(asinList, {
    progress: (remains) => {
      reviewAsinInput.value = remains.join('\n');
    },
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

const updateReviews = (params: { asin: string; reviews: AmazonReview[] }) => {
  const { asin, reviews } = params;
  const values = toRaw(reviewItems.value).get(asin) || [];
  const ids = new Set(values.map((item) => item.id));
  for (const review of reviews) {
    ids.has(review.id) || values.push(review);
  }
  values.sort((a, b) => dayjs(b.dateInfo).valueOf() - dayjs(a.dateInfo).valueOf());
  reviewItems.value.delete(asin);
  reviewItems.value.set(asin, values);
};
</script>

<template>
  <div class="review-page-entry">
    <header-title>Amazon Review</header-title>
    <div class="interative-section">
      <ids-input v-model="reviewAsinInput" :disabled="isRunning" ref="asin-input" />
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

<style scoped lang="scss">
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
