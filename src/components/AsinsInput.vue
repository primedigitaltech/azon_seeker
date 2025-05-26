<script setup lang="ts">
import { useFileDialog } from '@vueuse/core';
import type { FormItemRule } from 'naive-ui';

withDefaults(
  defineProps<{
    disabled?: boolean;
  }>(),
  {
    disabled: false,
  },
);

const modelValue = defineModel<string>({ required: true });

const message = useMessage();

const formItemRef = useTemplateRef('detail-form-item');
const formItemRule: FormItemRule = {
  required: true,
  trigger: ['submit', 'blur'],
  message: '请输入格式正确的ASIN',
  validator: () => {
    return modelValue.value.match(/^[A-Z0-9]{10}((\n|\s|,|;)[A-Z0-9]{10})*\n?$/g) !== null;
  },
};

const fileDialog = useFileDialog({ accept: '.txt', multiple: false });
fileDialog.onChange((fileList) => {
  const file = fileList?.item(0);
  file && handleImportAsin(file);
  fileDialog.reset();
});

const handleImportAsin = (file: File) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result;
    if (typeof content === 'string') {
      modelValue.value = content;
    }
  };
  reader.readAsText(file, 'utf-8');
};

const handleExportAsin = () => {
  const blob = new Blob([modelValue.value], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const filename = `asin-${new Date().toISOString()}.txt`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  message.info('导出完成');
};

defineExpose({
  validate: async () =>
    new Promise<boolean>((resolve) => {
      formItemRef.value?.validate({
        trigger: 'submit',
        callback: (errors) => {
          if (errors) {
            resolve(false);
          } else {
            resolve(true);
          }
        },
      });
    }),
});
</script>

<template>
  <div class="asin-input">
    <n-space>
      <n-button @click="fileDialog.open()" :disabled="disabled" round size="small">
        <template #icon>
          <gg-import />
        </template>
        导入
      </n-button>
      <n-button :disabled="disabled" @click="handleExportAsin" round size="small">
        <template #icon>
          <ion-arrow-up-right-box-outline />
        </template>
        导出
      </n-button>
    </n-space>
    <div style="height: 7px" />
    <n-form-item ref="detail-form-item" label-placement="left" :rule="formItemRule">
      <n-input
        :disabled="disabled"
        v-model:value="modelValue"
        placeholder="输入ASINs"
        type="textarea"
        size="large"
      />
    </n-form-item>
  </div>
</template>

<style lang="scss">
.asin-input {
  width: 100%;
  display: flex;
  flex-direction: column;
}
</style>
