<script setup lang="ts">
const openOptionsPage = async () => {
  await browser.runtime.openOptionsPage();
};
</script>

<template>
  <div class="header-menu">
    <n-button class="setting-button" round @click="openOptionsPage" size="small">
      <template #icon>
        <n-icon size="18" color="#0f0f0f">
          <stash:search-results />
        </n-icon>
      </template>
      <template #default> 数据 </template>
    </n-button>
  </div>
</template>

<style scoped lang="scss">
.header-menu {
  width: 100%;
  display: flex;
  flex-direction: row-reverse;
  justify-content: flex-start;

  .setting-button {
    margin-right: 20px;
    opacity: 0.7;
    &:hover {
      opacity: 1;
    }
  }
}
</style>
