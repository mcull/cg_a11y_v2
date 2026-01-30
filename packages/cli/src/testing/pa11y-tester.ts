// eslint-disable-next-line @typescript-eslint/no-var-requires
const pa11y = require('pa11y');
import puppeteer, { Browser } from 'puppeteer';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { TestResult, Violation } from './types';

interface Pa11yIssue {
  code: string;
  type: string;
  message: string;
  context: string;
  selector: string;
}

interface Pa11yResult {
  issues: Pa11yIssue[];
}

export class Pa11yTester {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    const launchOptions: any = {
      headless: 'new', // Use new headless mode with better rendering
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--force-color-profile=srgb',
        '--disable-web-security',
      ],
    };

    // Use custom Chrome path if provided
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    this.browser = await puppeteer.launch(launchOptions);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async testUrl(url: string): Promise<TestResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const results: Pa11yResult = await pa11y(url, {
      browser: this.browser,
    });

    return {
      url,
      violations: results.issues.map((issue: Pa11yIssue) => this.mapIssueToViolation(issue)),
      passes: 0, // Pa11y doesn't report passes
      incomplete: 0,
      timestamp: new Date().toISOString(),
    };
  }

  async testHtml(html: string): Promise<TestResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    // Write HTML to temp file for pa11y to test
    const tempFile = join(tmpdir(), `pa11y-test-${Date.now()}.html`);
    await fs.writeFile(tempFile, html);

    try {
      const results: Pa11yResult = await pa11y(`file://${tempFile}`, {
        browser: this.browser,
      });

      return {
        url: 'data:text/html',
        violations: results.issues.map((issue: Pa11yIssue) => this.mapIssueToViolation(issue)),
        passes: 0, // Pa11y doesn't report passes
        incomplete: 0,
        timestamp: new Date().toISOString(),
      };
    } finally {
      // Clean up temp file
      try {
        await fs.unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private mapIssueToViolation(issue: Pa11yIssue): Violation {
    // Map Pa11y severity to our impact levels
    const impactMap: Record<string, 'critical' | 'serious' | 'moderate' | 'minor'> = {
      error: 'critical',
      warning: 'serious',
      notice: 'moderate',
    };

    return {
      id: issue.code,
      impact: impactMap[issue.type] || 'minor',
      description: issue.message,
      help: issue.message,
      helpUrl: undefined, // Pa11y doesn't provide helpUrls, and we can't reliably construct them from issue codes
      tags: issue.type ? [issue.type] : [],
      nodes: [
        {
          html: issue.context || '',
          target: issue.selector || '',
          failureSummary: issue.message,
        },
      ],
    };
  }
}
