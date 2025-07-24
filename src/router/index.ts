import { Plugin } from 'vue';
import {
  createRouter,
  createWebHashHistory,
  createMemoryHistory,
  RouteRecordRaw,
} from 'vue-router';
import { site } from '~/storages/global';

const routeObj: Record<'sidepanel' | 'options', RouteRecordRaw[]> = {
  options: [
    { path: '/', redirect: `/${site.value}` },
    { path: '/amazon', component: () => import('~/options/views/AmazonResultTable.vue') },
    { path: '/amazon-reviews', component: () => import('~/options/views/AmazonReviews.vue') },
    { path: '/homedepot', component: () => import('~/options/views/HomedepotResultTable.vue') },
    { path: '/homedepot-reviews', component: () => import('~/options/views/HomedepotReviews.vue') },
    { path: '/help', component: () => import('~/options/views/help/guide.md') },
  ],
  sidepanel: [
    { path: '/', redirect: `/${site.value}` },
    { path: '/amazon', component: () => import('~/sidepanel/views/AmazonSidepanel.vue') },
    { path: '/homedepot', component: () => import('~/sidepanel/views/HomedepotSidepanel.vue') },
  ],
};

export const router: Plugin = {
  install(app) {
    switch (appContext) {
      case 'sidepanel':
      case 'options':
        const routes = routeObj[appContext];
        const router = createRouter({
          history: appContext === 'sidepanel' ? createMemoryHistory() : createWebHashHistory(),
          routes,
        });
        app.use(router);
      default:
        break;
    }
  },
};
