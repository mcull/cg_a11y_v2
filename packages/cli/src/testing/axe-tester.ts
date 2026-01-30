import puppeteer, { Browser, Page } from 'puppeteer';
import { AxePuppeteer } from '@axe-core/puppeteer';
import { TestResult, Violation } from './types';

export class AxeTester {
  private browser: Browser | null = null;

  async init(): Promise<void> {
    const launchOptions: any = {
      headless: 'new', // Use new headless mode with better rendering
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--force-color-profile=srgb', // Ensure color rendering
        '--disable-web-security', // Allow all resources to load
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

  async testUrl(url: string, onScreenshot?: (screenshot: string) => void): Promise<TestResult> {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const page = await this.browser.newPage();

    try {
      // Set a reasonable viewport size for screenshots
      await page.setViewport({ width: 1280, height: 800 });

      // Set a realistic user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Run the accessibility audit first
      const result = await this.runAxe(page, url);

      // Capture screenshot after audit (page is fully rendered)
      if (onScreenshot) {
        try {
          const screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'jpeg',
            quality: 60,
            fullPage: false,
            omitBackground: false, // Include background colors/images
          });
          console.log(`Screenshot captured for ${url}, size: ${screenshot.length} bytes`);
          onScreenshot(`data:image/jpeg;base64,${screenshot}`);
        } catch (err) {
          console.error('Screenshot error:', err);
        }
      }

      return result;
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
