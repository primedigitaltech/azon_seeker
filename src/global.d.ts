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

/**
 * 亚马逊搜索页信息
 */
declare type AmazonSearchItem = {
  /** 搜索关键词 */
  keywords: string;
  /** 商品排名 */
  rank: number;
  /** 当前页码 */
  page: number;
  /** 商品链接 */
  link: string;
  /** 商品标题 */
  title: string;
  /** 商品的 ASIN（亚马逊标准识别号） */
  asin: string;
  /** 商品价格（可选） */
  price?: string;
  /** 商品图片链接 */
  imageSrc: string;
  /** 创建时间 */
  createTime: string;
};

declare type AmazonDetailItem = {
  /** 商品的 ASIN（亚马逊标准识别号） */
  asin: string;
  /** 商品标题 */
  title: string;
  /** 时间戳，表示数据的创建或更新时间 */
  timestamp: string;
  /** 销量信息 */
  broughtInfo?: string;
  /** 商品价格 */
  price?: string;
  /** 商品评分 */
  rating?: number;
  /** 评分数量 */
  ratingCount?: number;
  /** 大类排名 */
  category1?: {
    name: string;
    rank: number;
  };
  /** 小类排名 */
  category2?: {
    name: string;
    rank: number;
  };
  /** 商品图片链接数组 */
  imageUrls?: string[];
  /** A+截图链接 */
  aplus?: string;
  // /** 顶部评论数组 */
  // topReviews?: AmazonReview[];
};

declare type AmazonReview = {
  /** 评论的唯一标识符 */
  id: string;
  /** 评论者用户名 */
  username: string;
  /** 评论标题 */
  title: string;
  /** 评论评分 */
  rating: string;
  /** 评论日期信息 */
  dateInfo: string;
  /** 评论内容 */
  content: string;
  /** 评论中包含的图片链接 */
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
