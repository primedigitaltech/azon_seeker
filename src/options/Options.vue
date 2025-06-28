<script setup lang="ts">
import { RouterView } from 'vue-router';
import { site } from '~/storages/global';
import { useRouter } from 'vue-router';

const router = useRouter();

const options: { label: string; value: string }[] = [
  { label: 'Amazon', value: 'amazon' },
  { label: 'Amazon Review', value: 'amazon-reviews' },
  { label: 'Homedepot', value: 'homedepot' },
];

watch(site, (val) => {
  router.push(val);
});
</script>

<template>
  <header>
    <span>
      <n-popselect v-model:value="site" :options="options" placement="bottom-start">
        <n-button>
          <template #icon>
            <n-icon size="20">
              <garden-menu-fill-12 />
            </n-icon>
          </template>
        </n-button>
      </n-popselect>
    </span>
    <span>
      <h1 class="header-title">采集结果</h1>
    </span>
    <span> </span>
  </header>
  <main>
    <router-view />
  </main>
</template>

<style scoped lang="scss">
header {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;

  .header-title {
    cursor: default;
  }
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;

  height: 90vh;
  width: 95vw;
}
</style>
