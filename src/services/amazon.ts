import { flattenObject } from '~/logic/convert';
import { BaseService } from './base';

class AmazonService extends BaseService {
  async commitSearchItems(items: AmazonSearchItem[]) {
    await this.client.Post<Response>('/amazon/search_items', items);
  }

  async commitDetailItems(items: Map<string, AmazonDetailItem>) {
    await this.client.Post<Response>(
      '/amazon/detail_items',
      Array.from(
        items
          .values()
          .map((item) => {
            return item.imageUrls
              ? {
                  ...item,
                  imageUrls: item.imageUrls.join(';'),
                }
              : item;
          })
          .map(flattenObject),
      ),
    );
  }

  async commitReviews(items: Map<string, AmazonReview[]>) {
    await this.client.Post<Response>(
      '/amazon/reviews',
      items.entries().reduce<any[]>((allReviews, [asin, reviews]) => {
        allReviews.push(...reviews.map((r) => ({ asin, ...r, imageSrc: r.imageSrc?.join(';') })));
        return allReviews;
      }, []),
    );
  }
}

const service = new AmazonService();

export const useAmazonService = () => service;
