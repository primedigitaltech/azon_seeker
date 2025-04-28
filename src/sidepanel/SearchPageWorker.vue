<script setup lang="ts">
import { keywords } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';
import { exportToXLSX } from '~/logic/data-io';
import type { AmazonGoodsLinkItem } from '~/logic/page-worker/types';
import { NButton } from 'naive-ui';
import { itemList as items } from '~/logic/storage';
import type { TableColumn } from 'naive-ui/es/data-table/src/interface';

const message = useMessage();
const worker = pageWorker.useAmazonPageWorker();

const page = reactive({ current: 1, size: 5 });
const resultSearchText = ref('');
const columns: (TableColumn<AmazonGoodsLinkItem> & { hidden?: boolean })[] = [
  {
    title: '排位',
    key: 'rank',
  },
  {
    title: '标题',
    key: 'title',
  },
  {
    title: 'ASIN',
    key: 'asin',
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

const onItemLinksCollected = (ev: { objs: Record<string, unknown>[] }) => {
  const addedRows = ev.objs.map((v, i) => {
    const [asin] = /(?<=\/dp\/)[A-Z0-9]{10}/.exec(v.link as string)!;
    return { ...v, asin, rank: items.value.length + i + 1 } as AmazonGoodsLinkItem;
  });
  items.value = items.value.concat(addedRows);
};

const onCollectStart = async () => {
  if (keywords.value.trim() === '') {
    return;
  }
  message.info('开始收集');
  items.value = [];
  worker.channel.on('error', ({ message: msg }) => {
    message.error(msg);
  });
  worker.channel.on('item-links-collected', onItemLinksCollected);
  await worker.doSearch(keywords.value);
  await worker.wanderSearchPage();
  worker.channel.off('item-links-collected', onItemLinksCollected);
  message.info('完成');
};

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
</script>

<template>
  <main class="search-page-worker">
    <n-space class="app-header">
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
        placeholder="请输入关键词采集信息"
      >
        <template #prefix>
          <n-icon size="20">
            <ion-search />
          </n-icon>
        </template>
      </n-input>
      <n-button type="primary" round size="large" @click="onCollectStart">采集</n-button>
    </n-space>
    <div style="height: 10px"></div>
    <n-card class="result-content-container" title="结果框">
      <template #header-extra>
        <n-space>
          <n-input
            v-model:value="resultSearchText"
            size="small"
            placeholder="输入关键词查询结果"
            round
          />
          <n-button type="primary" tertiary round size="small" @click="items = []">
            <template #icon>
              <ion-trash-outline />
            </template>
          </n-button>
          <n-button type="primary" tertiary round size="small" @click="handleExport">
            <template #icon>
              <ion-download-outline />
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
          :page-sizes="[5, 10, 20]"
          show-size-picker
        />
      </n-space>
    </n-card>
  </main>
</template>

<style lang="scss" scoped>
.search-page-worker {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;

  .app-header {
    margin-top: 100px;
  }

  .search-input-box {
    min-width: 270px;
  }

  .result-content-container {
    width: 90%;
  }
}
</style>
