<script lang="ts" setup>
import Options from './Options.vue';
</script>

<template>
  <!-- Naive UI Wrapper-->
  <n-config-provider
    :theme-overrides="{
      common: {
        primaryColor: '#007bff',
        primaryColorHover: '#0056b3',
        primaryColorPressed: '#004085',
        primaryColorSuppl: '#003366',
      },
    }"
  >
    <n-modal-provider>
      <n-dialog-provider>
        <n-message-provider>
          <options />
        </n-message-provider>
      </n-dialog-provider>
    </n-modal-provider>
  </n-config-provider>
</template>
