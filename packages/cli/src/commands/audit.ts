import * as fs from 'fs/promises';
import * as yaml from 'yaml';
import * as dotenv from 'dotenv';
import { fetchSitemap } from '../sitemap/fetcher';
import { parseSitemap } from '../sitemap/parser';
import { PageTypeClassifier } from '../classifier/classifier';
import { PageTypeAggregator } from '../classifier/aggregator';
import { AdaptiveSampler } from '../sampling/sampler';
import { AuditRunner } from '../services/audit-runner';
import { AuditRepository } from '../database/repositories/audit-repository';
import { autoClassify } from '../classification/heuristics';

// Load environment variables
dotenv.config();

interface AuditOptions {
  url: string;
  config: string;
  output: string;
  skipDb?: boolean;
  onProgress?: (message: string) => void;
}

export async function auditCommand(options: AuditOptions): Promise<void> {
  // Helper to log and send progress
  const logProgress = (message: string) => {
    console.log(message);
    if (options.onProgress) {
      options.onProgress(message);
    }
  };

  logProgress('🚀 Starting accessibility audit...');
  logProgress(`   URL: ${options.url}`);
  logProgress(`   Config: ${options.config}`);
  console.log();

  const startTime = Date.now();
  let auditId: string | null = null;
  let repository: AuditRepository | null = null;

  try {
    // Load config
    logProgress('📋 Loading configuration...');
    const configFile = await fs.readFile(options.config, 'utf-8');
    const config = yaml.parse(configFile);

    // Initialize database if not skipped
    if (!options.skipDb) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_ANON_KEY;

      if (supabaseUrl && supabaseKey) {
        logProgress('💾 Initializing database connection...');
        repository = new AuditRepository(supabaseUrl, supabaseKey);

        // Create audit record
        const audit = await repository.createAudit({
          status: 'running',
          config_used: config,
        });
        auditId = audit.id;
        logProgress(`   Audit ID: ${auditId}`);
      } else {
        logProgress('⚠️  Database credentials not found, running without database');
      }
    }

    // Fetch and parse sitemap
    logProgress('🗺️  Fetching sitemap...');
    const sitemapUrl = new URL('/sitemap.xml', options.url).toString();
    const sitemapXml = await fetchSitemap(sitemapUrl);
    const urls = await parseSitemap(sitemapXml);
    logProgress(`   Found ${urls.length} URLs`);

    // Classify page types
    logProgress('🏷️  Classifying page types...');
    const classifier = new PageTypeClassifier(config.pageTypes);
    const aggregator = new PageTypeAggregator(classifier);
    const pageTypes = aggregator.aggregate(urls);

    logProgress('📊 Page Types:');
    for (const type of pageTypes) {
      logProgress(`   ${type.type}: ${type.totalCount} pages`);
    }

    // Initialize test runner
    logProgress('🧪 Initializing test engines...');
    const runner = new AuditRunner();
    await runner.init();

    // Sample and test each page type
    logProgress('🔬 Testing pages with adaptive sampling...');
    const sampler = new AdaptiveSampler({
      initialSampleSize: 30,
      maxSampleSize: 100,
      consistencyThreshold: 0.95,
    });

    const allViolations: any[] = [];
    const pageTypeViolations: Map<string, any[]> = new Map();
    const pageTypeSampleCounts: Map<string, number> = new Map();

    for (const pageType of pageTypes) {
      logProgress(`Testing ${pageType.type} (${pageType.totalCount} total pages)...`);

      const violationsForType: Array<{ violation: any; url: string }> = [];

      // Sample pages for this type
      const sampleResult = await sampler.sample(pageType.urls, async (url: string) => {
        try {
          const merged = await runner.testUrlAndMerge(url, (screenshot) => {
            // Send screenshot through progress callback
            if (options.onProgress) {
              options.onProgress(`SCREENSHOT:${screenshot}`);
            }
          });
          // Store full violation objects WITH their source URL
          for (const violation of merged.violations) {
            violationsForType.push({ violation, url });
          }
          return merged.violations.map((v) => v.id);
        } catch (error) {
          console.error(`     Error testing ${url}:`, error);
          return [];
        }
      });

      logProgress(`  Tested ${sampleResult.samplesTaken} of ${pageType.totalCount} pages`);
      logProgress(`  Violations: ${sampleResult.violations.size} unique types`);

      // Store violations and sample count keyed by page type
      pageTypeViolations.set(pageType.type, violationsForType);
      pageTypeSampleCounts.set(pageType.type, sampleResult.samplesTaken);

      // Track violations for JSON output
      for (const violationId of sampleResult.violations) {
        allViolations.push({
          pageType: pageType.type,
          violationId,
          pagesAffected: sampleResult.samplesTaken,
          totalPages: pageType.totalCount,
        });
      }
    }

    // Close test runner
    await runner.close();

    // Save page types and violations to database
    let totalViolationsCount = 0;
    if (repository && auditId) {
      logProgress('💾 Saving results to database...');

      for (const pageType of pageTypes) {
        // Save page type
        const savedPageType = await repository.savePageType({
          audit_id: auditId,
          type_name: pageType.type,
          url_pattern: pageType.pattern,
          total_count_in_sitemap: pageType.totalCount,
          pages_sampled: pageTypeSampleCounts.get(pageType.type) || 0,
        });

        // Get violations for this page type
        const violationsWithUrls = pageTypeViolations.get(pageType.type) || [];

        // Group violations by ID and collect URLs for each
        const violationMap = new Map<string, { violation: any; urls: string[] }>();
        for (const { violation, url } of violationsWithUrls) {
          if (!violationMap.has(violation.id)) {
            violationMap.set(violation.id, {
              violation,
              urls: [url],
            });
          } else {
            const existing = violationMap.get(violation.id)!;
            existing.urls.push(url);
          }
        }

        // Save unique violations for this page type
        for (const [violationId, { violation, urls }] of violationMap) {
          const extrapolatedTotal = Math.round((urls.length / pageTypeSampleCounts.get(pageType.type)!) * pageType.totalCount);
          totalViolationsCount += extrapolatedTotal;

          const savedViolation = await repository.saveViolation({
            audit_id: auditId,
            page_type_id: savedPageType.id,
            rule_id: violation.id,
            wcag_criterion: violation.wcagCriterion || 'Unknown',
            wcag_level: (violation.wcagLevel as 'A' | 'AA' | 'AAA') || 'AA',
            severity: (violation.impact as 'critical' | 'serious' | 'moderate' | 'minor') || 'serious',
            description: violation.description || violation.help || 'No description available',
            instances_found: urls.length,
            extrapolated_total: extrapolatedTotal,
            remediation_guidance: violation.helpUrl || null,
          });

          // Save violation example URLs
          for (const url of urls) {
            await repository.saveViolationExample({
              violation_id: savedViolation.id,
              url,
              html_snippet: null, // Could be added later with more detailed violation data
              css_selector: null, // Could be added later with more detailed violation data
            });
          }

          // Auto-classify violation
          const classification = autoClassify(violation.id);
          if (classification.category) {
            await repository.createClassification({
              violation_id: savedViolation.id,
              category: classification.category,
              auto_classified: true,
            });
          }
        }
      }

      logProgress(`   Saved ${pageTypes.length} page types and their violations`);
    }

    // Update audit status if using database
    if (repository && auditId) {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      await repository.updateAuditStatus(auditId, 'completed', durationSeconds, totalViolationsCount);
      logProgress(`✅ Audit completed and saved to database (${durationSeconds}s)`);
      logProgress(`   Total violations (extrapolated): ${totalViolationsCount.toLocaleString()}`);
    }

    // Save results
    const results = {
      auditId,
      url: options.url,
      timestamp: new Date().toISOString(),
      totalUrls: urls.length,
      pageTypes: pageTypes.map((pt) => ({
        type: pt.type,
        totalCount: pt.totalCount,
        pattern: pt.pattern,
      })),
      violations: allViolations,
      durationSeconds: Math.floor((Date.now() - startTime) / 1000),
    };

    await fs.writeFile(options.output, JSON.stringify(results, null, 2));
    logProgress(`💾 Results saved to ${options.output}`);

    logProgress('✅ Audit complete!');
    logProgress(`   Total violations found: ${allViolations.length}`);
    logProgress(`   Duration: ${results.durationSeconds}s`);

  } catch (error) {
    console.error('\n❌ Audit failed:', error);

    // Mark audit as failed if using database
    if (repository && auditId) {
      try {
        await repository.updateAuditStatus(auditId, 'failed');
      } catch (dbError) {
        console.error('Failed to update audit status:', dbError);
      }
    }

    // Only exit if running as CLI, not if imported as module (e.g., by Electron app)
    if (require.main === module) {
      process.exit(1);
    } else {
      throw error;  // Let caller handle the error
    }
  }
}
