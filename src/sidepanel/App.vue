<script lang="ts" setup>
import SidePanel from './SidePanel.vue';
import TestPanel from './TestPanel.vue';
</script>

<template>
  <n-modal-provider>
    <n-dialog-provider>
      <n-message-provider>
        <test-panel />
      </n-message-provider>
    </n-dialog-provider>
  </n-modal-provider>
</template>
