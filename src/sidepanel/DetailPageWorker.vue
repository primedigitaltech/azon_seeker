<script setup lang="ts">
import type { FormItemRule, UploadOnChange } from 'naive-ui';
import pageWorkerFactory from '~/logic/page-worker';
import { AmazonDetailItem } from '~/logic/page-worker/types';
import { asinInputText, detailItems } from '~/logic/storage';

const message = useMessage();

const formItemRef = useTemplateRef('detail-form-item');
const formItemRule: FormItemRule = {
  required: true,
  trigger: ['submit', 'blur'],
  message: '请输入格式正确的ASIN',
  validator: () => {
    return asinInputText.value.match(/^[A-Z0-9]{10}((\n|\s|,|;)[A-Z0-9]{10})*\n?$/g) !== null;
  },
};

const timelines = ref<
  {
    type: 'default' | 'error' | 'success' | 'warning' | 'info';
    title: string;
    time: string;
    content: string;
  }[]
>([]);

const running = ref(false);

const worker = pageWorkerFactory.useAmazonPageWorker(); // 获取Page Worker单例
worker.channel.on('error', ({ message: msg }) => {
  timelines.value.push({
    type: 'error',
    title: '错误发生',
    time: new Date().toLocaleString(),
    content: msg,
  });
  message.error(msg);
  running.value = false;
});
worker.channel.on('item-rating-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价信息`,
    time: new Date().toLocaleString(),
    content: `评分： ${ev.rating}；评价数：${ev.ratingCount}`,
  });
  createOrUpdateDetailItem(ev);
});
worker.channel.on('item-category-rank-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}分类排名`,
    time: new Date().toLocaleString(),
    content: [
      ev.category1 ? `#${ev.category1.rank} in ${ev.category1.name}` : '',
      ev.category2 ? `#${ev.category2.rank} in ${ev.category2.name}` : '',
    ].join('\n'),
  });
  createOrUpdateDetailItem(ev);
});
worker.channel.on('item-images-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}图像`,
    time: new Date().toLocaleString(),
    content: `图片数： ${ev.imageUrls!.length}`,
  });
  createOrUpdateDetailItem(ev);
});

const handleImportAsin: UploadOnChange = ({ fileList }) => {
  if (fileList.length > 0) {
    const file = fileList.pop();
    if (file && file.file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === 'string') {
          asinInputText.value = content;
        }
      };
      reader.readAsText(file.file, 'utf-8');
    }
  }
};

const handleExportAsin = () => {
  const blob = new Blob([asinInputText.value], { type: 'text/plain' });
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

const handleFetchInfoFromPage = () => {
  const runTask = async () => {
    const asinList = asinInputText.value.split(/\n|\s|,|;/).filter((item) => item.length > 0);
    running.value = true;
    timelines.value = [
      {
        type: 'info',
        title: '开始',
        time: new Date().toLocaleString(),
        content: '开始数据采集',
      },
    ];
    while (asinList.length > 0) {
      const asin = asinList.shift()!;
      await worker.wanderDetailPage(asin);
      asinInputText.value = asinList.join('\n'); // Update Input Text
    }
    timelines.value.push({
      type: 'info',
      title: '结束',
      time: new Date().toLocaleString(),
      content: '数据采集完成',
    });
    running.value = false;
  };
  formItemRef.value?.validate({
    callback: (errors) => {
      if (errors) {
        return;
      } else {
        runTask();
      }
    },
  });
};

const createOrUpdateDetailItem = (info: AmazonDetailItem) => {
  const targetIndex = detailItems.value.findLastIndex((item) => info.asin === item.asin);
  if (targetIndex > -1) {
    const origin = detailItems.value[targetIndex];
    const updatedItem = { ...origin, ...info };
    detailItems.value.splice(targetIndex, 1, updatedItem);
  } else {
    detailItems.value.push(info);
  }
};
</script>

<template>
  <div class="detail-page-worker">
    <header-menu />
    <div class="title">
      <mdi-cat style="color: black; font-size: 60px" />
      <h1 style="font-size: 30px; color: black">Detail Page</h1>
    </div>
    <div v-if="!running" class="interative-section">
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
      <n-form-item
        ref="detail-form-item"
        label-placement="left"
        :rule="formItemRule"
        style="padding-top: 0px"
      >
        <n-input
          v-model:value="asinInputText"
          placeholder="输入ASINs"
          type="textarea"
          size="large"
        />
      </n-form-item>
      <n-button round size="large" type="primary" @click="handleFetchInfoFromPage">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        开始
      </n-button>
    </div>
    <div v-else class="running-tip-section">
      <n-alert title="Warning" type="warning"> 警告，在插件运行期间请勿与浏览器交互。 </n-alert>
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
    font-size: 60px;
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
    padding: 15px;
    align-items: stretch;
    justify-content: center;
    width: 85%;
    border-radius: 10px;
    border: 1px #00000020 dashed;
    margin: 0 0 10px 0;
  }

  .running-tip-section {
    margin: 0 0 10px 0;
    height: 100px;
    border-radius: 10px;
    cursor: wait;
  }

  .progress-report {
    margin-top: 20px;
    width: 95%;
  }
}
</style>
