<script setup lang="tsx">
import { useCloudExporter } from '~/composables/useCloudExporter';
import type { TableColumn } from '~/components/ResultTable.vue';
import { allReviews } from '~/storages/amazon';

const message = useMessage();
const cloudExporter = useCloudExporter();

const filter = ref<{ keywords?: string; rating?: string }>({});

const columns = computed<TableColumn[]>(() => {
  return [
    {
      title: 'ASIN',
      key: 'asin',
    },
  ];
});

const filteredData = computed(() => {
  return allReviews.value;
});
</script>

<template>
  <div class="result-table">
    <result-table :columns="columns" :records="filteredData"> </result-table>
  </div>
</template>

<style lang="scss" scoped>
.result-table {
  width: 100%;
}
</style>
