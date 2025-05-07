import type Emittery from 'emittery';

type AmazonSearchItem = {
  keywords: string;
  link: string;
  title: string;
  asin: string;
  rank: number;
  imageSrc: string;
  createTime: string;
};

type AmazonDetailItem = {
  asin: string;
  rating?: number;
  ratingCount?: number;
  category1?: { name: string; rank: number };
  category2?: { name: string; rank: number };
  imageUrls: string[];
};

type AmazonItem = AmazonSearchItem & Partial<AmazonDetailItem> & { hasDetail: boolean };

interface AmazonPageWorkerEvents {
  /**
   * The event is fired when worker collected links to items on the Amazon search page.
   */
  ['item-links-collected']: { objs: Omit<AmazonSearchItem, 'keywords'>[] };

  /**
   * The event is fired when worker collected goods' rating on the Amazon detail page.
   */
  ['item-rating-collected']: Pick<AmazonDetailItem, 'asin' | 'rating' | 'ratingCount'>;

  /**
   * The event is fired when worker
   */
  ['item-category-rank-collected']: Pick<AmazonDetailItem, 'asin' | 'category1' | 'category2'>;

  /**
   * The event is fired when images collected
   */
  ['item-images-collected']: Pick<AmazonDetailItem, 'asin' | 'imageUrls'>;

  /**
   * Error event that occurs when there is an issue with the Amazon page worker.
   */
  ['error']: { message: string; url?: string };
}

interface AmazonPageWorker {
  /**
   * The channel for communication with the Amazon page worker.
   * This is an instance of Emittery, which allows for event-based communication.
   */
  readonly channel: Emittery<AmazonPageWorkerEvents>;

  /**
   * Search for a list of goods on Amazon
   * @param keywords - The keywords to search for on Amazon.
   * @returns A promise that resolves to a string representing the search URL.
   */
  doSearch(keywords: string): Promise<string>;

  /**
   * Browsing goods search page and collect links to those goods.
   */
  wanderSearchPage(): Promise<void>;

  /**
   * Browsing goods detail page and collect target information.
   * @param entry Product link or Amazon Standard Identification Number.
   */
  wanderDetailPage(entry: string): Promise<void>;

  /**
   * Stop the worker.
   */
  stop(): Promise<void>;
}
