<script setup lang="ts">
export type Timeline = {
  type: 'default' | 'error' | 'success' | 'warning' | 'info';
  title: string;
  time: string;
  content: string;
};

defineProps<{
  timelines: Timeline[];
}>();
</script>

<template>
  <n-card class="progress-report" title="数据获取情况">
    <n-timeline v-if="timelines.length > 0">
      <n-timeline-item
        v-for="(item, index) in timelines.toReversed()"
        :key="index"
        :type="item.type"
        :title="item.title"
        :time="item.time"
      >
        <div v-for="line in item.content.split('\n')">{{ line }}</div>
      </n-timeline-item>
    </n-timeline>
    <n-empty v-else size="large">
      <template #icon>
        <n-icon size="50">
          <solar-cat-linear />
        </n-icon>
      </template>
      <template #default>还未开始</template>
    </n-empty>
  </n-card>
</template>

<style>
.progress-report {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
</style>
