<script setup lang="tsx">
import { NButton, NSpace } from 'naive-ui';
import type { TableColumn } from '~/components/ResultTable.vue';
import { useCloudExporter } from '~/composables/useCloudExporter';
import { castRecordsByHeaders, createWorkbook, Header, importFromXLSX } from '~/logic/excel';
import { allItems, reviewItems } from '~/logic/storages/amazon';

const message = useMessage();
const modal = useModal();
const cloudExporter = useCloudExporter();

const defaultFilter = {
  keywords: undefined as string | undefined,
  search: '',
  detailOnly: false,
};
const filter = reactive(defaultFilter);
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
            c.keywords && o.add(c.keywords);
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
  Object.assign(filter, defaultFilter);
};

const columns: TableColumn[] = [
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
                  content: () => <review-preview asin={asin} />,
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

const extraHeaders: Header<AmazonItem>[] = [
  { prop: 'link', label: '商品链接' },
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
  { prop: 'timestamp', label: '获取日期（详情页）' },
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

const reviewHeaders: Header<AmazonReview>[] = [
  { prop: 'asin', label: 'ASIN' },
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

const getItemHeaders = () => {
  return columns
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
  const { search, detailOnly, keywords } = filter;
  let data = toRaw(allItems.value);
  if (search.trim() !== '') {
    data = data.filter((r) => {
      return [r.title, r.asin, r.keywords].some((field) =>
        field?.toLowerCase().includes(search.toLowerCase()),
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
});

const handleLocalExport = async () => {
  const itemHeaders = getItemHeaders();
  const items = toRaw(filteredData.value);
  const asins = new Set(items.map((e) => e.asin));
  const reviews = toRaw(reviewItems.value)
    .entries()
    .filter(([asin]) => asins.has(asin))
    .reduce<(AmazonReview & { asin: string })[]>((a, [asin, reviews]) => {
      a.push(...reviews.map((r) => ({ asin, ...r })));
      return a;
    }, []);

  const wb = createWorkbook();
  const sheet1 = wb.addSheet('items');
  await sheet1.readJson(items, { headers: itemHeaders });
  const sheet2 = wb.addSheet('reviews');
  await sheet2.readJson(reviews, { headers: reviewHeaders });
  await wb.exportFile(`Items ${dayjs().format('YYYY-MM-DD')}.xlsx`);

  message.info('导出完成');
};

const handleCloudExport = async () => {
  message.warning('正在导出，请勿关闭当前页面！', { duration: 2000 });

  const itemHeaders = getItemHeaders();
  const items = toRaw(filteredData.value);
  const asins = new Set(items.map((e) => e.asin));
  const reviews = toRaw(reviewItems.value)
    .entries()
    .filter(([asin]) => asins.has(asin))
    .reduce<(AmazonReview & { asin: string })[]>((a, [asin, reviews]) => {
      a.push(...reviews.map((r) => ({ asin, ...r })));
      return a;
    }, []);
  const mappedData1 = await castRecordsByHeaders(items, itemHeaders);
  const mappedData2 = await castRecordsByHeaders(reviews, reviewHeaders);
  const fragments = [
    { data: mappedData1, imageColumn: ['商品图片链接', 'A+截图'], name: 'items' },
    { data: mappedData2, imageColumn: '图片链接', name: 'reviews' },
  ];
  const filename = await cloudExporter.doExport(fragments);

  filename && message.info(`导出完成`);
};

const handleImport = async (file: File) => {
  const itemHeaders = getItemHeaders();
  const wb = await importFromXLSX(file, { asWorkBook: true });

  const sheet1 = wb.getSheet(0)!;
  const items = await sheet1.toJson<AmazonItem>({ headers: itemHeaders });
  allItems.value = items;

  if (wb.sheetCount > 1) {
    const sheet2 = wb.getSheet(1)!;
    const reviews = await sheet2.toJson<AmazonReview & { asin?: string }>({
      headers: reviewHeaders,
    });
    reviewItems.value = reviews.reduce((m, r) => {
      const asin = r.asin!;
      delete r.asin;
      m.has(asin) || m.set(asin, []);
      const arr = m.get(asin)!;
      arr.push(r);
      return m;
    }, new Map<string, AmazonReview[]>());
  }

  message.info(`成功导入 ${file.name} 文件`);
};

const handleClearData = async () => {
  allItems.value = [];
  reviewItems.value = new Map();
};
</script>

<template>
  <div class="result-table">
    <result-table :columns="columns" :records="filteredData">
      <template #header>
        <n-space>
          <div style="padding-right: 10px">Amazon数据</div>
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
            clearable
            style="min-width: 230px"
          />
          <control-strip round size="small" @clear="handleClearData" @import="handleImport">
            <template #exporter>
              <ul v-if="!cloudExporter.isRunning.value" class="exporter-menu">
                <li @click="handleLocalExport">
                  <n-tooltip :delay="1000" placement="right">
                    <template #trigger>
                      <div class="menu-item">
                        <n-icon><lucide-sheet /></n-icon>
                        <span>本地导出</span>
                      </div>
                    </template>
                    不包含图片
                  </n-tooltip>
                </li>
                <li @click="handleCloudExport">
                  <n-tooltip :delay="1000" placement="right">
                    <template #trigger>
                      <div class="menu-item">
                        <n-icon><ic-outline-cloud /></n-icon>
                        <span>云端导出</span>
                      </div>
                    </template>
                    包含图片
                  </n-tooltip>
                </li>
              </ul>
              <div v-else class="expoter-progress-panel">
                <n-progress
                  type="circle"
                  :percentage="
                    (cloudExporter.progress.current * 100) / cloudExporter.progress.total
                  "
                >
                  <span>
                    {{ cloudExporter.progress.current }}/{{ cloudExporter.progress.total }}
                  </span>
                </n-progress>
                <n-button @click="cloudExporter.stop()">停止</n-button>
              </div>
            </template>
            <template #filter>
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
}

:deep(.filter-switch) {
  font-size: 15px;
}

.exporter-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 15px;

  li {
    padding: 5px 10px;
    cursor: pointer;
    transition: background 0.15s;
    color: #222;
    user-select: none;
    border-radius: 6px;

    &:hover {
      background: #f0f6fa;
      color: #007bff;
    }

    .menu-item {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 5px;
    }
  }
}

.expoter-progress-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  font-size: 18px;
  padding: 10px;
  gap: 15px;
  cursor: wait;
}

.filter-section {
  min-width: 250px;

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
