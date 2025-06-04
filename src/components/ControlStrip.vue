<script lang="ts" setup>
import { useFileDialog } from '@vueuse/core';

withDefaults(defineProps<{ size?: 'small' | 'medium' | 'large'; round?: boolean }>(), {
  size: 'medium',
  round: false,
});

const fileDialog = useFileDialog({
  accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  multiple: false,
});
fileDialog.onChange((files) => {
  const file = files?.item(0);
  file && emit('import', file);
  fileDialog.reset();
});

const emit = defineEmits<{
  clear: [];
  import: [file: File];
  export: [];
}>();
</script>

<template>
  <div class="control-strip">
    <n-button-group class="button-group">
      <n-popconfirm
        placement="bottom"
        @positive-click="emit('clear')"
        positive-text="确定"
        negative-text="取消"
      >
        <template #trigger>
          <n-button type="default" ghost :round="round" :size="size">
            <template #icon>
              <ion-trash-outline />
            </template>
            清空
          </n-button>
        </template>
        确认清空所有数据吗？
      </n-popconfirm>
      <n-button type="default" ghost :round="round" @click="fileDialog.open()" :size="size">
        <template #icon>
          <gg-import />
        </template>
        导入
      </n-button>
      <n-button type="default" ghost :round="round" :size="size" @click="emit('export')">
        <template #icon>
          <ion-arrow-up-right-box-outline />
        </template>
        导出
      </n-button>
      <n-popover v-if="$slots.filter" trigger="hover" placement="bottom">
        <template #trigger>
          <n-button type="default" ghost :round="round" :size="size">
            <template #icon>
              <ant-design-filter-outlined />
            </template>
            过滤
          </n-button>
        </template>
        <slot name="filter" />
      </n-popover>
    </n-button-group>
  </div>
</template>
