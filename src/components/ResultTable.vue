<script setup lang="ts">
import type { EllipsisProps } from 'naive-ui';

export type TableColumn =
  | {
      title: string;
      key: string;
      minWidth?: number;
      hidden?: boolean;
      ellipsis?: boolean | EllipsisProps;
      render?: (row: any) => VNode;
    }
  | {
      type: 'expand';
      hidden?: boolean;
      expandable: (row: any) => boolean;
      renderExpand: (row: any) => VNode;
    };

const props = withDefaults(
  defineProps<{
    records: Record<string, unknown>[];
    columns: TableColumn[];
    defaultPageSize?: number;
  }>(),
  { defaultPageSize: 10 },
);

const page = reactive({ current: 1, size: props.defaultPageSize });

const itemView = computed(() => {
  const { current, size } = page;
  const data = props.records;
  const pageCount = ~~(data.length / size) + (data.length % size > 0 ? 1 : 0);
  const offset = (current - 1) * size;
  if (data.length > 0 && offset >= data.length) {
    page.current = 1;
  }
  const records = data.slice(offset, offset + size);
  return { records, pageCount, origin: data };
});

function generateUUID() {
  return crypto.randomUUID();
}
</script>

<template>
  <div class="result-table">
    <n-card
      class="result-content-container"
      ref="card"
      header-class="result-table-header"
      content-class="result-table-main-content"
    >
      <template #header><slot name="header" /></template>
      <template #header-extra><slot name="header-extra" /></template>
      <n-empty v-if="itemView.records.length === 0" size="huge">
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
          :row-key="() => `${generateUUID()}`"
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

<style scoped lang="scss">
.result-content-container {
  height: 100%;

  :deep(*) {
    transition-duration: 0ms;
  }

  :deep(.n-card__content:has(.n-empty)) {
    display: flex;
    flex-direction: column;
    height: 100%;
    justify-content: center;
  }
}

.data-pagination {
  display: flex;
  flex-direction: row-reverse;
}
</style>
