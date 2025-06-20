<script setup lang="ts">
import type { Timeline } from '~/components/ProgressReport.vue';
import { useLongTask } from '~/composables/useLongTask';
import { homedepot } from '~/logic/page-worker';
import { detailItems } from '~/logic/storages/homedepot';

const inputText = ref('');
const { isRunning, startTask } = useLongTask();

const worker = homedepot.useHomedepotWorker();
worker.channel.on('detail-item-collected', ({ item }) => {
  timelines.value.push({
    type: 'success',
    title: `成功`,
    content: `成功获取到${item.OSMID}的商品信息`,
    time: new Date().toLocaleString(),
  });
  detailItems.value.set(item.OSMID, item);
});

const timelines = ref<Timeline[]>([]);

const handleStart = () =>
  startTask(async () => {
    timelines.value.push({
      type: 'info',
      title: `开始`,
      content: '任务开始',
      time: new Date().toLocaleString(),
    });
    await worker.runDetailPageTask(inputText.value.split('\n').filter((id) => /\d+/.exec(id)));
    timelines.value.push({
      type: 'info',
      title: `结束`,
      content: '任务完成',
      time: new Date().toLocaleString(),
    });
  });

const handleInterrupt = () => {
  worker.stop();
};
</script>

<template>
  <div class="homedepot-sidepanel">
    <header-title>Homedepot</header-title>
    <div class="interative-section">
      <ids-input
        v-model="inputText"
        :disabled="isRunning"
        ref="asin-input"
        :match-pattern="/^\d+(\n\d+)*\n?$/g"
        placeholder="输入OSMID"
        validate-message="请输入格式正确的OSMID"
      />
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
.homedepot-sidepanel {
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
