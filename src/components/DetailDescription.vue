<script lang="ts" setup>
import type { AmazonDetailItem } from '~/logic/page-worker/types';
import { reviewItems } from '~/logic/storage';
import ReviewList from './ReviewList.vue';

const props = defineProps<{ model: AmazonDetailItem }>();

const modal = useModal();
const handleLoadMore = () => {
  modal.create({
    title: '评论',
    preset: 'card',
    style: {
      width: '85vw',
      height: '85vh',
    },
    content: () =>
      h(ReviewList, {
        asin: props.model.asin,
      }),
  });
};
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
        <div v-for="link in model.imageUrls">
          {{ link }}
        </div>
      </n-descriptions-item>
      <n-descriptions-item
        v-if="model.topReviews && model.topReviews.length > 0"
        label="精选评论"
        :span="4"
      >
        <n-scrollbar style="max-height: 350px">
          <div class="review-item-cotent">
            <template v-for="review in model.topReviews">
              <review-card :model="review" />
              <div style="height: 7px"></div>
            </template>
          </div>
        </n-scrollbar>
        <div class="review-item-footer">
          <n-button :disabled="!reviewItems.has(model.asin)" @click="handleLoadMore" size="small">
            更多评论
          </n-button>
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
