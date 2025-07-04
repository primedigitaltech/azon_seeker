<script lang="ts" setup>
import { useElementSize } from '@vueuse/core';
import { useExcelHelper } from '~/composables/useExcelHelper';
import type { Header } from '~/logic/excel';
import { reviewItems } from '~/storages/amazon';

const props = defineProps<{ asin: string }>();

const message = useMessage();
const excelHelper = useExcelHelper();

const containerRef = useTemplateRef('review-list');
const { height } = useElementSize(containerRef);

const allReviews = reviewItems.value.get(props.asin) || [];

const filter = reactive({
  keywords: '',
  rating: null as string | null,
});

const page = reactive({
  current: 1,
  pageSize: 5,
});

const view = computed(() => {
  const offset = (page.current - 1) * page.pageSize;
  if (offset >= filteredData.value.length && page.current > 1) {
    page.current = 1;
  }
  const data = filteredData.value.slice(offset, offset + page.pageSize);
  const pageCount = ~~(filteredData.value.length / page.pageSize);
  return { data, pageCount, total: filteredData.value.length };
});

const filteredData = computed(() => {
  let data = allReviews;
  if (filter.keywords) {
    data = data.filter((item) => {
      const keywords = filter.keywords.toLowerCase();
      return [
        item.title.toLowerCase(),
        item.content.toLowerCase(),
        item.content.toLowerCase(),
      ].some((s) => s.includes(keywords));
    });
  }
  if (filter.rating) {
    data = data.filter((item) => item.rating === filter.rating);
  }
  return data;
});

const handleClearData = () => {
  reviewItems.value.delete(props.asin);
  allReviews.splice(0, allReviews.length);
  page.current = 1;
};

const headers: Header[] = [
  { prop: 'username', label: '用户名' },
  { prop: 'title', label: '标题' },
  { prop: 'rating', label: '评分' },
  { prop: 'content', label: '内容' },
  { prop: 'dateInfo', label: '日期' },
  {
    prop: 'imageSrc',
    label: '图片链接',
    formatOutputValue: (val?: string[]) => val?.join(';'),
    parseImportValue: (val?: string) => val?.split(';'),
  },
];

const handleImport = async (file: File) => {
  const importedData = (await excelHelper.importFile(file, [headers]))[0].data as AmazonReview[];
  if (importedData.length === 0) {
    return;
  }
  const existingIds = new Set(allReviews.map((review) => review.id));
  const newReviews = importedData.filter((review) => !existingIds.has(review.id));
  if (newReviews.length > 0) {
    allReviews.push(...newReviews);
    allReviews.sort((a, b) => dayjs(b.dateInfo).valueOf() - dayjs(a.dateInfo).valueOf());
    reviewItems.value.delete(props.asin); // Clear existing data for this ASIN
    reviewItems.value.set(props.asin, allReviews);
    page.current = 1; // Reset to first page after import
    message.info(`成功导入 ${file.name} 文件 ${newReviews.length} 条新评论`);
  }
};

const handleExport = async (opt: 'local' | 'cloud') => {
  await excelHelper.exportFile(
    [
      {
        data: allReviews,
        headers,
        name: `${props.asin}Reviews${dayjs().format('YYYY-MM-DD')}.xlsx`,
        imageColumn: '图片链接',
      },
    ],
    { cloud: opt === 'cloud' },
  );
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
            placeholder="输入关键词筛选评论"
          />
        </n-space>
      </div>
      <div class="header-section">
        <n-space justify="end">
          <n-select
            v-model:value="filter.rating"
            style="width: 200px"
            round
            placeholder="选择评分"
            clearable
            :options="
              Array.from({ length: 5 }).map((_, i) => ({
                label: `${i + 1} 星 ${'★'.repeat(i + 1)}`,
                value: `${i + 1}.0 out of 5 stars`,
              }))
            "
          />
          <control-strip @import="handleImport" @clear="handleClearData">
            <template #exporter>
              <export-panel @export-file="handleExport" />
            </template>
          </control-strip>
        </n-space>
      </div>
    </div>
    <n-scrollbar :style="{ maxHeight: `${height * 0.85}px`, minHeight: `${height * 0.85}px` }">
      <div class="review-list-container" :style="{ minHeight: `${height * 0.8}px` }">
        <template v-if="view.data.length > 0" v-for="review in view.data">
          <amazon-review-card :model="review" />
          <div style="height: 7px" />
        </template>
        <template v-else>
          <div class="empty-container">
            <n-icon size="60">
              <solar-cat-linear />
            </n-icon>
            <h3>还没有数据哦</h3>
          </div>
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
        <n-text>共{{ view.total }}条评论</n-text>
      </n-space>
    </div>
  </div>
</template>

<style scoped lang="scss">
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
  border-radius: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  background: #fff;
  padding: 8px 16px;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888888ad;
}
</style>
