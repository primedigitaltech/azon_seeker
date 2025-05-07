<script setup lang="ts">
import type { FormRules, UploadOnChange } from 'naive-ui';
import pageWorkerFactory from '~/logic/page-worker';
import { detailItems } from '~/logic/storage';

const message = useMessage();

const formItem = reactive({ asin: '' });
const formRef = useTemplateRef('detail-form');
const formRules: FormRules = {
  asin: [
    {
      required: true,
      trigger: ['submit', 'blur'],
      message: '请输入格式正确的ASIN',
      validator: (_rule, val: string) => {
        return (
          typeof val === 'string' &&
          val.match(/^[A-Z0-9]{10}((\n|\s|,|;)[A-Z0-9]{10})*\n?$/g) !== null
        );
      },
    },
  ],
};

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const worker = pageWorkerFactory.useAmazonPageWorker(); // 获取Page Worker单例
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
});
worker.channel.on('item-rating-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品: ${ev.asin}`,
    time: new Date().toLocaleString(),
    content: `评分： ${ev.rating}；评价数：${ev.ratingCount}`,
  });
  detailItems.value[ev.asin] = { ...detailItems.value[ev.asin], ...ev };
});
worker.channel.on('item-category-rank-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品: ${ev.asin}`,
    time: new Date().toLocaleString(),
    content: [
      ev.category1 ? `#${ev.category1.rank} in ${ev.category1.name}` : '',
      ev.category2 ? `#${ev.category2.rank} in ${ev.category2.name}` : '',
    ].join('\n'),
  });
  detailItems.value[ev.asin] = { ...detailItems.value[ev.asin], ...ev };
});
worker.channel.on('item-images-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品: ${ev.asin}`,
    time: new Date().toLocaleString(),
    content: `图片数： ${ev.imageUrls.length}`,
  });
  detailItems.value[ev.asin] = { ...detailItems.value[ev.asin], ...ev };
});

const handleImportAsin: UploadOnChange = ({ fileList }) => {
  if (fileList.length > 0) {
    const file = fileList.pop();
    if (file && file.file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          formItem.asin = content;
        }
      };
      reader.readAsText(file.file, 'utf-8');
    }
  }
};

const handleExportAsin = () => {
  const blob = new Blob([formItem.asin], { type: 'text/plain' });
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

const handleGetInfo = () => {
  formRef.value?.validate(async (errors) => {
    if (errors) {
      message.error('格式错误，请检查输入');
      return;
    }
    const asinList = formItem.asin.split(/\n|\s|,|;/).filter((item) => item.length > 0);
    if (asinList.length > 0) {
      timelines.value = [
        {
          type: 'info',
          title: '开始',
          time: new Date().toLocaleString(),
          content: '开始数据采集',
        },
      ];
      for (const asin of asinList) {
        await worker.wanderDetailPage(asin);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      timelines.value.push({
        type: 'info',
        title: '结束',
        time: new Date().toLocaleString(),
        content: '数据采集完成',
      });
    }
  });
};
</script>

<template>
  <div class="detail-page-worker">
    <header-menu />
    <div class="title">
      <n-icon :size="60"> <mdi-cat style="color: black" /> </n-icon>
      <h1 style="font-size: 30px; color: black">Detail Page</h1>
    </div>
    <div class="interative-section">
      <n-space>
        <n-upload @change="handleImportAsin" accept=".txt" :max="1">
          <n-button round size="small">
            <template #icon>
              <gg-import />
            </template>
            导入
          </n-button>
        </n-upload>
        <n-button @click="handleExportAsin" round size="small">
          <template #icon>
            <ion-arrow-up-right-box-outline />
          </template>
          导出
        </n-button>
      </n-space>
      <n-form :rules="formRules" :model="formItem" ref="detail-form" label-placement="left">
        <n-form-item style="padding-top: 0px" path="asin">
          <n-input
            v-model:value="formItem.asin"
            placeholder="输入ASINs"
            type="textarea"
            size="large"
          />
        </n-form-item>
      </n-form>
      <n-button class="start-button" round size="large" type="primary" @click="handleGetInfo">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        开始
      </n-button>
    </div>
    <progress-report class="progress-report" :timelines="timelines" />
  </div>
</template>

<style scoped lang="scss">
.detail-page-worker {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

  .title {
    margin: 20px 0 30px 0;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    width: 100%;
    gap: 10px;
  }

  .interative-section {
    display: flex;
    flex-direction: column;
    width: 85%;
    padding: 15px 15px;
    border-radius: 10px;
    border: 1px #00000020 dashed;
    margin: 0 0 10px 0;
  }

  .progress-report {
    margin-top: 20px;
    width: 95%;
  }
}
</style>
