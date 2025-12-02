import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class DatabaseClient {
  private client: SupabaseClient;

  constructor(config: DatabaseConfig) {
    this.client = createClient(config.supabaseUrl, config.supabaseKey);
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('audits')
        .select('count')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }
}
