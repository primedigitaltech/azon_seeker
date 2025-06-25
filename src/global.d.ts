/// <reference types="vite/client" />

declare const __DEV__: boolean;
/** Extension name, defined in packageJson.name */
declare const __NAME__: string;

declare module '*.vue' {
  const component: any;
  export default component;
}

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

declare type AmazonSearchItem = {
  keywords: string;
  page: number;
  link: string;
  title: string;
  asin: string;
  rank: number;
  price?: string;
  imageSrc: string;
  createTime: string;
};

declare type AmazonDetailItem = {
  asin: string;
  title: string;
  price?: string;
  rating?: number;
  ratingCount?: number;
  category1?: { name: string; rank: number };
  category2?: { name: string; rank: number };
  imageUrls?: string[];
  aplus?: string;
  topReviews?: AmazonReview[];
};

declare type AmazonReview = {
  id: string;
  username: string;
  title: string;
  rating: string;
  dateInfo: string;
  content: string;
  imageSrc: string[];
};

declare type AmazonItem = Pick<AmazonSearchItem, 'asin'> &
  Partial<AmazonSearchItem> &
  Partial<AmazonDetailItem> & { hasDetail: boolean };

declare type HomedepotDetailItem = {
  OSMID: string;
  link: string;
  brandName?: string;
  title: string;
  price: string;
  rate?: string;
  reviewCount?: number;
  mainImageUrl: string;
  modelInfo?: string;
};

declare type LowesDetailItem = {
  OSMID: string;
  link: string;
  brandName?: string;
  title: string;
  price: string;
  rate?: string;
  innerText: string;
  reviewCount?: number;
  mainImageUrl: string;
  modelInfo?: string;
};
