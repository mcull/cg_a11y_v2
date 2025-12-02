import { AuditRepository } from '../../src/database/repositories/audit-repository';

// Note: These are integration tests that require a real Supabase instance
// Skip if SUPABASE_URL is not set
const shouldSkip = !process.env.SUPABASE_URL;

describe('Audit Repository', () => {
  let repository: AuditRepository;

  beforeAll(() => {
    if (shouldSkip) {
      console.log('Skipping database tests - SUPABASE_URL not set');
      return;
    }

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_ANON_KEY!;

    repository = new AuditRepository(supabaseUrl, supabaseKey);
  });

  it.skip('should create a new audit', async () => {
    if (shouldSkip) return;

    const audit = await repository.createAudit({
      status: 'running',
      config_used: { patterns: [] },
    });

    expect(audit.id).toBeDefined();
    expect(audit.status).toBe('running');
  });

  it.skip('should update audit status', async () => {
    if (shouldSkip) return;

    const audit = await repository.createAudit({
      status: 'running',
      config_used: {},
    });

    const updated = await repository.updateAuditStatus(audit.id, 'completed', 120);

    expect(updated.status).toBe('completed');
    expect(updated.duration_seconds).toBe(120);
  });

  it.skip('should get recent audits', async () => {
    if (shouldSkip) return;

    const audits = await repository.getRecentAudits(10);
    expect(Array.isArray(audits)).toBe(true);
  });
});
