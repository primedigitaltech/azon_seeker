<script setup lang="tsx">
import type { TableColumn } from '~/components/ResultTable.vue';
import { useExcelHelper } from '~/composables/useExcelHelper';
import type { Header } from '~/logic/excel';
import { allItems } from '~/storages/homedepot';

const message = useMessage();
const excelHelper = useExcelHelper();

const columns: TableColumn[] = [
  {
    title: 'OSMID',
    key: 'OSMID',
    minWidth: 100,
  },
  {
    title: '品牌名称',
    key: 'brandName',
    minWidth: 120,
  },
  {
    title: '型号信息',
    key: 'modelInfo',
  },
  {
    title: '标题',
    key: 'title',
  },
  {
    title: '价格',
    key: 'price',
    minWidth: 80,
  },
  {
    title: '评分',
    key: 'rate',
    minWidth: 60,
  },
  {
    title: '评论数',
    key: 'reviewCount',
    minWidth: 75,
  },
  {
    title: '商品链接',
    key: 'link',
    hidden: true,
  },
  {
    title: '主图链接',
    key: 'mainImageUrl',
    hidden: true,
  },
  {
    title: '操作',
    key: 'actions',
    render(row: (typeof allItems.value)[0]) {
      return (
        <n-space>
          <n-button
            type="primary"
            text
            onClick={() => {
              browser.tabs.create({
                active: true,
                url: row.link,
              });
            }}
          >
            前往
          </n-button>
        </n-space>
      );
    },
  },
];

const filteredData = computed(() => {
  return allItems.value;
});

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
    .concat([]) as Header[];
};

const handleClearData = () => {
  allItems.value = [];
};

const handleImport = async (file: File) => {
  const itemHeaders = getItemHeaders();
  const [dataFragment] = await excelHelper.importFile(file, [itemHeaders]);
  allItems.value = dataFragment.data as typeof allItems.value;
  message.info(`成功导入 ${file.name} 文件`);
};

const handleExport = async (opt: 'cloud' | 'local') => {
  const itemHeaders = getItemHeaders();
  const fragments = [{ data: filteredData.value, imageColumn: '主图链接', headers: itemHeaders }];
  await excelHelper.exportFile(fragments, { cloud: opt === 'cloud' });
};
</script>

<template>
  <div class="result-table">
    <result-table :records="filteredData" :columns="columns">
      <template #header>
        <n-space align="center">
          <h3 class="header-text">Homedepot 数据</h3>
        </n-space>
      </template>
      <template #header-extra>
        <control-strip round @clear="handleClearData" @import="handleImport">
          <template #exporter>
            <export-panel @export-file="handleExport" />
          </template>
        </control-strip>
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
</style>
