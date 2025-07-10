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
  boughtInfo?: string;
  /** 商品价格 */
  price?: string;
  /** 商品评分 */
  rating?: number;
  /** 评分数量 */
  ratingCount?: number;
  /** 分类信息*/
  categories?: string;
  /** 上架日期 */
  availableDate?: string;
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
  /** 发货快递 */
  shipFrom?: string;
  /** 卖家 */
  soldBy?: string;
  /**关于信息 */
  abouts?: string[];
  /** 品牌名称 */
  brand?: string;
  /** 商品口味/风味 */
  flavor?: string;
  /** 商品单位数量 */
  unitCount?: string;
  /** 商品形态/剂型 */
  itemForm?: string;
  /** 商品尺寸 */
  productDimensions?: string;
};

declare type AmazonReview = BaseReview & {
  /** 评论的唯一标识符 */
  id: string;
  /** 评论中包含的图片链接 */
  imageSrc: string[];
};

declare type AmazonItem = Pick<AmazonSearchItem, 'asin'> &
  Partial<AmazonSearchItem> &
  Partial<AmazonDetailItem> & { hasDetail: boolean };
