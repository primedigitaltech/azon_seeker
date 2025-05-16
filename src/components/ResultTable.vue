<script setup lang="ts">
import { NButton, UploadOnChange } from 'naive-ui';
import type { TableColumn } from 'naive-ui/es/data-table/src/interface';
import { exportToXLSX, Header, importFromXLSX } from '~/logic/data-io';
import type { AmazonDetailItem, AmazonItem } from '~/logic/page-worker/types';
import { allItems } from '~/logic/storage';
import DetailDescription from './DetailDescription.vue';

const message = useMessage();

const page = reactive({ current: 1, size: 10 });
const filter = reactive({
  keywords: null as string | null,
  search: '',
  detailOnly: false,
});
const filterFormItems = computed(() => {
  const records = allItems.value;
  return [
    {
      prop: 'keywords',
      label: '关键词',
      type: 'select',
      params: {
        options: [
          ...records.reduce((o, c) => {
            o.add(c.keywords);
            return o;
          }, new Set<string>()),
        ].map((opt) => ({
          label: opt,
          value: opt,
        })),
      },
    },
  ];
});

const onFilterReset = () => {
  Object.assign(filter, {
    keywords: null as string | null,
    search: '',
    detailOnly: false,
  });
};

const columns: (TableColumn<AmazonItem> & { hidden?: boolean })[] = [
  {
    type: 'expand',
    expandable: (row) => row.hasDetail,
    renderExpand(row) {
      return h(DetailDescription, { model: row as AmazonDetailItem }, () => '');
    },
  },
  {
    title: '关键词',
    key: 'keywords',
    minWidth: 120,
  },
  {
    title: '页码',
    key: 'page',
    minWidth: 60,
  },
  {
    title: '排位',
    key: 'rank',
    minWidth: 60,
  },
  {
    title: '标题',
    key: 'title',
    render(row) {
      return h('div', { style: {} }, `${row.title}`);
    },
  },
  {
    title: 'ASIN',
    key: 'asin',
    minWidth: 130,
  },
  {
    title: '封面图',
    key: 'imageSrc',
    hidden: true,
  },
  {
    title: '创建日期',
    key: 'createTime',
    minWidth: 160,
  },
  {
    title: '链接',
    key: 'link',
    render(row) {
      return h(
        NButton,
        {
          type: 'primary',
          text: true,
          size: 'small',
          onClick: async () => {
            await browser.tabs.create({
              active: true,
              url: row.link,
            });
          },
        },
        () => '前往',
      );
    },
  },
];

const itemView = computed<{ records: AmazonItem[]; pageCount: number; origin: AmazonItem[] }>(
  () => {
    const { current, size } = page;
    let data = filterItemData(allItems.value); // Filter Data
    let pageCount = ~~(data.length / size);
    pageCount += data.length % size > 0 ? 1 : 0;
    return { records: data.slice((current - 1) * size, current * size), pageCount, origin: data };
  },
);

const extraHeaders: Header[] = [
  {
    prop: 'hasDetail',
    label: '有详情',
    formatOutputValue: (val: boolean) => (val ? '是' : '否'),
    parseImportValue: (val: string) => val === '是',
  },
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
];

const filterItemData = (data: AmazonItem[]): AmazonItem[] => {
  const { search, detailOnly, keywords } = filter;
  if (search.trim() !== '') {
    data = data.filter((r) => {
      return [r.title, r.asin, r.keywords].some((field) =>
        field.toLowerCase().includes(search.toLowerCase()),
      );
    });
  }
  if (detailOnly) {
    data = data.filter((r) => r.hasDetail);
  }
  if (keywords) {
    data = data.filter((r) => r.keywords === keywords);
  }
  return data;
};

