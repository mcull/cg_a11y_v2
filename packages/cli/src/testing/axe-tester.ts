import puppeteer, { Browser, Page } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { TestResult, Violation } from './types';

export class AxeTester {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    const launchOptions: any = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
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

    const page = await this.browser.newPage();

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      return await this.runAxe(page, url);
    } finally {
      await page.close();
    }
  }

  async testHtml(html: string): Promise<TestResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();

    try {
      await page.setContent(html);
      return await this.runAxe(page, 'data:text/html');
    } finally {
      await page.close();
    }
  }

  private async runAxe(page: Page, url: string): Promise<TestResult> {
    const results = await new AxePuppeteer(page).analyze();

    return {
      url,
      violations: results.violations.map(v => ({
        id: v.id,
        impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags,
        nodes: v.nodes.map(n => ({
          html: n.html,
          target: n.target,
          failureSummary: n.failureSummary || '',
        })),
      })),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      timestamp: new Date().toISOString(),
    };
  }
}
