<script setup lang="ts">
import { keywords } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';

const onSearch = async () => {
  if (keywords.value.trim() === '') {
    return;
  }
  const worker = pageWorker.createAmazonPageWorker();
  await worker.doSearch(keywords.value);
  await worker.wanderSearchList();
};
</script>

<template>
  <main class="side-panel">
    <n-space>
      <mdi-cat style="font-size: 60px; color: black" />
      <h1>Azon Seeker</h1>
    </n-space>
    <n-space>
      <n-input
        v-model:value="keywords"
        class="search-input-box"
        autosize
        size="large"
        round
        placeholder="请输入关键词"
      />
      <n-button round size="large" @click="onSearch">搜索</n-button>
    </n-space>
    <div style="height: 10px"></div>
    <n-card class="result-content-container" title="结果框">
      <n-empty description="还没有结果哦">
        <template #icon>
          <n-icon :size="50">
            <solar-cat-linear />
          </n-icon>
        </template>
      </n-empty>
    </n-card>
  </main>
</template>

<style lang="scss" scoped>
.side-panel {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;

  .search-input-box {
    min-width: 270px;
  }

  .result-content-container {
    width: 90%;
  }
}
</style>
