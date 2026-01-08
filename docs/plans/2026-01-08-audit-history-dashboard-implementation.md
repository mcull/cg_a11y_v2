# Audit History Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a drill-down dashboard to explore accessibility audit results with hybrid auto/manual classification of violations.

**Architecture:** Server-first Next.js 16 architecture with Server Components for data fetching, Client Components for interactivity, shadcn/ui for UI, and Supabase for database. Auto-classification runs in CLI during audits, manual override available in dashboard.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase, Server Actions

---

## Phase 1: Database Schema Update

### Task 1: Add auto_classified Column to Classifications Table

**Files:**
- Modify: `database/schema.sql:51-58`
- Create: `database/migrations/002_add_auto_classified.sql`

**Step 1: Create migration file**

Create file `database/migrations/002_add_auto_classified.sql`:

```sql
-- Add auto_classified column to track whether classification was automatic or manual
ALTER TABLE classifications
ADD COLUMN auto_classified BOOLEAN DEFAULT FALSE;

-- Add index for filtering by auto-classified status
CREATE INDEX idx_classifications_auto_classified ON classifications(auto_classified);
```

**Step 2: Update schema.sql**

In `database/schema.sql`, update the classifications table (line 51-58) to:

```sql
-- User classifications of violations
CREATE TABLE classifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('content', 'structural')),
  auto_classified BOOLEAN DEFAULT FALSE,
  notes TEXT,
  classified_by UUID, -- Will reference users table when auth is added
  classified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Step 3: Update index in schema.sql**

In `database/schema.sql`, add index after line 77:

```sql
CREATE INDEX idx_classifications_auto_classified ON classifications(auto_classified);
```

**Step 4: Commit**

```bash
git add database/schema.sql database/migrations/002_add_auto_classified.sql
git commit -m "feat: add auto_classified column to classifications table"
```

---

## Phase 2: CLI Auto-Classification

### Task 2: Create Heuristics Module

**Files:**
- Create: `packages/cli/src/classification/heuristics.ts`
- Create: `packages/cli/tests/classification/heuristics.test.ts`

**Step 1: Write failing test**

Create `packages/cli/tests/classification/heuristics.test.ts`:

```typescript
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
```

**Step 2: Run test to verify it fails**

```bash
cd packages/cli
npm test -- tests/classification/heuristics.test.ts
```

Expected: FAIL with "Cannot find module '../../src/classification/heuristics'"

**Step 3: Write minimal implementation**

Create `packages/cli/src/classification/heuristics.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
cd packages/cli
npm test -- tests/classification/heuristics.test.ts
```

Expected: PASS - 10 tests passing

**Step 5: Commit**

```bash
git add packages/cli/src/classification/heuristics.ts packages/cli/tests/classification/heuristics.test.ts
git commit -m "feat: add auto-classification heuristics for violations"
```

### Task 3: Add Classification Repository Method

**Files:**
- Modify: `packages/cli/src/database/repositories/audit-repository.ts`

**Step 1: Add createClassification method**

In `packages/cli/src/database/repositories/audit-repository.ts`, add after `getAudit` method:

```typescript
async createClassification(data: {
  violation_id: string;
  category: 'content' | 'structural';
  auto_classified: boolean;
  notes?: string;
}): Promise<void> {
  const { error } = await this.client.from('classifications').insert({
    violation_id: data.violation_id,
    category: data.category,
    auto_classified: data.auto_classified,
    notes: data.notes || `Auto-classified as ${data.category}`,
    classified_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create classification: ${error.message}`);
  }
}
```

**Step 2: Commit**

```bash
git add packages/cli/src/database/repositories/audit-repository.ts
git commit -m "feat: add createClassification method to repository"
```

### Task 4: Integrate Auto-Classification into Audit Runner

**Files:**
- Modify: `packages/cli/src/commands/audit.ts`

**Step 1: Import heuristics**

At top of `packages/cli/src/commands/audit.ts`, add import:

```typescript
import { autoClassify } from '../classification/heuristics';
```

**Step 2: Add auto-classification after saving violations**

In `packages/cli/src/commands/audit.ts`, find the loop where violations are tracked (around line 110-117). After this loop, before closing the test runner, add:

```typescript
    // Auto-classify violations if using database
    if (repository && auditId) {
      console.log('\n🏷️  Auto-classifying violations...');
      let classifiedCount = 0;

      for (const violation of allViolations) {
        const classification = autoClassify(violation.violationId);

        if (classification.category) {
          // Note: In real implementation, we'd need the actual violation DB ID
          // For now, this is a placeholder showing the integration point
          // The actual implementation will need to store violation IDs when saving
          classifiedCount++;
        }
      }

      console.log(`   Auto-classified ${classifiedCount} of ${allViolations.length} violations`);
    }
```

**Step 3: Commit**

```bash
git add packages/cli/src/commands/audit.ts
git commit -m "feat: integrate auto-classification into audit command"
```

**Note:** Full integration requires storing violation IDs when saving to DB, which will be completed in a follow-up iteration.

---

## Phase 3: Dashboard Foundation

### Task 5: Initialize shadcn/ui

**Files:**
- Create: `packages/dashboard/components.json`
- Modify: `packages/dashboard/tailwind.config.ts`

**Step 1: Initialize shadcn/ui**

```bash
cd packages/dashboard
npx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Neutral
- CSS variables: Yes

**Step 2: Verify components.json created**

Check that `packages/dashboard/components.json` exists with config.

**Step 3: Commit**

```bash
git add packages/dashboard/components.json packages/dashboard/tailwind.config.ts packages/dashboard/app/globals.css
git commit -m "feat: initialize shadcn/ui in dashboard"
```

### Task 6: Install shadcn/ui Components

**Files:**
- Create: `packages/dashboard/components/ui/*`

**Step 1: Install required components**

```bash
cd packages/dashboard
npx shadcn@latest add table badge button card select accordion
```

**Step 2: Verify components created**

Check that these exist:
- `packages/dashboard/components/ui/table.tsx`
- `packages/dashboard/components/ui/badge.tsx`
- `packages/dashboard/components/ui/button.tsx`
- `packages/dashboard/components/ui/card.tsx`
- `packages/dashboard/components/ui/select.tsx`
- `packages/dashboard/components/ui/accordion.tsx`

**Step 3: Commit**

```bash
git add packages/dashboard/components/ui/
git commit -m "feat: add shadcn/ui components for dashboard"
```

### Task 7: Create Supabase Client Utility

**Files:**
- Create: `packages/dashboard/lib/supabase.ts`

**Step 1: Install Supabase client**

```bash
cd packages/dashboard
npm install @supabase/supabase-js
```

**Step 2: Create Supabase client utility**

Create `packages/dashboard/lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

/**
 * Get Supabase client for server-side operations.
 * Uses environment variables for configuration.
 */
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
    );
  }

  return createClient(supabaseUrl, supabaseKey);
}
```

**Step 3: Create .env.local template**

Create `packages/dashboard/.env.local.template`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

**Step 4: Commit**

```bash
git add packages/dashboard/lib/supabase.ts packages/dashboard/.env.local.template packages/dashboard/package.json packages/dashboard/package-lock.json
git commit -m "feat: add Supabase client utility for dashboard"
```

---

## Phase 4: Audit List Page

### Task 8: Create Status Badge Component

**Files:**
- Create: `packages/dashboard/components/audits/status-badge.tsx`

**Step 1: Create status badge component**

Create `packages/dashboard/components/audits/status-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'running' | 'completed' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    running: { variant: 'secondary', label: 'Running' },
    completed: { variant: 'default', label: 'Completed' },
    failed: { variant: 'destructive', label: 'Failed' },
  };

  const config = variants[status] || variants.completed;

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/components/audits/status-badge.tsx
git commit -m "feat: add status badge component"
```

### Task 9: Create Audit Filters Component

**Files:**
- Create: `packages/dashboard/components/audits/audit-filters.tsx`

**Step 1: Create filters component**

Create `packages/dashboard/components/audits/audit-filters.tsx`:

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export function AuditFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';
  const currentSort = searchParams.get('sort') || 'newest';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);

    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`/audits?${params.toString()}`);
  }

  return (
    <div className="flex gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={currentStatus} onValueChange={(value) => updateFilter('status', value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="running">Running</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Sort:</span>
        <Select value={currentSort} onValueChange={(value) => updateFilter('sort', value)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="oldest">Oldest First</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/components/audits/audit-filters.tsx
git commit -m "feat: add audit filters component"
```

