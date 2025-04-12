interface AmazonPageWorker {
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
