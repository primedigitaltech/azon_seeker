<script lang="ts" setup>
import type { AmazonReview } from '~/logic/page-worker/types';

defineProps<{
  model: AmazonReview;
}>();
</script>

<template>
  <div class="review-card">
    <h3 style="margin: 0">{{ model.username }}: {{ model.title }}</h3>
    <n-rate readonly size="small" :value="Number(model.rating.split('.')[0])" />
    <div v-for="paragraph in model.content.split('\n')">
      {{ paragraph }}
    </div>
    <template v-if="model.imageSrc">
      <n-code :code="model.imageSrc.join('\n')" />
    </template>
    <div style="color: gray; font-size: smaller">{{ model.dateInfo }}</div>
  </div>
</template>
