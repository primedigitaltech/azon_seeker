<script setup lang="tsx">
import type { TableColumn } from '~/components/ResultTable.vue';
import { useCloudExporter } from '~/composables/useCloudExporter';
import { castRecordsByHeaders, exportToXLSX, Header, importFromXLSX } from '~/logic/excel';
import { allItems } from '~/logic/storages/homedepot';

const message = useMessage();
const cloudExporter = useCloudExporter();

const columns: TableColumn[] = [
  {
    title: 'OSMID',
    key: 'OSMID',
  },
  {
    title: '品牌名称',
    key: 'brandName',
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
    key: 'action',
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
  allItems.value = await importFromXLSX<(typeof allItems.value)[0]>(file, { headers: itemHeaders });
  message.info(`成功导入 ${file.name} 文件`);
};

const handleLocalExport = async () => {
  const itemHeaders = getItemHeaders();
  await exportToXLSX(filteredData.value, { headers: itemHeaders });
  message.info(`导出完成`);
};

const handleCloudExport = async () => {
  message.warning('正在导出，请勿关闭当前页面！', { duration: 2000 });
  const itemHeaders = getItemHeaders();
  const mappedData = await castRecordsByHeaders(filteredData.value, itemHeaders);
  const fragments = [{ data: mappedData, imageColumn: '主图链接' }];
  const filename = await cloudExporter.doExport(fragments);
  filename && message.info(`导出完成`);
};
</script>

<template>
  <div class="result-table">
    <result-table :records="filteredData" :columns="columns">
      <template #header>
        <n-space>
          <div style="padding-right: 10px">Homedepot数据</div>
        </n-space>
      </template>
      <template #header-extra>
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
                :percentage="(cloudExporter.progress.current * 100) / cloudExporter.progress.total"
              >
                <span>
                  {{ cloudExporter.progress.current }}/{{ cloudExporter.progress.total }}
                </span>
              </n-progress>
              <n-button @click="cloudExporter.stop()">停止</n-button>
            </div>
          </template>
        </control-strip>
      </template>
    </result-table>
  </div>
</template>

<style scoped lang="scss">
.result-table {
  width: 100%;
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
</style>
