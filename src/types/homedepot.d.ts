declare type HomedepotDetailItem = {
  /** The unique OSM identifier for the item.*/
  OSMID: string;
  /** The URL link to the item's page. */
  link: string;
  /** The brand name of the item (optional).*/
  brandName?: string;
  /** The title or name of the item.*/
  title: string;
  /** The price of the item as a string. */
  price: string;
  /** The rating of the item (optional).*/
  rate?: string;
  /** The number of reviews for the item (optional).*/
  reviewCount?: number;
  /** The main image URL of the item.*/
  mainImageUrl: string;
  /** All urls of images*/
  imageUrls?: string[];
  /** Additional model information for the item (optional).*/
  modelInfo?: string;
  /** Timestamp */
  timestamp: string;
};

declare type HomedepotReview = BaseReview & {
  /**Review's image urls */
  imageUrls?: string[];
  /** Review's badges*/
  badges?: string[];
};
