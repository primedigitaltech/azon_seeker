<script setup lang="ts">
import { RouterView } from 'vue-router';
import { site } from '~/storages/global';
import { useRouter } from 'vue-router';

const router = useRouter();

const headerText = ref('采集结果');
const version = __VERSION__;
const opt = ref<string | undefined>(`/${site.value}`);

const options: { label: string; value: string }[] = [
  { label: 'Amazon', value: '/amazon' },
  { label: 'Amazon Review', value: '/amazon-reviews' },
  { label: 'Homedepot', value: '/homedepot' },
  { label: 'Homedepot Review', value: '/homedepot-reviews' },
];

watch(opt, (val) => {
  if (val) {
    router.push(val);
    headerText.value = '采集结果';
  }
  switch (val) {
    case '/amazon':
    case '/amazon-reviews':
      site.value = 'amazon';
      break;
    case '/homedepot':
      site.value = 'homedepot';
      break;
    default:
      break;
  }
});

const handleHelpButtonClick = () => {
  opt.value = undefined;
  router.push('/help');
  headerText.value = '帮助';
};
</script>

<template>
  <header>
    <span>
      <n-popselect v-model:value="opt" :options="options" placement="bottom-start">
        <n-button>
          <template #icon>
            <n-icon :size="20">
              <garden-menu-fill-12 />
            </n-icon>
          </template>
        </n-button>
      </n-popselect>
    </span>
    <span>
      <h1 class="header-title">{{ headerText }}</h1>
    </span>
    <span>
      <n-button @click="handleHelpButtonClick" round>
        <template #icon>
          <n-icon :size="20">
            <ion-help />
          </n-icon>
        </template>
      </n-button>
    </span>
  </header>
  <main>
    <router-view />
  </main>
  <footer>
    <span
      >Azon Seeker v{{ version }} powered by
      <a href="https://github.com/honestfox101">@HonestFox101</a></span
    >
  </footer>
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

  height: 8vh;
}

main {
  display: flex;
  flex-direction: column;
  align-items: center;

  width: 95vw;
  min-height: 87vh;
}

footer {
  color: rgba(128, 128, 128, 0.68);
  height: 5vh;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: end;

  a {
    color: rgba(128, 128, 128, 0.68);
    text-decoration: none;
    transition: color 0.2s;

    &:hover {
      color: #1a73e8;
      text-decoration: underline;
    }
  }
}
</style>
