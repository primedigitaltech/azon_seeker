<script setup lang="tsx">
import { NButton, NSpace } from 'naive-ui';
import type { TableColumn } from '~/components/ResultTable.vue';
import { useExcelHelper } from '~/composables/useExcelHelper';
import { Header } from '~/logic/excel';
import { allDetailItems, allItems, itemColumnSettings, reviewItems } from '~/storages/amazon';

const modal = useModal();
const excelHelper = useExcelHelper();

const filter = ref<{
  keywords?: string;
  search?: string;
  detailOnly?: boolean;
  searchDateRange?: [number, number];
  detailDateRange?: [number, number];
}>({});

const onFilterReset = () => {
  filter.value = {};
};

const columns = computed<TableColumn[]>(() => {
  return [
    {
      type: 'expand',
      expandable: (row) => row.hasDetail,
      renderExpand(row) {
        return <amazon-detail-description model={row} />;
      },
    },
    {
      title: '关键词',
      key: 'keywords',
      minWidth: 120,
      hidden: !itemColumnSettings.value.has('keywords'),
    },
    {
      title: '页码',
      key: 'page',
      minWidth: 60,
      hidden: !itemColumnSettings.value.has('page'),
    },
    {
      title: '排位',
      key: 'rank',
      minWidth: 60,
      hidden: !itemColumnSettings.value.has('rank'),
    },
    {
      title: 'ASIN',
      key: 'asin',
      minWidth: 130,
    },
    {
      title: '标题',
      key: 'title',
    },
    {
      title: '价格',
      key: 'price',
      minWidth: 100,
    },
    {
      title: '封面图',
      key: 'imageSrc',
      hidden: true,
    },
    {
      title: '获取日期',
      key: 'createTime',
      minWidth: 160,
      hidden: !itemColumnSettings.value.has('createTime'),
    },
    {
      title: '获取日期（详情页）',
      key: 'timestamp',
      minWidth: 160,
      hidden: !itemColumnSettings.value.has('timestamp'),
    },
    {
      title: '查看',
      key: 'actions',
      minWidth: 100,
      render(row) {
        return (
          <n-space>
            {[
              {
                text: '评论',
                disabled: !reviewItems.value.has(row.asin),
                onClick: () => {
                  const asin = row.asin;
                  modal.create({
                    title: `${asin}评论`,
                    preset: 'card',
                    style: {
                      width: '80vw',
                      height: '85vh',
                    },
                    content: () => <amazon-review-preview asin={asin} />,
                  });
                },
              },
              {
                text: '链接',
                onClick: () => {
                  browser.tabs.create({
                    active: true,
                    url: row.link,
                  });
                },
              },
            ].map(({ text, onClick, disabled }) => (
              <n-button type="primary" text size="small" disabled={disabled} onClick={onClick}>
                {text}
              </n-button>
            ))}
          </n-space>
        );
      },
    },
  ];
});

const extraHeaders: Header<AmazonItem>[] = [
  { prop: 'link', label: '商品链接' },
  {
    prop: 'hasDetail',
    label: '有详情',
    formatOutputValue: (val: boolean) => (val ? '是' : '否'),
    parseImportValue: (val: string) => val === '是',
  },
  { prop: 'broughtInfo', label: '销量信息' },
  { prop: 'rating', label: '评分' },
  { prop: 'ratingCount', label: '评论数' },
  { prop: 'category1.name', label: '大类' },
  { prop: 'category1.rank', label: '大类排行' },
  { prop: 'category2.name', label: '小类' },
  { prop: 'category2.rank', label: '小类排行' },
  {
    prop: 'imageUrls',
    label: '商品图片链接',
    formatOutputValue: (val?: string[]) => val?.join(';'),
    parseImportValue: (val?: string) => val?.split(';'),
  },
  {
    prop: 'aplus',
    label: 'A+截图',
  },
];

const getItemHeaders = () => {
  return columns.value
    .filter((col: Record<string, any>) => col.key !== 'actions')
    .reduce(
      (p, v: Record<string, any>) => {
        if ('key' in v && 'title' in v) {
          p.push({ label: v.title, prop: v.key });
        }
        return p;
      },
      [] as { label: string; prop: string }[],
    )
    .concat(extraHeaders) as Header[];
};

