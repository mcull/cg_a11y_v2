import { parseSitemap } from '../../src/sitemap/parser';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Sitemap Parser', () => {
  it('should parse sitemap XML and extract URLs', async () => {
    const xml = readFileSync(join(__dirname, '../fixtures/sample-sitemap.xml'), 'utf-8');
    const urls = await parseSitemap(xml);

    expect(urls).toHaveLength(3);
    expect(urls[0]).toEqual({
      loc: 'https://example.com/',
      lastmod: '2025-01-01'
    });
  });

  it('should handle sitemap without lastmod', async () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/test</loc></url>
      </urlset>`;

    const urls = await parseSitemap(xml);
    expect(urls).toHaveLength(1);
    expect(urls[0].lastmod).toBeUndefined();
  });
});
