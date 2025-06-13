<script setup lang="ts">
import { homedepot } from '~/logic/page-worker';

const inputText = ref('');
const output = ref(undefined);

const worker = homedepot.useHomedepotWorker();
worker.channel.on('detail-item-collected', ({ item }) => {
  output.value = item;
});

const handleStart = () => {
  worker.runDetailPageTask(inputText.value.split('\n').filter((id) => /\d+/.exec(id)));
};
</script>

<template>
  <div class="homedepot-sidepanel">
    <h3>Hello World!</h3>
    <n-input type="textarea" v-model:value="inputText" />
    <n-button @click="handleStart">Test!</n-button>
    <n-code word-wrap :code="JSON.stringify(output)" />
  </div>
</template>

<style lang="scss" scoped>
.homedepot-sidepanel {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