const filteredData = computed(() => {
  const { search, detailOnly, keywords, searchDateRange, detailDateRange } = filter.value;
  let data = toRaw(detailOnly ? allDetailItems.value : allItems.value);
  if (search && search.trim() !== '') {
    data = data.filter((r) => {
      return [r.title, r.asin, r.keywords].some((field) =>
        field?.toLowerCase().includes(search.toLowerCase()),
      );
    });
  }
  if (keywords) {
    data = data.filter((r) => r.keywords === keywords);
  }
  if (searchDateRange) {
    const start = dayjs(searchDateRange[0]);
    const end = dayjs(searchDateRange[1]);
    data = data.filter(
      (r) => dayjs(r.createTime).diff(start) >= 0 && dayjs(r.createTime).diff(end) <= 0,
    );
  }
  if (detailDateRange) {
    const start = dayjs(detailDateRange[0]);
    const end = dayjs(detailDateRange[1]);
    data = data.filter(
      (r) => dayjs(r.createTime).diff(start) >= 0 && dayjs(r.timestamp).diff(end) <= 0,
    );
  }
  return data;
});

const handleExport = async (opt: 'local' | 'cloud') => {
  const headers = getItemHeaders();
  const items = toRaw(filteredData.value);
  const fragments = [
    {
      data: items,
      headers: headers,
      imageColumn: ['A+截图', '商品图片链接'],
      name: 'items',
    },
  ];
  await excelHelper.exportFile(fragments, { cloud: opt === 'cloud' });
};

const handleImport = async (file: File) => {
  const headers = getItemHeaders();
  const [dataFragment] = await excelHelper.importFile(file, [headers]);
  allItems.value = dataFragment.data as typeof allItems.value;
};

const handleClearData = async () => {
  allItems.value = [];
};
</script>

<template>
  <div class="result-table">
    <result-table :columns="columns" :records="filteredData">
      <template #header>
        <n-space align="center">
          <h3 class="header-text">Amazon Items</h3>
          <n-switch size="small" class="filter-switch" v-model:value="filter.detailOnly">
            <template #checked> 详情 </template>
            <template #unchecked> 全部</template>
          </n-switch>
        </n-space>
      </template>
      <template #header-extra>
        <n-space size="small">
          <n-input
            v-model:value="filter.search"
            placeholder="输入文本过滤结果"
            round
            clearable
            style="min-width: 230px"
          />
          <control-strip round @clear="handleClearData" @import="handleImport">
            <template #exporter>
              <export-panel @export-file="handleExport" />
            </template>
            <template #filter>
              <div class="filter-section">
                <div class="filter-title">筛选器</div>
                <n-form
                  :model="filter"
                  label-placement="left"
                  label-align="center"
                  :label-width="95"
                >
                  <n-form-item label="关键词">
                    <n-select
                      placeholder=""
                      v-model:value="filter.keywords"
                      clearable
                      :options="
                          Array.from(allItems.reduce((o, c) => {
                              c.keywords && o.add(c.keywords);
                              return o;
                            }, new Set<string>()),
                          ).map((opt) => ({
                            label: opt,
                            value: opt,
                          }))"
                    />
                  </n-form-item>
                  <n-form-item label="日期(搜索页)">
                    <n-date-picker
                      type="datetimerange"
                      clearable
                      v-model:value="filter.searchDateRange"
                    />
                  </n-form-item>
                  <n-form-item label="日期(详情页)">
                    <n-date-picker
                      type="datetimerange"
                      clearable
                      v-model:value="filter.detailDateRange"
                    />
                  </n-form-item>
                  <n-form-item label="列展示">
                    <n-checkbox-group
                      :value="Array.from(itemColumnSettings)"
                      @update:value="(val: any) => (itemColumnSettings = new Set(val) as any)"
                    >
                      <n-space item-style="display: flex;">
                        <n-checkbox value="keywords" label="关键词" />
                        <n-checkbox value="page" label="页码" />
                        <n-checkbox value="rank" label="排位" />
                        <n-checkbox value="createTime" label="获取日期" />
                        <n-checkbox value="timestamp" label="获取日期（详情）" />
                      </n-space>
                    </n-checkbox-group>
                  </n-form-item>
                </n-form>
                <div class="filter-footer" @click="onFilterReset"><n-button>重置</n-button></div>
              </div>
            </template>
          </control-strip>
        </n-space>
      </template>
    </result-table>
  </div>
</template>

<style scoped lang="scss">
.result-table {
  width: 100%;

  .header-text {
    padding: 0px;
    margin: 0px;
  }
}

:deep(.filter-switch) {
  font-size: 15px;
}

.filter-section {
  max-width: 500px;

  .filter-title {
    font-size: 18px;
    padding: 5px 0 15px 0;
  }

  .filter-footer {
    display: flex;
    flex-direction: row-reverse;
  }
}
</style>
