export interface ClassificationResult {
  category: 'content' | 'structural' | null;
  confidence: 'high' | 'low';
}

/**
 * Auto-classify accessibility violations based on rule patterns.
 *
 * Content issues require content changes (alt text, labels, etc.)
 * Structural issues require code/template changes (landmarks, headings, etc.)
 */
export function autoClassify(ruleId: string): ClassificationResult {
  if (!ruleId || ruleId.trim() === '') {
    return { category: null, confidence: 'low' };
  }

  // Content issues - require content changes
  const contentPatterns = [
    'image-alt',
    'H37',          // Pa11y: missing alt attribute
    'H67',          // Pa11y: empty alt when should have content
    'label',
    'link-name',
    'button-name',
    '1_1_1',        // WCAG 1.1.1 - Non-text Content
  ];

  // Structural issues - require code/template changes
  const structuralPatterns = [
    'html-has-lang',
    'document-title',
    'landmark-one-main',
    'page-has-heading-one',
    'color-contrast',
    'H32.2',        // Pa11y: form missing submit
    'H91',          // Pa11y: form controls
    '2_4_1',        // WCAG 2.4.1 - Bypass Blocks
    '3_2_2',        // WCAG 3.2.2 - On Input
    '4_1_2',        // WCAG 4.1.2 - Name, Role, Value
    'F68',          // Pa11y: form not in fieldset
  ];

  // Check content patterns
  for (const pattern of contentPatterns) {
    if (ruleId.includes(pattern)) {
      return { category: 'content', confidence: 'high' };
    }
  }

  // Check structural patterns
  for (const pattern of structuralPatterns) {
    if (ruleId.includes(pattern)) {
      return { category: 'structural', confidence: 'high' };
    }
  }

  // Unknown rule - no classification
  return { category: null, confidence: 'low' };
}
