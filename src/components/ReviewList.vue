<script lang="ts" setup>
import { useElementSize } from '@vueuse/core';
import type { AmazonReview } from '~/logic/page-worker/types';
import { reviewItems } from '~/logic/storage';

const props = defineProps<{ asin: string }>();

const containerRef = useTemplateRef('review-list');
const { height } = useElementSize(containerRef);

const allReviews = reviewItems.value.get(props.asin) || [];

const filter = reactive({
  keywords: '',
});

const page = reactive({
  current: 1,
  pageSize: 5,
});

const view = computed(() => {
  const offset = (page.current - 1) * page.pageSize;
  const filteredData = filterData(allReviews);
  const data = filteredData.slice(offset, offset + page.pageSize);
  const pageCount = ~~(filteredData.length / page.pageSize);
  return { data, pageCount, total: filteredData.length };
});

const filterData = (data: AmazonReview[]) => {
  let filteredData = data;
  if (filter.keywords) {
    filteredData = data.filter((item) => {
      const keywords = filter.keywords.toLowerCase();
      return (
        item.title.toLowerCase().includes(keywords) ||
        item.content.toLowerCase().includes(keywords) ||
        item.username.toLowerCase().includes(keywords)
      );
    });
  }
  return filteredData;
};
</script>

<template>
  <div class="review-list" ref="review-list">
    <div class="header">
      <div class="header-section">
        <n-space justify="start">
          <n-input
            v-model:value="filter.keywords"
            style="width: 500px"
            round
            placeholder="输入关键词筛选评论"
          />
        </n-space>
      </div>
      <div class="header-section"></div>
    </div>
    <n-scrollbar :style="{ maxHeight: `${height * 0.85}px`, minHeight: `${height * 0.85}px` }">
      <div class="review-list-container" :style="{ minHeight: `${height * 0.8}px` }">
        <template v-for="review in view.data">
          <review-card :model="review" />
          <div style="height: 7px" />
        </template>
      </div>
    </n-scrollbar>
    <div>
      <n-space align="center">
        <n-pagination
          v-model:page="page.current"
          v-model:page-size="page.pageSize"
          :page-count="view.pageCount"
        />
        <n-text>{{ view.total }}条评论</n-text>
      </n-space>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-start;
  min-height: 100%;
  max-height: 100%;

  .header {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .header-section {
      display: flex;
      flex-direction: row;
      align-items: center;
      max-width: 50%;
    }
  }

  & > div:last-child {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
  }
}

.review-list-container {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  background: #fff;
  padding: 16px;
}
</style>
