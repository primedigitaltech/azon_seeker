<script setup lang="ts">
import type { Timeline } from '~/components/ProgressReport.vue';
import { usePageWorker } from '~/page-worker';
import { detailInputText } from '~/storages/lowes';

const idInputRef = useTemplateRef('id-input');

const worker = usePageWorker('lowes', { objects: ['detail'] });
worker.on('detail-item-collected', ({ item }) => {
  timelines.value.push({
    type: 'success',
    title: `信息采集`,
    content: `成功获取到${item.link}的商品信息`,
    time: new Date().toLocaleString(),
  });
});

const timelines = ref<Timeline[]>([]);

const handleStart = async () => {
  idInputRef.value?.validate().then(async (success) => {
    if (success) {
      const ids = detailInputText.value.split(/\n|\s|,|;/).filter((item) => item.length > 0);
      timelines.value = [
        {
          type: 'info',
          title: '开始',
          time: new Date().toLocaleString(),
          content: `开始采集OSMID: ${ids.join(', ')}`,
        },
      ];
      await worker.runDetailPageTask(ids, {
        progress: (remains) => {
          if (remains.length > 0) {
            timelines.value.push({
              type: 'info',
              title: '继续',
              time: new Date().toLocaleString(),
              content: `剩余: ${remains.length}`,
            });
          }
          detailInputText.value = remains.join('\n');
        },
      });
      timelines.value.push({
        type: 'info',
        title: '结束',
        time: new Date().toLocaleString(),
        content: `数据采集完成`,
      });
    }
  });
};

const handleInterrupt = () => {
  worker.stop();
};
</script>

<template>
  <div class="lowes-sidepanel">
    <header-title>Lowes Detail</header-title>
    <div class="interative-section">
      <id-input
        v-model="detailInputText"
        :disabled="worker.isRunning.value"
        ref="id-input"
        :match-pattern="
          /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?(\n(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?)*\n?$/g
        "
        placeholder="输入URL"
        validate-message="请输入格式正确的URL"
      />
      <n-button
        v-if="!worker.isRunning.value"
        type="primary"
        round
        size="large"
        @click="handleStart"
      >
        <n-icon :size="20"><ant-design-thunderbolt-outlined /></n-icon>
        开始
      </n-button>
      <n-button v-else round size="large" type="primary" @click="handleInterrupt">
        <n-icon :size="20"><ant-design-thunderbolt-outlined /></n-icon>
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
.lowes-sidepanel {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
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
