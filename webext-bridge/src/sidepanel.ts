import { createEndpointRuntime } from './internal/endpoint-runtime';
import { createStreamWirings } from './internal/stream';
import { createPersistentPort } from './internal/persistent-port';

// Chrome API types for sidepanel
declare global {
  interface Chrome {
    sidePanel?: {
      setPanelBehavior: (options: { openPanelOnActionClick: boolean }) => void;
      setOptions: (options: { path?: string }) => void;
      onShown: {
        addListener: (callback: () => void) => void;
        removeListener: (callback: () => void) => void;
        hasListener: (callback: () => void) => boolean;
      };
      onHidden: {
        addListener: (callback: () => void) => void;
        removeListener: (callback: () => void) => void;
        hasListener: (callback: () => void) => boolean;
      };
      // V3 还支持指定页面的侧边栏配置
      getOptions: (options: { tabId?: number }) => Promise<{ path?: string }>;
    };
  }

  var chrome: Chrome;
}

const port = createPersistentPort('sidepanel');
const endpointRuntime = createEndpointRuntime('sidepanel', (message) => port.postMessage(message));

port.onMessage(endpointRuntime.handleMessage);

export function isSidepanelSupported(): boolean {
  return !!chrome.sidePanel;
}

export const { sendMessage, onMessage } = endpointRuntime;
export const { openStream, onOpenStreamChannel } = createStreamWirings(endpointRuntime);
