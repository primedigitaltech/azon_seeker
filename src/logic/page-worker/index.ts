import Emittery from 'emittery';
import { AmazonPageWorker, AmazonPageWorkerEvents } from './types';

class AmazonPageWorkerImpl implements AmazonPageWorker {
  readonly channel = new Emittery<AmazonPageWorkerEvents>();

  public async doSearch(keywords: string): Promise<string> {
    const url = new URL('https://www.amazon.com/s');
    url.searchParams.append('k', keywords);

    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    const currentUrl = new URL(tab.url!);
    if (
      currentUrl.hostname !== url.hostname ||
      currentUrl.searchParams.get('k') !== keywords
    ) {
      await browser.tabs.update(tab.id, { url: url.toString() });
    }
    return url.toString();
  }

  private async wanderSearchSinglePage() {
    const tab = await browser.tabs
      .query({ active: true, currentWindow: true })
      .then((tabs) => tabs[0]);
    const results = await browser.scripting.executeScript({
      target: { tabId: tab.id! },
      func: async () => {
        try {
          await new Promise((resolve) =>
            setTimeout(resolve, 500 + ~~(500 * Math.random())),
          );
          while (!document.querySelector('.s-pagination-strip')) {
            window.scrollBy(0, ~~(Math.random() * 500) + 500);
            await new Promise((resolve) => setTimeout(resolve, 10));
          }
          const items = document.querySelectorAll<HTMLDivElement>(
            '.a-section.a-spacing-small.puis-padding-left-small',
          );
          const links: string[] = [];
          items.forEach((el) => {
            const link =
              el.querySelector<HTMLAnchorElement>('a.a-link-normal')?.href;
            link && links.push(link);
          });
          const nextButton =
            document.querySelector<HTMLLinkElement>('.s-pagination-next');
          if (
            nextButton &&
            !nextButton.classList.contains('s-pagination-disabled')
          ) {
            await new Promise((resolve) =>
              setTimeout(resolve, 500 + ~~(500 * Math.random())),
            );
            nextButton.click();
          } else {
            return null;
          }
          return links;
        } catch (e) {
          return null;
        }
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return results.pop()?.result as string[] | null;
  }

  public async wanderSearchList(): Promise<void> {
    let links = await this.wanderSearchSinglePage();
    while (links) {
      this.channel.emit('item-links-collected', { links });
      links = await this.wanderSearchSinglePage();
    }
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

class PageWorkerFactory {
  public createAmazonPageWorker(): AmazonPageWorker {
    return new AmazonPageWorkerImpl();
  }
}

const pageWorkerFactory = new PageWorkerFactory();

export default pageWorkerFactory;
