import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import { fetchSitemap } from '../sitemap/fetcher';
import { parseSitemap } from '../sitemap/parser';
import { PageTypeClassifier } from '../classifier/classifier';
import { PageTypeAggregator } from '../classifier/aggregator';

interface AuditOptions {
  url: string;
  config: string;
  output: string;
  skipDb?: boolean;
}

export async function auditCommand(options: AuditOptions): Promise<void> {
  console.log('🚀 Starting accessibility audit...');
  console.log(`   URL: ${options.url}`);
  console.log(`   Config: ${options.config}`);
  console.log();

  try {
    // Load config
    console.log('📋 Loading configuration...');
    const configFile = await fs.readFile(options.config, 'utf-8');
    const config = yaml.parse(configFile);

    // Fetch and parse sitemap
    console.log('🗺️  Fetching sitemap...');
    const sitemapUrl = new URL('/sitemap.xml', options.url).toString();
    const sitemapXml = await fetchSitemap(sitemapUrl);
    const urls = await parseSitemap(sitemapXml);
    console.log(`   Found ${urls.length} URLs`);

    // Classify page types
    console.log('🏷️  Classifying page types...');
    const classifier = new PageTypeClassifier(config.pageTypes);
    const aggregator = new PageTypeAggregator(classifier);
    const pageTypes = aggregator.aggregate(urls);

    console.log('\n📊 Page Types:');
    for (const type of pageTypes) {
      console.log(`   ${type.type}: ${type.totalCount} pages`);
    }

    console.log('\n✅ Audit preparation complete!');
    console.log('   (Full testing implementation coming in next tasks)');

    // Save preliminary results
    const results = {
      url: options.url,
      timestamp: new Date().toISOString(),
      totalUrls: urls.length,
      pageTypes: pageTypes,
    };

    await fs.writeFile(options.output, JSON.stringify(results, null, 2));
    console.log(`\n💾 Results saved to ${options.output}`);

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}
