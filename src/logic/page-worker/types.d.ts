import type Emittery from 'emittery';

type AmazonGoodsLinkItem = {
  link: string;
  title: string;
  asin: string;
  rank: number;
  imageSrc: string;
};

interface AmazonPageWorkerEvents {
  /**
   * The event is fired when worker collected links to items on the Amazon search page.
   */
  ['item-links-collected']: { objs: { link: string; title: string; imageSrc: string }[] };

  /**
   * The event is fired when worker collected goods' rating on the Amazon detail page.
   */
  ['item-rating-collected']: {
    asin: string;
    rating: number;
    ratingCount: number;
  };

  /**
   * The event is fired when worker
   */
  ['item-category-rank-collected']: {
    asin: string;
    category1?: { name: string; rank: number };
    category2?: { name: string; rank: number };
  };

  /**
   * The event is fired when images collected
   */
  ['item-images-collected']: {
    asin: string;
    urls: string[];
  };

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
