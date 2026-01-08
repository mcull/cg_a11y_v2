import { AuditRunner } from '../../src/services/audit-runner';

describe('Audit Runner', () => {
  let runner: AuditRunner;

  beforeAll(async () => {
    runner = new AuditRunner();
    await runner.init();
  });

  afterAll(async () => {
    await runner.close();
  });

  it('should run both axe and pa11y tests on HTML', async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Test</title></head>
        <body>
          <img src="test.jpg">
          <h1>Heading</h1>
        </body>
      </html>
    `;

    const results = await runner.testHtml(html);

    expect(results).toBeDefined();
    expect(results.axe).toBeDefined();
    expect(results.pa11y).toBeDefined();
    expect(results.axe.violations.length).toBeGreaterThan(0);
    expect(results.pa11y.violations.length).toBeGreaterThan(0);
  }, 30000);

  it('should merge violations from both engines', async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Test</title></head>
        <body>
          <img src="test.jpg">
          <h1>Heading</h1>
        </body>
      </html>
    `;

    const merged = await runner.testAndMerge(html);

    expect(merged.violations.length).toBeGreaterThan(0);
    expect(merged.timestamp).toBeDefined();
    expect(merged.url).toBe('data:text/html');
  }, 30000);
});
