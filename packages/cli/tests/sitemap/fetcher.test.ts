import { fetchSitemap } from '../../src/sitemap/fetcher';

describe('Sitemap Fetcher', () => {
  it('should fetch sitemap from URL', async () => {
    // This is an integration test - will be mocked in real scenarios
    // Using sitemaps.org which has a valid sitemap for testing
    const xml = await fetchSitemap('https://www.sitemaps.org/sitemap.xml');
    expect(typeof xml).toBe('string');
    expect(xml.length).toBeGreaterThan(0);
  }, 10000); // 10 second timeout for network request

  it('should throw error for invalid URL', async () => {
    await expect(fetchSitemap('https://invalid-domain-that-does-not-exist-12345.com/sitemap.xml'))
      .rejects.toThrow();
  }, 10000);
});
