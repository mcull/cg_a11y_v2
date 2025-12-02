import { XMLParser } from 'fast-xml-parser';

export interface SitemapUrl {
  loc: string;
  lastmod?: string;
  priority?: string;
  changefreq?: string;
}

export async function parseSitemap(xml: string): Promise<SitemapUrl[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
  });

  const result = parser.parse(xml);
  const urlset = result.urlset;

  if (!urlset || !urlset.url) {
    return [];
  }

  // Handle single URL or array of URLs
  const urls = Array.isArray(urlset.url) ? urlset.url : [urlset.url];

  return urls.map((url: any) => ({
    loc: url.loc,
    lastmod: url.lastmod,
    priority: url.priority,
    changefreq: url.changefreq,
  }));
}
