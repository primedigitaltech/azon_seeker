<script setup lang="ts">
import { keywords } from '~/logic/storage';
import pageWorker from '~/logic/page-worker';
import type { AmazonGoodsLinkItem } from '~/logic/page-worker/types';
import { NButton, type DataTableColumns } from 'naive-ui';

const message = useMessage();
const worker = pageWorker.createAmazonPageWorker();

type TableData = AmazonGoodsLinkItem & { rank: number };

const items = ref<AmazonGoodsLinkItem[]>([]);
const page = reactive({ current: 1, size: 5 });
const columns: DataTableColumns<TableData> = [
  {
    title: '排位',
    key: 'rank',
  },
  {
    title: '标题',
    key: 'title',
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
              .then((ts) => ts.pop());
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
  return items.value
    .slice((current - 1) * size, current * size)
    .map((v, i) => ({ ...v, rank: 1 + (current - 1) * size + i }));
});

onMounted(() => {
  worker.channel.on('item-links-collected', (ev) => {
    items.value = items.value.concat(ev.objs);
  });
});

const onCollect = async () => {
  if (keywords.value.trim() === '') {
    return;
  }
  message.info('开始收集');
  worker.channel.on('error', ({ message: msg }) => {
    message.error(msg);
  });
  await worker.doSearch(keywords.value);
  await worker.wanderSearchList();
  message.info('完成');
};
</script>

<template>
  <main class="side-panel">
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
        placeholder="请输入关键词"
      />
      <n-button type="primary" round size="large" @click="onCollect">采集</n-button>
    </n-space>
    <div style="height: 10px"></div>
    <n-card class="result-content-container" title="结果框">
      <n-empty v-if="items.length === 0" description="还没有结果哦">
        <template #icon>
          <n-icon :size="50">
            <solar-cat-linear />
          </n-icon>
        </template>
      </n-empty>
      <n-space vertical v-else>
        <n-data-table :columns="columns" :data="itemView" />
        <n-pagination
          v-model:page="page.current"
          v-model:page-size="page.size"
          :page-count="~~(items.length / page.size) + 1"
          :page-sizes="[5, 10, 20]"
          show-size-picker
        />
      </n-space>
    </n-card>
  </main>
</template>

<style lang="scss" scoped>
.side-panel {
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
