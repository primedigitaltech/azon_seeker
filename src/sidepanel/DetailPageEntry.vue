<script setup lang="ts">
import type { FormItemRule, UploadOnChange } from 'naive-ui';
import pageWorker from '~/logic/page-worker';
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

//#region Page Worker 初始化Code
const worker = pageWorker.useAmazonPageWorker(); // 获取Page Worker单例
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
worker.channel.on('item-base-info-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}基本信息`,
    time: new Date().toLocaleString(),
    content: `标题： ${ev.title}；价格：${ev.price}`,
  });
  updateDetailItems(ev);
});
worker.channel.on('item-rating-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}评价信息`,
    time: new Date().toLocaleString(),
    content: `评分： ${ev.rating}；评价数：${ev.ratingCount}`,
  });
  updateDetailItems(ev);
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
  updateDetailItems(ev);
});
worker.channel.on('item-images-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}图像`,
    time: new Date().toLocaleString(),
    content: `图片数： ${ev.imageUrls!.length}`,
  });
  updateDetailItems(ev);
});
worker.channel.on('item-top-reviews-collected', (ev) => {
  timelines.value.push({
    type: 'success',
    title: `商品${ev.asin}精选评论`,
    time: new Date().toLocaleString(),
    content: `精选评论数： ${ev.topReviews!.length}`,
  });
  updateDetailItems(ev);
});
const updateDetailItems = (row: { asin: string } & Partial<AmazonDetailItem>) => {
  const asin = row.asin;
  if (detailItems.value.has(row.asin)) {
    const origin = detailItems.value.get(row.asin);
    detailItems.value.set(asin, { ...origin, ...row } as AmazonDetailItem);
  } else {
    detailItems.value.set(asin, row as AmazonDetailItem);
  }
};
//#endregion

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
    await worker.runDetaiPageTask(asinList, async (remains) => {
      asinInputText.value = remains.join('\n');
    });
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

const handleInterrupt = () => {
  if (!running.value) return;
  worker.stop();
  message.info('已触发中断，正在等待当前任务完成。', { duration: 2000 });
};
</script>

<template>
  <div class="detail-page-entry">
    <header-title>Detail Page</header-title>
    <div class="interative-section">
      <n-space>
        <n-upload @change="handleImportAsin" accept=".txt" :max="1">
          <n-button :disabled="running" round size="small">
            <template #icon>
              <gg-import />
            </template>
            导入
          </n-button>
        </n-upload>
        <n-button :disabled="running" @click="handleExportAsin" round size="small">
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
          :disabled="running"
          v-model:value="asinInputText"
          placeholder="输入ASINs"
          type="textarea"
          size="large"
        />
      </n-form-item>
      <n-button v-if="!running" round size="large" type="primary" @click="handleFetchInfoFromPage">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        开始
      </n-button>
      <n-button v-else round size="large" type="primary" @click="handleInterrupt">
        <template #icon>
          <ant-design-thunderbolt-outlined />
        </template>
        停止
      </n-button>
    </div>
    <div v-if="running" class="running-tip-section">
      <n-alert title="Warning" type="warning"> 警告，在插件运行期间请勿与浏览器交互。 </n-alert>
    </div>
    <progress-report class="progress-report" :timelines="timelines" />
  </div>
</template>

<style scoped lang="scss">
.detail-page-entry {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;

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
    margin: 10px 0 0 0;
    height: 100px;
    border-radius: 10px;
    cursor: wait;
  }

  .progress-report {
    margin-top: 10px;
    width: 95%;
  }
}
</style>
