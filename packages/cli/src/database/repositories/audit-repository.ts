import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Audit, PageType, Violation } from '../types';

export class AuditRepository {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async createAudit(data: Partial<Audit>): Promise<Audit> {
    const { data: audit, error } = await this.client
      .from('audits')
      .insert([{
        status: data.status || 'running',
        config_used: data.config_used || {},
        total_violations: data.total_violations || 0,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create audit: ${error.message}`);
    }

    return audit;
  }

  async updateAuditStatus(
    auditId: string,
    status: 'running' | 'completed' | 'failed',
    durationSeconds?: number
  ): Promise<Audit> {
    const updates: any = { status };
    if (durationSeconds !== undefined) {
      updates.duration_seconds = durationSeconds;
    }

    const { data: audit, error } = await this.client
      .from('audits')
      .update(updates)
      .eq('id', auditId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update audit: ${error.message}`);
    }

    return audit;
  }

  async getRecentAudits(limit: number = 10): Promise<Audit[]> {
    const { data: audits, error } = await this.client
      .from('audits')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch audits: ${error.message}`);
    }

    return audits || [];
  }

  async getAudit(auditId: string): Promise<Audit | null> {
    const { data: audit, error } = await this.client
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to fetch audit: ${error.message}`);
    }

    return audit;
  }

  async savePageType(data: Omit<PageType, 'id' | 'created_at'>): Promise<PageType> {
    const { data: pageType, error } = await this.client
      .from('page_types')
      .insert([{
        audit_id: data.audit_id,
        type_name: data.type_name,
        url_pattern: data.url_pattern,
        total_count_in_sitemap: data.total_count_in_sitemap,
        pages_sampled: data.pages_sampled,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save page type: ${error.message}`);
    }

    return pageType;
  }

  async saveViolation(data: Omit<Violation, 'id' | 'created_at'>): Promise<Violation> {
    const { data: violation, error } = await this.client
      .from('violations')
      .insert([{
        audit_id: data.audit_id,
        page_type_id: data.page_type_id,
        rule_id: data.rule_id,
        wcag_criterion: data.wcag_criterion,
        wcag_level: data.wcag_level,
        severity: data.severity,
        description: data.description,
        instances_found: data.instances_found,
        extrapolated_total: data.extrapolated_total,
        remediation_guidance: data.remediation_guidance,
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save violation: ${error.message}`);
    }

    return violation;
  }
}
