<script setup lang="ts">
import { useToggle } from '@vueuse/core';

const [show, toggle] = useToggle(false);
</script>

<template>
  <main class="injected-content">
    <button @click="toggle()">
      <pixelarticons-power />
    </button>
  </main>
</template>

<style lang="scss" scoped>
.injected-content {
  position: fixed;
  bottom: 0;
  right: 0;
  z-index: 9999;
}

button {
  border-radius: 0.5rem;
  padding: 0.5rem;
  text-align: center;
}
</style>
