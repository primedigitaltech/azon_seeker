<script setup lang="ts">
import type { Timeline } from '~/components/ProgressReport.vue';
import { usePageWorker } from '~/page-worker';
import { detailAsinInput, detailWorkerSettings } from '~/storages/amazon';

const message = useMessage();

const timelines = ref<Timeline[]>([]);

const asinInputRef = useTemplateRef('asin-input');

//#region Page Worker 初始化Code
const worker = usePageWorker('amazon', { objects: ['detail'] });
worker.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
});
worker.on('item-base-info-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}基本信息`,
    time: new Date().toLocaleString(),
    content: `标题： ${ev.title}；价格：${ev.price}; 评分: ${ev.rating}; 评论数: ${ev.ratingCount}`,
  });
});
worker.on('item-category-rank-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}分类排名`,
    time: new Date().toLocaleString(),
    content: [
      ev.category1 ? `#${ev.category1.rank} in ${ev.category1.name}` : '',
      ev.category2 ? `#${ev.category2.rank} in ${ev.category2.name}` : '',
    ].join('\n'),
  });
});
worker.on('item-images-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}图像`,
    time: new Date().toLocaleString(),
    content: `图片数： ${ev.imageUrls!.length}`,
  });
});
// worker.on('item-top-reviews-collected', (ev) => {
//   timelines.value.push({
//     type: 'success',
//     title: `商品${ev.asin}精选评论`,
//     time: new Date().toLocaleString(),
//     content: `精选评论数： ${ev.topReviews!.length}`,
//   });
// });
worker.on('item-aplus-screenshot-collect', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}的A+截图`,
    time: new Date().toLocaleString(),
    content: `获取到A+截图`,
  });
});
worker.on('item-extra-info-collect', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}额外信息`,
    time: new Date().toLocaleString(),
    content: `获取商品的额外信息`,
  });
});
//#endregion

const launch = async () => {
  const asinList = detailAsinInput.value.split(/\n|\s|,|;/).filter((item) => item.length > 0);
  timelines.value = [
    {
      type: 'info',
      title: '开始',
      time: new Date().toLocaleString(),
      content: '开始数据采集',
    },
  ];
  await worker.runDetailPageTask(asinList, {
    progress: (remains) => {
      detailAsinInput.value = remains.join('\n');
    },
    aplus: detailWorkerSettings.value.aplus,
    extra: detailWorkerSettings.value.extra,
  });
  timelines.value.push({
    type: 'info',
    title: '结束',
    time: new Date().toLocaleString(),
    content: '数据采集完成',
  });
};

const handleStart = () => {
  asinInputRef.value?.validate().then(async (success) => success && launch());
};

const handleInterrupt = () => {
  if (!worker.isRunning.value) return;
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="detail-page-entry">
    <header-title>Amazon Detail</header-title>
    <div class="interative-section">
      <id-input v-model="detailAsinInput" :disabled="worker.isRunning.value" ref="asin-input" />
      <optional-button
        v-if="!worker.isRunning.value"
        round
        size="large"
        type="primary"
        @click="handleStart"
      >
        <template #popover>
          <div class="setting-panel">
            <n-form
              label-placement="left"
              :label-width="60"
              label-align="center"
              :show-feedback="false"
            >
              <n-form-item label="Aplus:">
                <n-switch v-model:value="detailWorkerSettings.aplus" />
              </n-form-item>
              <n-form-item label="Extra:">
                <n-switch v-model:value="detailWorkerSettings.extra" />
              </n-form-item>
            </n-form>
          </div>
        </template>
        <n-icon :size="20">
          <ant-design-thunderbolt-outlined />
        </n-icon>
        开始
      </optional-button>
      <n-button v-else round size="large" type="primary" @click="handleInterrupt">
        <n-icon :size="20">
          <ant-design-thunderbolt-outlined />
        </n-icon>
        停止
      </n-button>
    </div>
    <div v-if="worker.isRunning.value" class="running-tip-section">
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

.setting-panel {
  padding: 7px 5px;
}
</style>
