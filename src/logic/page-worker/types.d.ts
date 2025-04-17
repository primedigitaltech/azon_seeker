import type Emittery from 'emittery';

type AmazonGoodsLinkItem = { link: string; title: string };

interface AmazonPageWorkerEvents {
  /**
   * This event is used to collect links to items on the Amazon search page.
   */
  ['item-links-collected']: { objs: AmazonGoodsLinkItem[] };

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
  wanderSearchList(): Promise<void>;

  /**
   * Browsing goods detail page and collect target information.
   */
  wanderDetailPage(): Promise<void>;
}
