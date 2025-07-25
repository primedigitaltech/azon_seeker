<script lang="ts" setup>
import type { GlobalThemeOverrides } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useCurrentUrl } from '~/composables/useCurrentUrl';
import { site } from '~/storages/global';
import { zhCN, dateZhCN } from 'naive-ui';

const theme: GlobalThemeOverrides = {
  common: {
    primaryColor: '#007bff',
    primaryColorHover: '#0056b3',
    primaryColorPressed: '#004085',
    primaryColorSuppl: '#003366',
  },
};

const currentUrl = useCurrentUrl();
const router = useRouter();

watch(currentUrl, (newVal) => {
  if (newVal) {
    const url = new URL(newVal);
    switch (url.hostname) {
      case 'www.amazon.com':
        site.value = 'amazon';
        break;
      case 'www.homedepot.com':
        site.value = 'homedepot';
        break;
      case 'www.lowes.com':
        site.value = 'lowes';
        break;
      default:
        break;
    }
  }
});

watch(site, (newVal) => {
  switch (newVal) {
    case 'amazon':
      router.push('/amazon');
      break;
    case 'homedepot':
      router.push('/homedepot');
      break;
    case 'lowes':
      router.push('/lowes');
      break;
    default:
      break;
  }
});
</script>

<template>
  <!-- Naive UI Wrapper-->
  <n-config-provider :locale="zhCN" :date-locale="dateZhCN" :theme-overrides="theme">
    <n-loading-bar-provider>
      <n-message-provider>
        <n-dialog-provider>
          <n-modal-provider>
            <router-view />
          </n-modal-provider>
        </n-dialog-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>
