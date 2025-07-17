import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';
import { remoteHost } from '~/env';
import VueHook from 'alova/vue';
import { exportKey, generateKeyPair, signData } from '~/logic/crypto';

const keyPairPromise = generateKeyPair();
const publicKeyBase64Promise = keyPairPromise.then(async ({ publicKey }) => exportKey(publicKey));

const httpClient = createAlova({
  baseURL: `http://${remoteHost}`,
  requestAdapter: adapterFetch(),
  timeout: 10000,
  statesHook: VueHook,
  beforeRequest: async (method) => {
    // 生成签名
    const { privateKey } = await keyPairPromise;
    const publicKeyBase64Data = await publicKeyBase64Promise;
    const dataToSign = method.data ? JSON.stringify(method.data) : '';
    const signature = await signData(privateKey, dataToSign);
    method.config.headers['x-signature'] = signature;
    method.config.headers['x-public-key'] = publicKeyBase64Data;
  },
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
