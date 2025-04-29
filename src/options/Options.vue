<script setup lang="ts"></script>

<template>
  <main>
    <h1>采集结果</h1>
    <result-table class="result-table" />
  </main>
</template>

<style scoped lang="scss">
main {
  display: flex;
  flex-direction: column;
  align-items: center;

  .result-table {
    width: 70%;
  }
}
</style>
