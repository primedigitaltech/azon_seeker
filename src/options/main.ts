import App from './App.vue';
import { setupApp } from '~/logic/common-setup';
import '../styles';

// This is the options page of the extension.
Object.assign(self, { appContext: 'options' });

const app = createApp(App);
setupApp(app);
app.mount('#app');
