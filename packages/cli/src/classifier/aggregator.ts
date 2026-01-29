import { PageTypeClassifier } from './classifier';
import { PageTypeCount } from './types';
import { SitemapUrl } from '../sitemap/parser';

export class PageTypeAggregator {
  private classifier: PageTypeClassifier;

  constructor(classifier: PageTypeClassifier) {
    this.classifier = classifier;
  }

  aggregate(urls: SitemapUrl[]): PageTypeCount[] {
    const typeMap = new Map<string, { pattern: string; urls: string[] }>();

    for (const url of urls) {
      const { type, pattern } = this.classifier.classifyWithPattern(url.loc);

      if (!typeMap.has(type)) {
        typeMap.set(type, {
          pattern,
          urls: [],
        });
      }

      typeMap.get(type)!.urls.push(url.loc);
    }

    const results: PageTypeCount[] = [];

    for (const [type, data] of typeMap.entries()) {
      results.push({
        type,
        pattern: data.pattern,
        urls: data.urls,
        totalCount: data.urls.length,
      });
    }

    // Sort by count descending
    return results.sort((a, b) => b.totalCount - a.totalCount);
  }
}
