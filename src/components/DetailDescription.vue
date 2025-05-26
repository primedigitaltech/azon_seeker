<script lang="ts" setup>
import type { AmazonDetailItem } from '~/logic/page-worker/types';

const props = defineProps<{ model: AmazonDetailItem }>();
</script>

<template>
  <div class="detail-description">
    <n-descriptions label-placement="left" bordered :column="4" label-style="min-width: 100px">
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
      <n-descriptions-item label="图片链接" :span="4">
        <div v-for="link in props.model.imageUrls">
          {{ link }}
        </div>
      </n-descriptions-item>
      <n-descriptions-item
        v-if="props.model.topReviews && props.model.topReviews.length > 0"
        label="精选评论"
        :span="4"
      >
        <n-scrollbar style="max-height: 500px">
          <div class="review-item-cotent">
            <div v-for="review in props.model.topReviews" style="margin-bottom: 5px">
              <h3 style="margin: 0">{{ review.username }}: {{ review.title }}</h3>
              <div style="color: gray; font-size: smaller">{{ review.rating }}</div>
              <div v-for="paragraph in review.content.split('\n')">
                {{ paragraph }}
              </div>
              <div style="color: gray; font-size: smaller">{{ review.dateInfo }}</div>
            </div>
          </div>
        </n-scrollbar>
        <div class="review-item-footer">
          <n-button size="small">Load More</n-button>
        </div>
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
