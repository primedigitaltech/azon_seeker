<script setup lang="ts">
const props = defineProps<{
  url: string;
}>();

const message = useMessage();

const cached = ref<string | undefined>();

watch(
  () => props.url,
  (newVal, oldVal) => {
    if (newVal !== oldVal && cached.value) {
      URL.revokeObjectURL(cached.value);
      cached.value = undefined;
    }
  },
);

const loadImage = () => {
  if (cached.value) {
    return;
  }
  fetch(props.url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('加载失败');
      }
      return response.blob();
    })
    .then((blob) => {
      cached.value = URL.createObjectURL(blob);
    })
    .catch((_error) => {
      message.error(`加载图片失败`);
    });
};

onUnmounted(() => {
  if (cached.value) {
    URL.revokeObjectURL(cached.value);
    cached.value = undefined;
  }
});
</script>

<template>
  <div>
    <n-popover
      @update:show="(v) => v && loadImage()"
      trigger="hover"
      placement="right"
      :delay="1000"
      :duration="500"
    >
      <template #trigger>
        <span class="link-text">{{ url }}</span>
      </template>
      <img v-if="cached" :src="cached" />
      <n-text v-else>加载中...</n-text>
    </n-popover>
  </div>
</template>

<style lang="scss" scoped>
.link-text {
  cursor: default;
  font-family: v-mono;
  &:hover {
    text-decoration: underline;
  }
}

img {
  max-width: 50vw;
  max-height: 50vh;
}
</style>
