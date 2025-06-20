<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <header>
    <span></span>
    <h1 class="header-title">采集结果</h1>
    <span></span>
  </header>
  <main>
    <router-view />
  </main>
</template>

<style scoped lang="scss">
header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  .header-title {
    cursor: default;
  }
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;

  .result-table {
    height: 90vh;
    width: 95vw;
  }
}
</style>
