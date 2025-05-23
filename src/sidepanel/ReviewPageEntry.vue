<script lang="ts" setup>
import pageWorker from '~/logic/page-worker';

const worker = pageWorker.useAmazonPageWorker();
worker.channel.on('item-review-collected', (ev) => {
  output.value = ev;
});

const inputText = ref('');
const output = ref<any>(null);

const handleStart = () => {
  worker.runReviewPageTask(inputText.value.split('\n').filter((t) => /^[A-Z0-9]{10}/.exec(t)));
};
</script>

<template>
  <div class="review-page-entry">
    <header-title>Review Page</header-title>
    <n-input type="textarea" v-model:value="inputText" />
    <n-button @click="handleStart">测试</n-button>
    <div>{{ output }}</div>
  </div>
</template>

<style lang="scss" scoped>
.review-page-entry {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
}
</style>
