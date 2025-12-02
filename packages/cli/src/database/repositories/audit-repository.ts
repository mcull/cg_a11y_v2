import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Audit } from '../types';

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
}
