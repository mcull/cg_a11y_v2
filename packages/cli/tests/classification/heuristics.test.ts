import { autoClassify } from '../../src/classification/heuristics';

describe('Auto-Classification Heuristics', () => {
  describe('Content Issues', () => {
    it('should classify image-alt as content', () => {
      const result = autoClassify('image-alt');
      expect(result).toEqual({ category: 'content', confidence: 'high' });
    });

    it('should classify Pa11y H37 (missing alt) as content', () => {
      const result = autoClassify('WCAG2AA.Principle1.Guideline1_1.1_1_1.H37');
      expect(result).toEqual({ category: 'content', confidence: 'high' });
    });

    it('should classify link-name as content', () => {
      const result = autoClassify('link-name');
      expect(result).toEqual({ category: 'content', confidence: 'high' });
    });
  });

  describe('Structural Issues', () => {
    it('should classify html-has-lang as structural', () => {
      const result = autoClassify('html-has-lang');
      expect(result).toEqual({ category: 'structural', confidence: 'high' });
    });

    it('should classify document-title as structural', () => {
      const result = autoClassify('document-title');
      expect(result).toEqual({ category: 'structural', confidence: 'high' });
    });

    it('should classify color-contrast as structural', () => {
      const result = autoClassify('color-contrast');
      expect(result).toEqual({ category: 'structural', confidence: 'high' });
    });
  });

  describe('Unknown Rules', () => {
    it('should return null for unknown rules', () => {
      const result = autoClassify('unknown-rule-xyz');
      expect(result).toEqual({ category: null, confidence: 'low' });
    });

    it('should return null for empty string', () => {
      const result = autoClassify('');
      expect(result).toEqual({ category: null, confidence: 'low' });
    });
  });
});
