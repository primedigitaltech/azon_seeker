<script setup lang="ts">
const openOptionsPage = async () => {
  await browser.runtime.openOptionsPage();
};
</script>

<template>
  <div class="header-title">
    <div class="header-menu">
      <n-button class="setting-button" round @click="openOptionsPage" size="small">
        <template #icon>
          <n-icon size="18" color="#0f0f0f">
            <stash:search-results />
          </n-icon>
        </template>
        <template #default>数据</template>
      </n-button>
    </div>
    <n-space class="app-title">
      <mdi-cat style="font-size: 60px; color: black" />
      <h1><slot></slot></h1>
    </n-space>
  </div>
</template>

<style scoped lang="scss">
.header-title {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.header-menu {
  width: 100%;
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-start;

  .setting-button {
    margin: 12px 20px 0 0;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }
}

.app-title {
  margin-top: 10px;
}
</style>
