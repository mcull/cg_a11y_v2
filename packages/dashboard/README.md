# Creative Growth A11y Dashboard

Next.js 16 dashboard for exploring and classifying accessibility audit results.

## Setup

### Environment Variables

1. Copy `.env.local.template` to `.env.local`:
   ```bash
   cp .env.local.template .env.local
   ```

2. Add your Supabase credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

## Features

### Implemented (v1.0)

- **Audit List**: View all audits with filtering (status) and sorting (date)
- **Audit Details**: Drill down into specific audits to see page types tested
- **Violations Explorer**: View detailed violations by page type including:
  - Severity badges (critical, serious, moderate, minor)
  - WCAG criterion and level
  - Instance counts with extrapolation
  - Code examples with HTML snippets and CSS selectors
  - Remediation guidance
- **Hybrid Classification System**:
  - Auto-classification of violations during CLI audits (content vs structural)
  - Manual override with classification buttons
  - Visual badges showing classification status (auto/manual)
- **Server-First Architecture**:
  - Next.js Server Components for data fetching
  - Server Actions for mutations
  - Optimistic UI updates with revalidation

### Coming Soon

- Asana export workflow
- Classification notes field
- Filter violations by classification status
- Audit comparison view for tracking improvements

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui components, Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Language**: TypeScript

## Documentation

See implementation plan: `../../docs/plans/2026-01-08-audit-history-dashboard-implementation.md`
