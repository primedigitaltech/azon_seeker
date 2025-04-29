<script setup lang="ts">
import { NButton, UploadOnChange } from 'naive-ui';
import type { TableColumn } from 'naive-ui/es/data-table/src/interface';
import { exportToXLSX, importFromXLSX } from '~/logic/data-io';
import type { AmazonGoodsLinkItem } from '~/logic/page-worker/types';
import { itemList as items } from '~/logic/storage';

const message = useMessage();

const page = reactive({ current: 1, size: 10 });
const resultSearchText = ref('');
const columns: (TableColumn<AmazonGoodsLinkItem> & { hidden?: boolean })[] = [
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
    minWidth: 120,
  },
  {
    title: '图片',
    key: 'imageSrc',
    hidden: true,
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
            const tab = await browser.tabs
              .query({
                active: true,
                currentWindow: true,
              })
              .then((tabs) => tabs[0]);
            if (tab) {
              await browser.tabs.update(tab.id, {
                url: row.link,
              });
            }
          },
        },
        () => '前往',
      );
    },
  },
];

const itemView = computed(() => {
  const { current, size } = page;
  const searchText = resultSearchText.value;
  let data = items.value;
  if (searchText.trim() !== '') {
    data = data.filter(
      (r) =>
        r.title.toLowerCase().includes(searchText.toLowerCase()) ||
        r.asin.toLowerCase().includes(searchText.toLowerCase()),
    );
  }
  let pageCount = ~~(data.length / size);
  pageCount += data.length % size > 0 ? 1 : 0;
  data = data.slice((current - 1) * size, current * size);
  return { data, pageCount };
});

const handleExport = async () => {
  const headers = columns.reduce(
    (p, v: Record<string, any>) => {
      if ('key' in v && 'title' in v) {
        p.push({ label: v.title, prop: v.key });
      }
      return p;
    },
    [] as { label: string; prop: string }[],
  );
  exportToXLSX(items.value, { headers });
  message.info('导出完成');
};

const handleImport: UploadOnChange = async ({ fileList }) => {
  if (fileList.length > 0) {
    const file = fileList.pop();
    if (file && file.file) {
      const headers = columns.reduce(
        (p, v: Record<string, any>) => {
          if ('key' in v && 'title' in v) {
            p.push({ label: v.title, prop: v.key });
          }
          return p;
        },
        [] as { label: string; prop: string }[],
      );
      const importedData = await importFromXLSX<AmazonGoodsLinkItem>(file.file, { headers });
      items.value = importedData; // 覆盖原数据
      message.info(`成功导入 ${file?.file?.name} 文件 ${importedData.length} 条数据`);
    }
  }
};
</script>

<template>
  <div class="result-table">
    <n-card class="result-content-container" title="结果框">
      <template #header-extra>
        <n-space>
          <n-input
            v-model:value="resultSearchText"
            size="small"
            placeholder="输入关键词查询结果"
            round
          />
          <n-popconfirm @positive-click="items = []" positive-text="确定" negative-text="取消">
            <template #trigger>
              <n-button type="primary" tertiary round size="small">
                <template #icon>
                  <ion-trash-outline />
                </template>
              </n-button>
            </template>
            确认清空所有数据吗？
          </n-popconfirm>
          <n-upload
            accept="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            @change="handleImport"
          >
            <n-button type="primary" tertiary round size="small">
              <template #icon>
                <gg-import />
              </template>
            </n-button>
          </n-upload>
          <n-button type="primary" tertiary round size="small" @click="handleExport">
            <template #icon>
              <ion-arrow-up-right-box-outline />
            </template>
          </n-button>
        </n-space>
      </template>
      <n-empty v-if="items.length === 0" size="huge" style="padding-top: 40px">
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
          :columns="columns.filter((col) => col.hidden !== true)"
          :data="itemView.data"
        />
        <n-pagination
          v-model:page="page.current"
          v-model:page-size="page.size"
          :page-count="itemView.pageCount"
          :page-sizes="[5, 10, 15, 20, 25]"
          show-size-picker
        />
      </n-space>
    </n-card>
  </div>
</template>

<style lang="scss" scoped>
.result-content-container {
  width: 100%;
}
</style>
