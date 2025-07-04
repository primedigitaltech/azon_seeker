<script setup lang="ts">
import { useExcelHelper } from '~/composables/useExcelHelper';

const excelHelper = useExcelHelper();

const emit = defineEmits<{ exportFile: [opt: 'local' | 'cloud'] }>();
</script>

<template>
  <ul v-if="!excelHelper.isRunning.value" class="exporter-menu">
    <li @click="emit('exportFile', 'local')">
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
    <li @click="emit('exportFile', 'cloud')">
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
      :percentage="(excelHelper.progress.current * 100) / excelHelper.progress.total"
    >
      <span> {{ excelHelper.progress.current }}/{{ excelHelper.progress.total }} </span>
    </n-progress>
    <n-button @click="excelHelper.stop()">停止</n-button>
  </div>
</template>

<style lang="scss" scoped>
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
