import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import { remoteHost } from '~/env';
import VueHook from 'alova/vue';

const httpClient = createAlova({
  baseURL: `http://${remoteHost}`,
  requestAdapter: adapterFetch(),
  timeout: 10000,
  statesHook: VueHook,
  responded: {
    onSuccess: (response) => response.json(),
    onError: (response: Response) => {
      const message = useMessage();
      message.error(`HTTP Error: ${response.status}`);
    },
  },
});

export abstract class BaseService {
  get client() {
    return httpClient;
  }
}
