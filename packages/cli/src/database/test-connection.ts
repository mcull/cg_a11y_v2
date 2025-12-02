import { DatabaseClient } from './client';
import * as dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
    process.exit(1);
  }

  const client = new DatabaseClient({
    supabaseUrl,
    supabaseKey,
  });

  console.log('Testing database connection...');
  const isConnected = await client.testConnection();

  if (isConnected) {
    console.log('✓ Database connection successful');
    process.exit(0);
  } else {
    console.error('✗ Database connection failed');
    process.exit(1);
  }
}

testConnection();