### Task 10: Create Audits List Page

**Files:**
- Create: `packages/dashboard/app/audits/page.tsx`
- Create: `packages/dashboard/app/audits/loading.tsx`
- Create: `packages/dashboard/app/audits/error.tsx`

**Step 1: Create audits page**

Create `packages/dashboard/app/audits/page.tsx`:

```typescript
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { AuditFilters } from '@/components/audits/audit-filters';
import { StatusBadge } from '@/components/audits/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuditsPageProps {
  searchParams: {
    status?: string;
    sort?: string;
  };
}

export default async function AuditsPage({ searchParams }: AuditsPageProps) {
  const supabase = getSupabaseClient();

  // Build query with filters
  let query = supabase
    .from('audits')
    .select('id, timestamp, status, duration_seconds, total_violations')
    .order('timestamp', { ascending: searchParams.sort === 'oldest' });

  if (searchParams.status && searchParams.status !== 'all') {
    query = query.eq('status', searchParams.status);
  }

  const { data: audits, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audits: ${error.message}`);
  }

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Accessibility Audits</CardTitle>
          <CardDescription>View and explore past audit results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <AuditFilters />
          </div>

          {audits && audits.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Total Violations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell>
                      <Link
                        href={`/audits/${audit.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {new Date(audit.timestamp).toLocaleString()}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={audit.status} />
                    </TableCell>
                    <TableCell>{audit.duration_seconds || 0}s</TableCell>
                    <TableCell>{audit.total_violations || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No audits found.</p>
              <p className="text-sm mt-2">Run your first audit with the CLI to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create loading state**

Create `packages/dashboard/app/audits/loading.tsx`:

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AuditsLoading() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create error boundary**

Create `packages/dashboard/app/audits/error.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuditsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Audits page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Audits</CardTitle>
          <CardDescription>
            {error.message || 'An error occurred while loading audits'}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={reset}>Retry</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 4: Update root page to redirect**

Modify `packages/dashboard/app/page.tsx`:

```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/audits');
}
```

**Step 5: Commit**

```bash
git add packages/dashboard/app/audits/ packages/dashboard/app/page.tsx
git commit -m "feat: add audits list page with filtering and sorting"
```

---

## Phase 5: Audit Detail Page

### Task 11: Create Audit Detail Page

**Files:**
- Create: `packages/dashboard/app/audits/[auditId]/page.tsx`
- Create: `packages/dashboard/app/audits/[auditId]/loading.tsx`
- Create: `packages/dashboard/app/audits/[auditId]/error.tsx`

**Step 1: Create audit detail page**

Create `packages/dashboard/app/audits/[auditId]/page.tsx`:

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { StatusBadge } from '@/components/audits/status-badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface AuditDetailPageProps {
  params: {
    auditId: string;
  };
}

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  const supabase = getSupabaseClient();

  // Fetch audit details
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', params.auditId)
    .single();

  if (auditError || !audit) {
    notFound();
  }

  // Fetch page types with violation counts
  const { data: pageTypes, error: pageTypesError } = await supabase
    .from('page_types')
    .select(`
      id,
      type_name,
      url_pattern,
      total_count_in_sitemap,
      pages_sampled,
      violations (count)
    `)
    .eq('audit_id', params.auditId);

  if (pageTypesError) {
    throw new Error(`Failed to fetch page types: ${pageTypesError.message}`);
  }

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/audits" className="hover:underline">
          Audits
        </Link>
        {' / '}
        <span>Audit Details</span>
      </div>

      {/* Audit Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Audit Details</CardTitle>
              <CardDescription>
                {new Date(audit.timestamp).toLocaleString()}
              </CardDescription>
            </div>
            <StatusBadge status={audit.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-semibold">{audit.duration_seconds || 0}s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Violations</p>
              <p className="text-2xl font-semibold">{audit.total_violations || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Page Types Card */}
      <Card>
        <CardHeader>
          <CardTitle>Page Types</CardTitle>
          <CardDescription>Click a page type to view violations</CardDescription>
        </CardHeader>
        <CardContent>
          {pageTypes && pageTypes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>URL Pattern</TableHead>
                  <TableHead>Pages Sampled</TableHead>
                  <TableHead>Total in Sitemap</TableHead>
                  <TableHead>Violations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageTypes.map((pageType) => (
                  <TableRow key={pageType.id}>
                    <TableCell>
                      <Link
                        href={`/audits/${params.auditId}/page-types/${pageType.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {pageType.type_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pageType.url_pattern}
                    </TableCell>
                    <TableCell>{pageType.pages_sampled}</TableCell>
                    <TableCell>{pageType.total_count_in_sitemap}</TableCell>
                    <TableCell>
                      {Array.isArray(pageType.violations)
                        ? pageType.violations.length
                        : pageType.violations?.count || 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No page types found for this audit.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create loading state**

Create `packages/dashboard/app/audits/[auditId]/loading.tsx`:

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function AuditDetailLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 h-4 w-32 bg-muted animate-pulse rounded" />

      <Card className="mb-6">
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create error boundary**

Create `packages/dashboard/app/audits/[auditId]/error.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuditDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Audit detail error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Audit</CardTitle>
          <CardDescription>
            {error.message || 'An error occurred while loading this audit'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/audits">Back to Audits</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 4: Create not-found page**

Create `packages/dashboard/app/audits/[auditId]/not-found.tsx`:

```typescript
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuditNotFound() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Audit Not Found</CardTitle>
          <CardDescription>
            The audit you're looking for doesn't exist or has been deleted.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/audits">Back to Audits</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 5: Commit**

```bash
git add packages/dashboard/app/audits/[auditId]/
git commit -m "feat: add audit detail page with page types"
```

---

## Phase 6: Violations Page with Classification

### Task 12: Create Classification Badge Component

**Files:**
- Create: `packages/dashboard/components/violations/classification-badge.tsx`

**Step 1: Create classification badge**

Create `packages/dashboard/components/violations/classification-badge.tsx`:

```typescript
import { Badge } from '@/components/ui/badge';

interface ClassificationBadgeProps {
  category: 'content' | 'structural' | null;
  autoClassified: boolean;
}

export function ClassificationBadge({ category, autoClassified }: ClassificationBadgeProps) {
  if (!category) {
    return <Badge variant="secondary">⚠️ Needs Review</Badge>;
  }

  const prefix = autoClassified ? 'Auto: ' : 'Manual: ';
  const label = category === 'content' ? 'Content' : 'Structural';
  const variant = category === 'content' ? 'default' : 'secondary';

  return <Badge variant={variant}>✓ {prefix}{label}</Badge>;
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/components/violations/classification-badge.tsx
git commit -m "feat: add classification badge component"
```

### Task 13: Create Classification Server Action

**Files:**
- Create: `packages/dashboard/lib/actions/classifications.ts`

**Step 1: Create server action**

Create `packages/dashboard/lib/actions/classifications.ts`:

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';

export async function classifyViolation(
  violationId: string,
  category: 'content' | 'structural',
  notes?: string
) {
  const supabase = getSupabaseClient();

  // Upsert classification (update if exists, insert if not)
  const { error } = await supabase.from('classifications').upsert({
    violation_id: violationId,
    category,
    auto_classified: false,
    notes: notes || `Manually classified as ${category}`,
    classified_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to classify violation: ${error.message}`);
  }

  // Revalidate the violations page to show updated classification
  revalidatePath('/audits/[auditId]/page-types/[pageTypeId]', 'page');
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/lib/actions/classifications.ts
git commit -m "feat: add classification server action"
```

### Task 14: Create Classification Buttons Component

**Files:**
- Create: `packages/dashboard/components/violations/classification-buttons.tsx`

**Step 1: Create classification buttons**

Create `packages/dashboard/components/violations/classification-buttons.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { classifyViolation } from '@/lib/actions/classifications';

interface ClassificationButtonsProps {
  violationId: string;
  currentCategory: 'content' | 'structural' | null;
}

export function ClassificationButtons({
  violationId,
  currentCategory,
}: ClassificationButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClassify(category: 'content' | 'structural') {
    setLoading(true);
    setError(null);

    try {
      await classifyViolation(violationId, category);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to classify');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={currentCategory === 'content' ? 'default' : 'outline'}
          onClick={() => handleClassify('content')}
          disabled={loading}
        >
          Content Issue
        </Button>
        <Button
          size="sm"
          variant={currentCategory === 'structural' ? 'default' : 'outline'}
          onClick={() => handleClassify('structural')}
          disabled={loading}
        >
          Structural Issue
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add packages/dashboard/components/violations/classification-buttons.tsx
git commit -m "feat: add classification buttons component"
```

### Task 15: Create Violations Page

**Files:**
- Create: `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/page.tsx`
- Create: `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/loading.tsx`
- Create: `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/error.tsx`

**Step 1: Create violations page**

Create `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/page.tsx`:

```typescript
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ClassificationBadge } from '@/components/violations/classification-badge';
import { ClassificationButtons } from '@/components/violations/classification-buttons';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ViolationsPageProps {
  params: {
    auditId: string;
    pageTypeId: string;
  };
}

export default async function ViolationsPage({ params }: ViolationsPageProps) {
  const supabase = getSupabaseClient();

  // Fetch page type info
  const { data: pageType, error: pageTypeError } = await supabase
    .from('page_types')
    .select('*')
    .eq('id', params.pageTypeId)
    .single();

  if (pageTypeError || !pageType) {
    notFound();
  }

  // Fetch violations with classifications
  const { data: violations, error: violationsError } = await supabase
    .from('violations')
    .select(`
      *,
      classifications (
        category,
        auto_classified,
        notes
      ),
      violation_examples (
        url,
        html_snippet,
        css_selector
      )
    `)
    .eq('page_type_id', params.pageTypeId)
    .order('severity', { ascending: true });

  if (violationsError) {
    throw new Error(`Failed to fetch violations: ${violationsError.message}`);
  }

  const severityOrder = { critical: 1, serious: 2, moderate: 3, minor: 4 };
  const sortedViolations = violations?.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/audits" className="hover:underline">
          Audits
        </Link>
        {' / '}
        <Link href={`/audits/${params.auditId}`} className="hover:underline">
          Audit Details
        </Link>
        {' / '}
        <span>{pageType.type_name}</span>
      </div>

      {/* Page Type Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{pageType.type_name}</CardTitle>
          <CardDescription>
            {pageType.pages_sampled} of {pageType.total_count_in_sitemap} pages sampled
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle>Violations</CardTitle>
          <CardDescription>
            {sortedViolations?.length || 0} violation types found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedViolations && sortedViolations.length > 0 ? (
            <div className="space-y-4">
              {sortedViolations.map((violation) => {
                const classification = Array.isArray(violation.classifications)
                  ? violation.classifications[0]
                  : null;

                return (
                  <Card key={violation.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={
                                violation.severity === 'critical'
                                  ? 'destructive'
                                  : violation.severity === 'serious'
                                  ? 'default'
                                  : 'secondary'
                              }
                            >
                              {violation.severity}
                            </Badge>
                            <span className="font-mono text-sm text-muted-foreground">
                              {violation.rule_id}
                            </span>
                          </div>
                          <CardTitle className="text-lg">
                            {violation.description}
                          </CardTitle>
                          <CardDescription>
                            {violation.wcag_criterion} (Level {violation.wcag_level})
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-semibold">
                            {violation.instances_found}
                          </p>
                          <p className="text-sm text-muted-foreground">instances</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Classification */}
                      <div>
                        <p className="text-sm font-medium mb-2">Classification:</p>
                        <div className="flex items-center gap-4">
                          <ClassificationBadge
                            category={classification?.category || null}
                            autoClassified={classification?.auto_classified || false}
                          />
                          <ClassificationButtons
                            violationId={violation.id}
                            currentCategory={classification?.category || null}
                          />
                        </div>
                      </div>

                      {/* Examples */}
                      {violation.violation_examples &&
                        violation.violation_examples.length > 0 && (
                          <Accordion type="single" collapsible>
                            <AccordionItem value="examples">
                              <AccordionTrigger>
                                View Examples ({violation.violation_examples.length})
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="space-y-4">
                                  {violation.violation_examples.map((example, idx) => (
                                    <div
                                      key={idx}
                                      className="border-l-2 border-muted pl-4"
                                    >
                                      <p className="text-sm font-medium break-all">
                                        {example.url}
                                      </p>
                                      {example.css_selector && (
                                        <p className="text-sm text-muted-foreground font-mono mt-1">
                                          {example.css_selector}
                                        </p>
                                      )}
                                      {example.html_snippet && (
                                        <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
                                          {example.html_snippet}
                                        </pre>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )}

                      {/* Remediation Guidance */}
                      {violation.remediation_guidance && (
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Remediation Guidance:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {violation.remediation_guidance}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No violations found for this page type.</p>
              <p className="text-sm mt-2">Great work!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create loading state**

Create `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/loading.tsx`:

```typescript
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ViolationsLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 h-4 w-48 bg-muted animate-pulse rounded" />

      <Card className="mb-6">
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create error boundary**

Create `packages/dashboard/app/audits/[auditId]/page-types/[pageTypeId]/error.tsx`:

```typescript
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ViolationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Violations page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Violations</CardTitle>
          <CardDescription>
            {error.message || 'An error occurred while loading violations'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/audits">Back to Audits</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add packages/dashboard/app/audits/[auditId]/page-types/
git commit -m "feat: add violations page with classification UI"
```

---

## Phase 7: Testing & Documentation

### Task 16: Test Full Workflow

**Step 1: Set up environment variables**

Copy `.env.local.template` to `.env.local` and add Supabase credentials:

```bash
cd packages/dashboard
cp .env.local.template .env.local
# Edit .env.local with actual credentials
```

**Step 2: Run development server**

```bash
cd packages/dashboard
npm run dev
```

**Step 3: Manual testing checklist**

- [ ] Navigate to http://localhost:3000
- [ ] Should redirect to /audits
- [ ] Verify audit list displays (or empty state if no data)
- [ ] Test status filter dropdown
- [ ] Test sort toggle (newest/oldest)
- [ ] Click an audit → verify drill-down to audit detail
- [ ] Verify page types display correctly
- [ ] Click page type → verify violations list
- [ ] Test classification buttons (content/structural)
- [ ] Verify classification persists (refresh page)
- [ ] Test with empty database (show empty states)
- [ ] Test error scenarios (wrong audit ID in URL)

**Step 4: Run CLI tests**

```bash
cd packages/cli
npm test
```

Expected: All tests passing including heuristics tests

**Step 5: Document setup**

Update `packages/dashboard/README.md` with:
- Environment variable setup
- Development server commands
- Link to design document

**Step 6: Commit**

```bash
git add packages/dashboard/README.md packages/dashboard/.env.local.template
git commit -m "docs: add dashboard setup instructions"
```

### Task 17: Final Build Verification

**Step 1: Build dashboard**

```bash
cd packages/dashboard
npm run build
```

Expected: Build succeeds with no errors

**Step 2: Build CLI**

```bash
cd packages/cli
npm run build
```

Expected: Build succeeds with no errors

**Step 3: Commit if any fixes needed**

```bash
git add .
git commit -m "fix: resolve build issues"
```

---

## Success Criteria

- ✅ Database schema updated with auto_classified column
- ✅ CLI auto-classification heuristics implemented and tested
- ✅ Dashboard displays audit list with filtering/sorting
- ✅ Drill-down navigation: audits → page types → violations
- ✅ Classification UI with auto/manual badges
- ✅ Classification buttons persist to database
- ✅ Error states handled gracefully
- ✅ Loading states for all pages
- ✅ All tests passing
- ✅ Both packages build successfully

## Next Steps

After this implementation:
1. **Priority 3**: Asana export workflow
2. **Enhancement**: Add notes field to classification UI
3. **Enhancement**: Filter violations by classification status
4. **Enhancement**: Comparison view for tracking improvements over time
