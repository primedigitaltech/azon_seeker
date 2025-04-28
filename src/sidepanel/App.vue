<script lang="ts" setup>
import SidePanel from './SidePanel.vue';
</script>

<template>
  <!-- Naive UI Wrapper-->
  <n-modal-provider>
    <n-dialog-provider>
      <n-message-provider>
        <side-panel />
      </n-message-provider>
    </n-dialog-provider>
  </n-modal-provider>
</template>