const handleExport = async () => {
  const headers: Header[] = columns
    .reduce(
      (p, v: Record<string, any>) => {
        if ('key' in v && 'title' in v) {
          p.push({ label: v.title, prop: v.key });
        }
        return p;
      },
      [] as { label: string; prop: string }[],
    )
    .concat(extraHeaders);
  const { origin: data } = itemView.value;
  exportToXLSX(data, { headers });
  message.info('导出完成');
};

const handleImport: UploadOnChange = async ({ fileList }) => {
  if (fileList.length !== 1 || fileList[0].file === null) {
    return;
  }
  const file: File = fileList.pop()!.file!;
  const headers: Header[] = columns
    .reduce(
      (p, v: Record<string, any>) => {
        if ('key' in v && 'title' in v) {
          p.push({ label: v.title, prop: v.key });
        }
        return p;
      },
      [] as { label: string; prop: string }[],
    )
    .concat(extraHeaders);
  const importedData = await importFromXLSX<AmazonItem>(file, { headers });
  allItems.value = importedData; // 覆盖原数据
  message.info(`成功导入 ${file.name} 文件 ${importedData.length} 条数据`);
};

const handleClearData = async () => {
  allItems.value = [];
};
</script>

<template>
  <div class="result-table">
    <n-card class="result-content-container">
      <template #header>
        <n-space>
          <div style="padding-right: 10px">结果数据表</div>
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
            size="small"
            placeholder="输入文本过滤结果"
            round
          />
          <n-popconfirm
            placement="bottom"
            @positive-click="handleClearData"
            positive-text="确定"
            negative-text="取消"
          >
            <template #trigger>
              <n-button type="error" tertiary circle size="small">
                <template #icon>
                  <ion-trash-outline />
                </template>
              </n-button>
            </template>
            确认清空所有数据吗？
          </n-popconfirm>
          <n-upload
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            :max="1"
            @change="handleImport"
          >
            <n-button type="primary" tertiary circle size="small">
              <template #icon>
                <gg-import />
              </template>
            </n-button>
          </n-upload>
          <n-button type="primary" tertiary circle size="small" @click="handleExport">
            <template #icon>
              <ion-arrow-up-right-box-outline />
            </template>
          </n-button>
          <n-popover trigger="hover" placement="bottom">
            <template #trigger>
              <n-button type="primary" tertiary circle size="small">
                <template #icon>
                  <ant-design-filter-outlined />
                </template>
              </n-button>
            </template>
            <div class="filter-section">
              <div class="filter-title">筛选器</div>
              <n-form :model="filter" label-placement="left">
                <n-form-item v-for="item in filterFormItems" :label="item.label">
                  <n-select
                    v-if="item.type === 'select'"
                    placeholder=""
                    v-model:value="filter.keywords"
                    clearable
                    :options="item.params.options"
                  />
                </n-form-item>
              </n-form>
              <div class="filter-footer" @click="onFilterReset"><n-button>重置</n-button></div>
            </div>
          </n-popover>
        </n-space>
      </template>
      <n-empty v-if="allItems.length === 0" size="huge" style="padding-top: 40px">
        <template #icon>
          <n-icon size="60">
            <solar-cat-linear />
          </n-icon>
        </template>
        <template #default>
          <h3>还没有数据哦</h3>
        </template>
      </n-empty>
      <n-space vertical v-else>
        <n-data-table
          :row-key="(row: any) => `${row.asin}-${~~(Math.random() * 10000)}`"
          :columns="columns.filter((col) => col.hidden !== true)"
          :data="itemView.records"
        />
        <div class="data-pagination">
          <n-pagination
            v-model:page="page.current"
            v-model:page-size="page.size"
            :page-count="itemView.pageCount"
            :page-sizes="[5, 10, 15, 20, 25]"
            show-size-picker
          />
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<style lang="scss" scoped>
.result-content-container {
  width: 100%;
}

:deep(.filter-switch) {
  font-size: 15px;
}

.data-pagination {
  display: flex;
  flex-direction: row-reverse;
}

.filter-section {
  width: 250px;

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
