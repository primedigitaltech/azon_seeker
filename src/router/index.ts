import { Plugin } from 'vue';
import { createRouter, createMemoryHistory, RouteRecordRaw } from 'vue-router';
import { useAppContext } from '~/composables/useAppContext';

const routeObj: Record<AppContext, RouteRecordRaw[]> = {
  options: [
    { path: '/', redirect: '/amazon' },
    { path: '/amazon', component: () => import('~/options/views/AmazonResultTable.vue') },
  ],
  sidepanel: [
    { path: '/', redirect: '/amazon' },
    { path: '/amazon', component: () => import('~/sidepanel/views/AmazonSidepanel.vue') },
    { path: '/homedepot', component: () => import('~/sidepanel/views/HomedepotSidepanel.vue') },
  ],
};

export const router: Plugin = {
  install(app) {
    const { appContext: context } = useAppContext();
    const routes = routeObj[context];
    const router = createRouter({
      history: createMemoryHistory(),
      routes,
    });
    app.use(router);
  },
};
