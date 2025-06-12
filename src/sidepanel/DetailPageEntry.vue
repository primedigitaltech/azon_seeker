<script setup lang="ts">
import { useLongTask } from '~/composables/useLongTask';
import { amazon as pageWorker } from '~/logic/page-worker';
import { AmazonDetailItem } from '~/logic/page-worker/types';
import { detailAsinInput, detailItems } from '~/logic/storage';

const message = useMessage();

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const { isRunning, startTask } = useLongTask();

const emit = defineEmits<{
  start: [];
  stop: [];
}>();

watch(isRunning, (newVal) => {
  newVal ? emit('start') : emit('stop');
});

const asinInputRef = useTemplateRef('asin-input');

//#region Page Worker 初始化Code
const worker = pageWorker.useAmazonPageWorker(); // 获取Page Worker单例
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
  worker.stop();
});
worker.channel.on('item-base-info-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}基本信息`,
    time: new Date().toLocaleString(),
    content: `标题： ${ev.title}；价格：${ev.price}`,
  });
  updateDetailItems(ev);
});
worker.channel.on('item-rating-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价信息`,
    time: new Date().toLocaleString(),
    content: `评分： ${ev.rating}；评价数：${ev.ratingCount}`,
  });
  updateDetailItems(ev);
});
worker.channel.on('item-category-rank-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}分类排名`,
    time: new Date().toLocaleString(),
    content: [
      ev.category1 ? `#${ev.category1.rank} in ${ev.category1.name}` : '',
      ev.category2 ? `#${ev.category2.rank} in ${ev.category2.name}` : '',
    ].join('\n'),
  });
  updateDetailItems(ev);
});
worker.channel.on('item-images-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}图像`,
    time: new Date().toLocaleString(),
    content: `图片数： ${ev.imageUrls!.length}`,
  });
  updateDetailItems(ev);
});
worker.channel.on('item-top-reviews-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}精选评论`,
    time: new Date().toLocaleString(),
    content: `精选评论数： ${ev.topReviews!.length}`,
  });
  updateDetailItems(ev);
});
const updateDetailItems = (row: { asin: string } & Partial<AmazonDetailItem>) => {
  const asin = row.asin;
  if (detailItems.value.has(row.asin)) {
    const origin = detailItems.value.get(row.asin);
    detailItems.value.set(asin, { ...origin, ...row } as AmazonDetailItem);
  } else {
    detailItems.value.set(asin, row as AmazonDetailItem);
  }
};
//#endregion

const task = async () => {
  const asinList = detailAsinInput.value.split(/\n|\s|,|;/).filter((item) => item.length > 0);
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: '开始数据采集',
    },
  ];
  await worker.runDetaiPageTask(asinList, async (remains) => {
    detailAsinInput.value = remains.join('\n');
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
  if (!isRunning.value) return;
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="detail-page-entry">
    <header-title>Detail Page</header-title>
    <div class="interative-section">
      <asins-input v-model="detailAsinInput" :disabled="isRunning" ref="asin-input" />
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
.detail-page-entry {
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
  margin: 10px 0 0 0;
  height: 100px;
  border-radius: 10px;
  cursor: wait;
}

.progress-report {
  margin-top: 10px;
  width: 95%;
}
</style>
