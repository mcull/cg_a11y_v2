import { AuditRepository } from '../../src/database/repositories/audit-repository';

describe('Audit Repository', () => {
  let repository: AuditRepository;

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'test-key';
    repository = new AuditRepository(supabaseUrl, supabaseKey);
  });

  // Skip tests if Supabase credentials not available
  const skipIfNoCredentials = process.env.SUPABASE_URL ? it : it.skip;

  describe('savePageType', () => {
    skipIfNoCredentials('should save a page type to the database', async () => {
      // Create an audit first
      const audit = await repository.createAudit({
        status: 'running',
        config_used: { test: true },
      });

      // Save a page type
      const pageType = await repository.savePageType({
        audit_id: audit.id,
        type_name: 'Artist Page',
        url_pattern: '/artist/*',
        total_count_in_sitemap: 100,
        pages_sampled: 10,
      });

      expect(pageType).toBeDefined();
      expect(pageType.id).toBeDefined();
      expect(pageType.audit_id).toBe(audit.id);
      expect(pageType.type_name).toBe('Artist Page');
      expect(pageType.url_pattern).toBe('/artist/*');
      expect(pageType.total_count_in_sitemap).toBe(100);
      expect(pageType.pages_sampled).toBe(10);
    });
  });

  describe('saveViolation', () => {
    skipIfNoCredentials('should save a violation to the database', async () => {
      // Create an audit and page type first
      const audit = await repository.createAudit({
        status: 'running',
        config_used: { test: true },
      });

      const pageType = await repository.savePageType({
        audit_id: audit.id,
        type_name: 'Blog Post',
        url_pattern: '/blog/*',
        total_count_in_sitemap: 50,
        pages_sampled: 5,
      });

      // Save a violation
      const violation = await repository.saveViolation({
        audit_id: audit.id,
        page_type_id: pageType.id,
        rule_id: 'image-alt',
        wcag_criterion: '1.1.1',
        wcag_level: 'A',
        severity: 'serious',
        description: 'Images must have alternate text',
        instances_found: 5,
        extrapolated_total: 50,
        remediation_guidance: 'Add alt attributes to all images',
      });

      expect(violation).toBeDefined();
      expect(violation.id).toBeDefined();
      expect(violation.audit_id).toBe(audit.id);
      expect(violation.page_type_id).toBe(pageType.id);
      expect(violation.rule_id).toBe('image-alt');
      expect(violation.wcag_criterion).toBe('1.1.1');
      expect(violation.wcag_level).toBe('A');
      expect(violation.severity).toBe('serious');
      expect(violation.description).toBe('Images must have alternate text');
      expect(violation.instances_found).toBe(5);
      expect(violation.extrapolated_total).toBe(50);
    });
  });
});
