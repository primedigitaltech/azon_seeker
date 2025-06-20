const forbiddenProtocols = [
  'chrome-extension://',
  'chrome-search://',
  'chrome://',
  'devtools://',
  'edge://',
  'https://chrome.google.com/webstore',
];

export function isForbiddenUrl(url: string): boolean {
  return forbiddenProtocols.some((protocol) => url.startsWith(protocol));
}

export const isFirefox = navigator.userAgent.includes('Firefox');

export const remoteHost = __DEV__ ? '127.0.0.1:8000' : '47.251.4.191:8000';
