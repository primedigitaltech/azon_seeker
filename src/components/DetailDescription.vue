<script lang="ts" setup>
import type { AmazonDetailItem } from '~/logic/page-worker/types';

defineProps<{ model: AmazonDetailItem }>();
</script>

<template>
  <div class="detail-description">
    <n-descriptions label-placement="left" bordered :column="4" label-style="min-width: 100px">
      <n-descriptions-item label="ASIN" :span="2">
        {{ model.asin }}
      </n-descriptions-item>
      <n-descriptions-item label="评价">
        {{ model.rating || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="评论数">
        {{ model.ratingCount || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="大类">
        {{ model.category1?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ model.category1?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="小类">
        {{ model.category2?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ model.category2?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="图片链接" :span="4">
        <image-link v-for="link in model.imageUrls" :url="link" />
      </n-descriptions-item>
    </n-descriptions>
  </div>
</template>

<style lang="scss" scoped>
.review-item-footer {
  display: flex;
  flex-direction: row-reverse;
}
</style>
