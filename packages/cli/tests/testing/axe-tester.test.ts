import { AxeTester } from '../../src/testing/axe-tester';

describe('Axe Tester', () => {
  let tester: AxeTester;

  beforeAll(async () => {
    tester = new AxeTester();
    await tester.init();
  });

  afterAll(async () => {
    await tester.close();
  });

  it('should test a simple HTML page', async () => {
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

    // Should find missing alt text
    const altViolation = results.violations.find(v => v.id === 'image-alt');
    expect(altViolation).toBeDefined();
  }, 30000);

  it('should test accessible HTML without violations', async () => {
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

    const altViolation = results.violations.find(v => v.id === 'image-alt');
    expect(altViolation).toBeUndefined();
  }, 30000);
});
