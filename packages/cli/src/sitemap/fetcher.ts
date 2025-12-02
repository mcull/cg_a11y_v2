export async function fetchSitemap(url: string): Promise<string> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();

    if (!xml.includes('<urlset') && !xml.includes('<sitemapindex')) {
      throw new Error('Invalid sitemap format');
    }

    return xml;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to fetch sitemap from ${url}: ${error.message}`);
    }
    throw error;
  }
}
