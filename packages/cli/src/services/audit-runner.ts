import { AxeTester } from '../testing/axe-tester';
import { Pa11yTester } from '../testing/pa11y-tester';
import { TestResult, Violation } from '../testing/types';

export interface MergedTestResult {
  url: string;
  violations: Violation[];
  timestamp: string;
}

export interface DualTestResult {
  axe: TestResult;
  pa11y: TestResult;
}

export class AuditRunner {
  private axeTester: AxeTester;
  private pa11yTester: Pa11yTester;

  constructor() {
    this.axeTester = new AxeTester();
    this.pa11yTester = new Pa11yTester();
  }

  async init(): Promise<void> {
    await Promise.all([this.axeTester.init(), this.pa11yTester.init()]);
  }

  async close(): Promise<void> {
    await Promise.all([this.axeTester.close(), this.pa11yTester.close()]);
  }

  async testUrl(url: string): Promise<DualTestResult> {
    const [axeResults, pa11yResults] = await Promise.all([
      this.axeTester.testUrl(url),
      this.pa11yTester.testUrl(url),
    ]);

    return {
      axe: axeResults,
      pa11y: pa11yResults,
    };
  }

  async testHtml(html: string): Promise<DualTestResult> {
    const [axeResults, pa11yResults] = await Promise.all([
      this.axeTester.testHtml(html),
      this.pa11yTester.testHtml(html),
    ]);

    return {
      axe: axeResults,
      pa11y: pa11yResults,
    };
  }

  async testUrlAndMerge(url: string): Promise<MergedTestResult> {
    const { axe, pa11y } = await this.testUrl(url);

    // Merge violations from both engines, removing duplicates
    const mergedViolations = this.mergeViolations(axe.violations, pa11y.violations);

    return {
      url: axe.url,
      violations: mergedViolations,
      timestamp: new Date().toISOString(),
    };
  }

  async testAndMerge(html: string): Promise<MergedTestResult> {
    const { axe, pa11y } = await this.testHtml(html);

    // Merge violations from both engines, removing duplicates
    const mergedViolations = this.mergeViolations(axe.violations, pa11y.violations);

    return {
      url: axe.url,
      violations: mergedViolations,
      timestamp: new Date().toISOString(),
    };
  }

  private mergeViolations(axeViolations: Violation[], pa11yViolations: Violation[]): Violation[] {
    const violations = [...axeViolations];
    const existingIds = new Set(axeViolations.map((v) => v.id));

    // Add Pa11y violations that don't have the same ID as Axe violations
    for (const pa11yViolation of pa11yViolations) {
      if (!existingIds.has(pa11yViolation.id)) {
        violations.push(pa11yViolation);
        existingIds.add(pa11yViolation.id);
      }
    }

    return violations;
  }
}
