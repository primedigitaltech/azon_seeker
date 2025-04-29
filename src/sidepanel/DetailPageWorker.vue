<script setup lang="ts">
import pageWorkerFactory from '~/logic/page-worker';

const inputText = ref('');
const data = ref<Record<string, unknown>>({});
const worker = pageWorkerFactory.useAmazonPageWorker();

onMounted(() => {
  worker.channel.on('item-rating-collected', (ev) => {
    console.log('item-rating-collected', ev);
    data.value = { ...data.value, ...ev };
  });
  worker.channel.on('item-category-rank-collected', (ev) => {
    console.log('item-category-rank-collected', ev);
    data.value = { ...data.value, ...ev };
  });
  worker.channel.on('item-images-collected', (ev) => {
    console.log('item-images-collected', ev);
    data.value = { ...data.value, ...ev };
  });
});

const handleGetInfo = async () => {
  worker.wanderDetailPage(inputText.value);
};
</script>

<template>
  <div class="detail-page-worker">
    <n-form>
      <n-form-item>
        <n-input v-model:value="inputText" />
      </n-form-item>
    </n-form>
    <n-button language="json" @click="handleGetInfo">Get Info</n-button>
    <n-code>{{ data }}</n-code>
  </div>
</template>

<style scoped lang="scss">
.detail-page-worker {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f0f0f0;
}
</style>
