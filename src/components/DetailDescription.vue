<script lang="ts" setup>
import type { AmazonDetailItem } from '~/logic/page-worker/types';

const props = defineProps<{ model: AmazonDetailItem }>();
</script>

<template>
  <div class="detail-description">
    <n-descriptions label-placement="left" bordered :column="4">
      <n-descriptions-item label="ASIN" :span="2">
        {{ props.model.asin }}
      </n-descriptions-item>
      <n-descriptions-item label="评价">
        {{ props.model.rating || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="评论数">
        {{ props.model.ratingCount || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="大类">
        {{ props.model.category1?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ props.model.category1?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="小类">
        {{ props.model.category2?.name || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="排名">
        {{ props.model.category2?.rank || '-' }}
      </n-descriptions-item>
      <n-descriptions-item label="图片链接">
        <div v-for="link in props.model.imageUrls">
          {{ link }}
        </div>
      </n-descriptions-item>
    </n-descriptions>
  </div>
</template>

<style lang="scss" scoped></style>
