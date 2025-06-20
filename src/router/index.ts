import { Plugin } from 'vue';
import {
  createRouter,
  createWebHashHistory,
  createMemoryHistory,
  RouteRecordRaw,
} from 'vue-router';
import { useAppContext } from '~/composables/useAppContext';
import { site } from '~/logic/storages/global';

const routeObj: Record<AppContext, RouteRecordRaw[]> = {
  options: [
    { path: '/', redirect: `/${site.value}` },
    { path: '/amazon', component: () => import('~/options/views/AmazonResultTable.vue') },
    { path: '/homedepot', component: () => import('~/options/views/HomedepotResultTable.vue') },
  ],
  sidepanel: [
    { path: '/', redirect: `/${site.value}` },
    { path: '/amazon', component: () => import('~/sidepanel/views/AmazonSidepanel.vue') },
    { path: '/homedepot', component: () => import('~/sidepanel/views/HomedepotSidepanel.vue') },
  ],
};

export const router: Plugin = {
  install(app) {
    const { appContext: context } = useAppContext();
    const routes = routeObj[context];
    const router = createRouter({
      history: context === 'sidepanel' ? createMemoryHistory() : createWebHashHistory(),
      routes,
    });
    app.use(router);
  },
};
