import { PageTypeClassifier, PageTypePattern } from '../../src/classifier/classifier';

describe('Page Type Classifier', () => {
  const patterns: PageTypePattern[] = [
    { pattern: '/artists/*', type: 'Artist Page' },
    { pattern: '/artworks/*', type: 'Artwork Page' },
    { pattern: '/art/*', type: 'Artwork Page' },
    { pattern: '/blog/*', type: 'Blog Post' },
    { pattern: '/*', type: 'Other' },
  ];

  let classifier: PageTypeClassifier;

  beforeEach(() => {
    classifier = new PageTypeClassifier(patterns);
  });

  it('should classify artist page correctly', () => {
    const type = classifier.classify('https://example.com/artists/john-doe');
    expect(type).toBe('Artist Page');
  });

  it('should classify artwork page correctly', () => {
    const type = classifier.classify('https://example.com/artworks/piece-123');
    expect(type).toBe('Artwork Page');
  });

  it('should classify blog post correctly', () => {
    const type = classifier.classify('https://example.com/blog/announcement');
    expect(type).toBe('Blog Post');
  });

  it('should classify unknown pages as Other', () => {
    const type = classifier.classify('https://example.com/about');
    expect(type).toBe('Other');
  });

  it('should handle trailing slashes', () => {
    const type = classifier.classify('https://example.com/artists/john-doe/');
    expect(type).toBe('Artist Page');
  });

  it('should classify Creative Growth artwork URLs correctly', () => {
    const type = classifier.classify('https://creativegrowth.org/art/untitled-bt-1961-by-juan-aguilera');
    expect(type).toBe('Artwork Page');
  });
});
