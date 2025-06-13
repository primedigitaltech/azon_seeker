<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <main>
    <h1 class="header-title">采集结果</h1>
    <!-- <result-table class="result-table" /> -->
    <router-view />
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  align-items: center;

  .header-title {
    cursor: default;
  }

  .result-table {
    height: 90vh;
    width: 95vw;
  }
}
</style>
