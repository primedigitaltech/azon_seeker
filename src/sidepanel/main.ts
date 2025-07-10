import App from './App.vue';
import { setupApp } from '~/logic/common-setup';
import '~/styles';

// This is the sidepanel page of the extension.
Object.assign(self, { appContext: 'sidepanel' });

const app = createApp(App);
setupApp(app);
app.mount('#app');
