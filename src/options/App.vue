<script lang="ts" setup>
import type { GlobalThemeOverrides } from 'naive-ui';
import Options from './Options.vue';
import { zhCN, dateZhCN } from 'naive-ui';

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
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="theme">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <n-modal-provider>
            <options />
          </n-modal-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
