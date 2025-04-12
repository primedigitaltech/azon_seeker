import type Emittery from 'emittery';

interface AmazonPageWorkerEvents {
  /**
   * Emitted when a new item is found on the Amazon page.
   * @param link - The item link that was found.
   */
  ['item-links-collected']: { links: string[] };
}


interface AmazonPageWorker {
  /**
   * The channel for communication with the Amazon page worker.
   * This is an instance of Emittery, which allows for event-based communication.
   */
  readonly channel: Emittery<AmazonPageWorkerEvents>;

  /**
   * Search for a list of items on Amazon
   * @param keywords - The keywords to search for on Amazon.
   * @returns A promise that resolves to a string representing the search URL.
   */
  doSearch(keywords: string): Promise<string>;

  /**
   * Browsing item search page and collect links to those items.
   * @param entryUrl - The URL of the Amazon search page to start from.
   */
  wanderSearchList(): Promise<void>;
}
