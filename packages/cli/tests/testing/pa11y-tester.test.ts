import { Pa11yTester } from '../../src/testing/pa11y-tester';

describe('Pa11y Tester', () => {
  let tester: Pa11yTester;

  beforeAll(async () => {
    tester = new Pa11yTester();
    await tester.init();
  });

  afterAll(async () => {
    await tester.close();
  });

  it('should test a simple HTML page with violations', async () => {
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

    const results = await tester.testHtml(html);

    expect(results.violations).toBeDefined();
    expect(results.violations.length).toBeGreaterThan(0);
    expect(results.timestamp).toBeDefined();

    // Should find missing alt text
    const altViolation = results.violations.find((v) =>
      v.description.toLowerCase().includes('alt')
    );
    expect(altViolation).toBeDefined();
  }, 30000);

  it('should test accessible HTML without critical violations', async () => {
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head><title>Test</title></head>
        <body>
          <img src="test.jpg" alt="Test image">
          <h1>Heading</h1>
        </body>
      </html>
    `;

    const results = await tester.testHtml(html);

    expect(results.violations).toBeDefined();
    // Should not find missing alt text violation
    const altViolation = results.violations.find((v) =>
      v.description.toLowerCase().includes('missing') &&
      v.description.toLowerCase().includes('alt')
    );
    expect(altViolation).toBeUndefined();
  }, 30000);
});
