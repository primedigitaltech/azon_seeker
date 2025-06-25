<script lang="ts" setup>
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
    <div class="image-link-container" v-if="model.imageSrc">
      <image-link v-for="link in model.imageSrc" :url="link" />
    </div>
    <div style="color: gray; font-size: smaller">{{ model.dateInfo }}</div>
  </div>
</template>

<style scoped lang="scss">
.image-link-container {
  display: flex;
  flex-direction: column;
}
</style>
