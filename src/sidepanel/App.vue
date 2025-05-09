<script lang="ts" setup>
import type { GlobalThemeOverrides } from 'naive-ui';
import SidePanel from './SidePanel.vue';

const theme: GlobalThemeOverrides = {
  common: {
    primaryColor: '#007bff',
    primaryColorHover: '#0056b3',
    primaryColorPressed: '#004085',
    primaryColorSuppl: '#003366',
  },
};
</script>

<template>
  <!-- Naive UI Wrapper-->
  <n-config-provider :theme-overrides="theme">
    <n-modal-provider>
      <n-dialog-provider>
        <n-message-provider>
          <side-panel />
        </n-message-provider>
      </n-dialog-provider>
    </n-modal-provider>
  </n-config-provider>
</template>
