import { PageTypePattern } from './types';

export { PageTypePattern };

export class PageTypeClassifier {
  private patterns: PageTypePattern[];

  constructor(patterns: PageTypePattern[]) {
    // Sort patterns by specificity (more specific patterns first)
    this.patterns = [...patterns].sort((a, b) => {
      const aSpecificity = a.pattern.split('/').length;
      const bSpecificity = b.pattern.split('/').length;
      return bSpecificity - aSpecificity;
    });
  }

  classify(url: string): string {
    const result = this.classifyWithPattern(url);
    return result.type;
  }

  classifyWithPattern(url: string): { type: string; pattern: string } {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.replace(/\/$/, ''); // Remove trailing slash

      for (const { pattern, type } of this.patterns) {
        if (this.matchesPattern(pathname, pattern)) {
          return { type, pattern };
        }
      }

      return { type: 'Unknown', pattern: '/*' };
    } catch (error) {
      return { type: 'Unknown', pattern: '/*' };
    }
  }

  private matchesPattern(pathname: string, pattern: string): boolean {
    // Remove trailing slash from pattern
    const cleanPattern = pattern.replace(/\/$/, '');

    // Convert pattern to regex
    // /artists/* becomes /^\/artists\/.*$/
    const regexPattern = cleanPattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(pathname);
  }
}
