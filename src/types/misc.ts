/// <reference types="vite/client" />

declare const __DEV__: boolean;
/** Extension name, defined in packageJson.name */
declare const __NAME__: string;

declare module '*.vue' {
  const component: any;
  export default component;
}

declare type AppContext = 'options' | 'sidepanel' | 'background' | 'content script';

declare type Website = 'amazon' | 'homedepot';

declare const appContext: AppContext;

declare interface Chrome {
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
