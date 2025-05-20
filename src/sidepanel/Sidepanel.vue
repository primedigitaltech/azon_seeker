<script setup lang="ts">
import DetailPageEntry from './DetailPageEntry.vue';
import SearchPageEntry from './SearchPageEntry.vue';
import ReviewPageEntry from './ReviewPageEntry.vue';

const tabs = [
  {
    name: '搜索页',
    component: SearchPageEntry,
  },
  {
    name: '详情页',
    component: DetailPageEntry,
  },
  {
    name: '评论页',
    component: ReviewPageEntry,
  },
];
const selectedTab = ref(tabs[0].name);
const currentComponent = computed(() => {
  const tab = tabs.find((tab) => tab.name === selectedTab.value);
  return tab ? tab.component : null;
});
const showHeader = ref(true);
</script>

<template>
  <div class="side-panel">
    <div class="header-menu" v-if="showHeader">
      <n-tabs
        placement="top"
        :default-value="tabs[0].name"
        type="segment"
        :value="selectedTab"
        @update:value="
          (val) => {
            if (tabs.findIndex((t) => t.name === val) !== -1) {
              selectedTab = val;
            }
          }
        "
      >
        <n-tab v-for="tab in tabs" :name="tab.name" />
      </n-tabs>
    </div>
    <div class="display-header-button" @click="showHeader = !showHeader">
      <n-icon size="18">
        <ion-chevron-up v-if="showHeader" />
        <ion-chevron-down v-else />
      </n-icon>
    </div>
    <div class="main-content">
      <keep-alive>
        <Component :is="currentComponent" />
      </keep-alive>
    </div>
  </div>
</template>

<style scoped lang="scss">
.side-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #f0f0f0;

  .header-menu {
    width: 100%;
    background-color: #fff;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
    border-bottom: 1px solid #eaeaea;
  }

  .display-header-button {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
    cursor: pointer;

    > .n-icon {
      opacity: 0.3;
    }

    &:hover {
      > .n-icon {
        opacity: 1;
      }
      background-color: #f7f7f7;
    }
  }

  .main-content {
    flex: 1;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: #fff;
  }
}
</style>
