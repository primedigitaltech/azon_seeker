<script lang="ts" setup>
import type { Timeline } from '~/components/ProgressReport.vue';
import { usePageWorker } from '~/page-worker';
import { reviewAsinInput, reviewWorkerSettings } from '~/storages/amazon';

const worker = usePageWorker('amazon', { objects: ['review'] });
worker.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
});
worker.on('item-review-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价`,
    time: new Date().toLocaleString(),
    content: `获取到 ${ev.reviews.length} 条评价`,
  });
});

const asinInputRef = useTemplateRef('asin-input');

const message = useMessage();

const timelines = ref<Timeline[]>([]);

const launch = async () => {
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
    recent: reviewWorkerSettings.value.recent,
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
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="review-page-entry">
    <header-title>Amazon Review</header-title>
    <div class="interative-section">
      <ids-input v-model="reviewAsinInput" :disabled="worker.isRunning.value" ref="asin-input" />
      <optional-button
        v-if="!worker.isRunning.value"
        round
        size="large"
        type="primary"
        @click="handleStart"
      >
        <template #popover>
          <div class="setting-panel">
            <n-form label-placement="left">
              <n-form-item label="模式:" :feedback-style="{ display: 'none' }">
                <n-radio-group v-model:value="reviewWorkerSettings.recent">
                  <n-radio :value="true" key="Recent" label="Recent" />
                  <n-radio :value="false" key="Top" label="Top" />
                </n-radio-group>
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
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
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

.setting-panel {
  padding: 7px 10px;
}
</style>
