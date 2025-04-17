<script lang="ts" setup>
import Sidepanel from './Sidepanel.vue';
</script>

<template>
  <n-dialog-provider>
    <n-message-provider>
      <sidepanel />
    </n-message-provider>
  </n-dialog-provider>
</template>
