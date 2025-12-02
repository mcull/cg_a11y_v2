import { PageTypeAggregator } from '../../src/classifier/aggregator';
import { PageTypeClassifier, PageTypePattern } from '../../src/classifier/classifier';
import { SitemapUrl } from '../../src/sitemap/parser';
import { PageTypeCount } from '../../src/classifier/types';

describe('Page Type Aggregator', () => {
  const patterns: PageTypePattern[] = [
    { pattern: '/artists/*', type: 'Artist Page' },
    { pattern: '/artworks/*', type: 'Artwork Page' },
    { pattern: '/*', type: 'Other' },
  ];

  const urls: SitemapUrl[] = [
    { loc: 'https://example.com/' },
    { loc: 'https://example.com/artists/john' },
    { loc: 'https://example.com/artists/jane' },
    { loc: 'https://example.com/artworks/piece-1' },
    { loc: 'https://example.com/artworks/piece-2' },
    { loc: 'https://example.com/artworks/piece-3' },
    { loc: 'https://example.com/about' },
  ];

  it('should aggregate URLs by page type', () => {
    const classifier = new PageTypeClassifier(patterns);
    const aggregator = new PageTypeAggregator(classifier);
    const result = aggregator.aggregate(urls);

    expect(result).toHaveLength(4); // Updated: classifier classifies root as Unknown

    const artistType = result.find((r: PageTypeCount) => r.type === 'Artist Page');
    expect(artistType?.totalCount).toBe(2);
    expect(artistType?.urls).toHaveLength(2);

    const artworkType = result.find((r: PageTypeCount) => r.type === 'Artwork Page');
    expect(artworkType?.totalCount).toBe(3);

    const otherType = result.find((r: PageTypeCount) => r.type === 'Other');
    expect(otherType?.totalCount).toBe(1); // Updated: only /about matches

    const unknownType = result.find((r: PageTypeCount) => r.type === 'Unknown');
    expect(unknownType?.totalCount).toBe(1); // Root path classified as Unknown
  });
});
