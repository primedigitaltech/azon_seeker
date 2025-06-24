<script lang="ts" setup>
import type { GlobalThemeOverrides } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useCurrentUrl } from '~/composables/useCurrentUrl';
import { site } from '~/logic/storages/global';

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
        router.push('/amazon');
        site.value = 'amazon';
        break;
      case 'www.homedepot.com':
        router.push('/homedepot');
        site.value = 'homedepot';
        break;
      default:
        break;
    }
  }
});
</script>

<template>
  <!-- Naive UI Wrapper-->
  <n-config-provider :theme-overrides="theme">
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
