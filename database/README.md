# Database Setup

## Prerequisites

1. Create a Supabase project at https://supabase.com
2. Note your project URL and anon key

## Setup Steps

1. Copy the SQL from `schema.sql`
2. Open Supabase SQL Editor
3. Paste and run the SQL to create tables
4. Copy `.env.example` to `.env` in `packages/cli`
5. Add your Supabase credentials to `.env`

## Verify Setup

Run: `cd packages/cli && npm run test:db`

This will test the database connection.
