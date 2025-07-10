<script setup lang="tsx">
import type { TableColumn } from '~/components/ResultTable.vue';
import { allReviews } from '~/storages/amazon';
import { useExcelHelper } from '~/composables/useExcelHelper';
import type { Header } from '~/logic/excel';

const excelHelper = useExcelHelper();

const filter = ref<{
  keywords: string;
  rating: string | undefined;
  asins: string[];
  dateRange: [number, number] | undefined;
}>({
  keywords: '',
  rating: undefined,
  asins: [],
  dateRange: undefined,
});

const columns = computed<TableColumn[]>(() => {
  return [
    {
      title: 'ASIN',
      key: 'asin',
      minWidth: 120,
    },
    {
      title: 'ID',
      key: 'id',
      hidden: true,
    },
    {
      title: '标题',
      key: 'title',
      minWidth: 200,
      ellipsis: {
        tooltip: { placement: 'top' },
      },
    },
    {
      title: '用户名',
      key: 'username',
      minWidth: 150,
    },
    {
      title: '评分',
      key: 'rating',
      render(row: AmazonReview) {
        return <n-rate readonly size="small" value={Number(row.rating.split('.')[0])} />;
      },
    },
    {
      title: '内容',
      key: 'content',
      minWidth: 500,
      ellipsis: {
        tooltip: { placement: 'top', contentStyle: { maxWidth: '60vw' } },
      },
    },
    {
      title: '日期信息',
      key: 'dateInfo',
      minWidth: 120,
      render(row: AmazonReview) {
        return <span>{dayjs(row.dateInfo).format('YYYY/M/D')}</span>;
      },
    },
  ];
});

const extraHeaders: Header[] = [
  {
    prop: 'imageSrc',
    label: '图片链接',
    formatOutputValue: (val?: string[]) => val?.join(';'),
    parseImportValue: (val?: string) => val?.split(';'),
  },
];

const getHeaders = () => {
  return columns.value
    .map((col: Record<string, any>) => ({ prop: col.key, label: col.title }) as Header)
    .concat(extraHeaders);
};

const filteredData = computed(() => {
  let reviews = toRaw(allReviews.value);
  if (filter.value.rating) {
    reviews = reviews.filter((r) => r.rating === filter.value.rating);
  }
  if (filter.value.keywords) {
    reviews = reviews.filter((r) => {
      return [
        r.content.toLocaleLowerCase(),
        r.title.toLocaleLowerCase(),
        r.username.toLocaleLowerCase(),
      ].some((s) => s.includes(filter.value.keywords.toLocaleLowerCase()));
    });
  }
  if (filter.value.asins.length > 0) {
    reviews = reviews.filter((r) => filter.value.asins.includes(r.asin));
  }
  if (filter.value.dateRange) {
    reviews = reviews.filter((r) => {
      const date = dayjs(r.dateInfo);
      const start = dayjs(filter.value.dateRange![0]);
      const end = dayjs(filter.value.dateRange![1]);
      return date.diff(start, 'date') >= 0 && date.diff(end, 'date') <= 0;
    });
  }
  return reviews;
});

const handleImport = async (file: File) => {
  const [importedData] = await excelHelper.importFile(file, [getHeaders()]);
  allReviews.value = importedData.data as typeof allReviews.value;
};

const handleExport = (opt: 'local' | 'cloud') => {
  excelHelper.exportFile(
    [{ data: filteredData.value, headers: getHeaders(), imageColumn: '图片链接' }],
    {
      cloud: opt === 'cloud',
    },
  );
};

const handleFilterReset = () => {
  filter.value = {
    keywords: '',
    rating: undefined,
    asins: [],
    dateRange: undefined,
  };
};

const handleClear = () => {
  allReviews.value = [];
};
</script>

<template>
  <div class="result-table">
    <result-table :columns="columns" :records="filteredData">
      <template #header>
        <h3 class="header-text">Amazon Reviews</h3>
      </template>
      <template #header-extra>
        <control-strip round @import="handleImport" @clear="handleClear">
          <template #exporter>
            <export-panel @export-file="handleExport" />
          </template>
          <template #filter>
            <div class="filter-panel">
              <div>筛选器</div>
              <n-form :label-width="80" label-align="center" label-placement="left">
                <n-form-item label="评分">
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
                </n-form-item>
                <n-form-item label="关键词">
                  <n-input clearable placeholder="请输入关键词" v-model:value="filter.keywords" />
                </n-form-item>
                <n-form-item label="ASIN">
                  <n-dynamic-tags v-model:value="filter.asins" />
                </n-form-item>
                <n-form-item label="日期范围">
                  <n-date-picker
                    type="daterange"
                    clearable
                    :value="filter.dateRange"
                    @update:value="
                      (newRange) => {
                        if (Array.isArray(newRange)) {
                          filter.dateRange = [newRange[0], newRange[1] + (24 * 3600 * 1000 - 1)];
                        } else {
                          filter.dateRange = newRange;
                        }
                      }
                    "
                  />
                </n-form-item>
              </n-form>
              <n-space justify="end">
                <n-button @click="handleFilterReset">重置</n-button>
              </n-space>
            </div>
          </template>
        </control-strip>
      </template>
    </result-table>
  </div>
</template>

<style lang="scss" scoped>
.result-table {
  width: 100%;
}

.header-text {
  padding: 0px;
  margin: 0px;
}

.filter-panel {
  min-width: 100px;
  max-width: 500px;

  & > div:first-of-type {
    font-size: 20px;
    margin-bottom: 20px;
  }
}
</style>
