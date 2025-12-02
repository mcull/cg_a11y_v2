# Creative Growth Accessibility Audit System - Design Document

**Date:** December 1, 2025
**Version:** 2.0
**Status:** Approved

## Executive Summary

This document describes the design for `cg_a11y_v2`, a comprehensive accessibility audit management system for Creative Growth's ArtCloud-hosted website. The system enables automated accessibility testing, progress tracking, and coordination between Creative Growth (content fixes) and ArtCloud (structural fixes).

## Background

Creative Growth is an art non-profit using ArtCloud as their website platform. They need to audit their site against the highest accessibility standards (WCAG, Section 508, ADA) and coordinate remediation work between:
- **Creative Growth** - Content fixes they can make through the CMS
- **ArtCloud** - Structural/platform fixes requiring code changes

The site contains thousands of pages across a small number of page types (artists, artworks, blog posts, etc.). Version 1 performed basic audits but was slow, couldn't handle scale, and lacked page type clustering and progress tracking.

## System Goals

1. **Comprehensive testing** against multiple accessibility standards
2. **Efficient crawling** of thousands of pages through adaptive sampling
3. **Aggregated reporting** by page type, not individual pages
4. **Clear categorization** of issues (content vs structural fixes)
5. **Progress tracking** over time with historical comparison
6. **Asana integration** for workflow management
7. **Stakeholder visibility** through an accessible dashboard

## Architecture Overview

### Three-Tier System

**1. CLI Core (`cg-a11y-cli`)**
- Node.js command-line tool
- Orchestrates audit process: sitemap parsing, page type detection, adaptive sampling, accessibility testing
- Runs axe-core and Pa11y tests against sampled pages
- Outputs structured JSON results
- Can run locally, in CI/CD, or triggered remotely by dashboard

**2. Storage Layer (Supabase)**
- PostgreSQL database storing:
  - Audit runs and configurations
  - Page types and sampling metadata
  - Aggregated violations by page type
  - Individual page samples for drill-down
  - User classifications (content vs structural)
  - Asana export history
- Enables historical tracking and comparison

**3. Dashboard (Next.js)**
- Web application providing:
  - Audit history and trend visualization
  - Current punchlist aggregated by page type
  - Manual classification UI
  - Asana export workflow with preview
  - "Run New Audit" button
  - Historical comparison views
  - Simple authentication (email/password)

### Integration Flow

```
CLI → JSON results → Dashboard ingests → Supabase stores → Dashboard visualizes → Asana export
```

## Crawling and Page Type Detection

### Sitemap-Driven Discovery

The CLI fetches and parses `sitemap.xml` to discover all pages. It extracts:
- All URLs
- Metadata (last modified, priority if available)
- Total count per page type

### Page Type Classification

URL pattern matching using configurable patterns:

```yaml
patterns:
  - pattern: "/artists/*"
    type: "Artist Page"
  - pattern: "/artworks/*"
    type: "Artwork Page"
  - pattern: "/blog/*"
    type: "Blog Post"
  - pattern: "/*"
    type: "Other"
```

The tool counts pages per type (e.g., "957 Artist Pages") to provide context for aggregated reporting.

### Adaptive Sampling Strategy

To handle thousands of pages efficiently:

1. **Initial sample:** Test first 10 pages of each page type
2. **Run tests:** Execute both axe-core and Pa11y on each sampled page
3. **Analyze consistency:** After 10 samples, check if violations are consistent (>90% overlap)
4. **Adaptive decision:**
   - If violations are identical/highly similar → stop sampling that page type
   - If violations vary significantly → continue testing up to 25-50 pages
5. **Record transparency:** Track "tested X of Y pages" for each page type

### Violation Tracking

For each violation found, record:
- Which page type(s) it appears on
- Number of sampled pages with the violation
- Extrapolated count (if consistent across samples)
- Specific example URLs
- Affected elements count

**Example output:**
> Artist Pages: Missing alt text on images (WCAG 1.1.1 Level A)
> Found on 10/10 sampled pages, likely affects ~957 pages, ~2,800 image elements

This approach reduces audit time from hours (v1) to 10-15 minutes while maintaining comprehensiveness.

## Testing Engine Integration

### Technology Stack

- **Browser automation:** Puppeteer (headless Chrome)
- **Accessibility engines:**
  - `@axe-core/puppeteer` (Deque Systems' industry standard)
  - `pa11y` (HTML CodeSniffer-based)
- **Multiple engines** provide broader coverage through complementary rule sets

### Test Execution Flow

For each sampled URL:

1. Load page in Puppeteer
2. Run axe-core scan in parallel with Pa11y scan
3. Collect results from both engines
4. Merge and deduplicate violations

### Violation Structure

Both engines return:
- **Rule ID** (e.g., "color-contrast", "image-alt")
- **WCAG criteria** (e.g., "1.4.3 Contrast", level AA)
- **Severity** (critical, serious, moderate, minor)
- **Affected elements** (CSS selectors, HTML snippets)
- **Description and remediation guidance**

### Result Aggregation

Multi-level aggregation:

1. **Deduplicate** identical violations from both engines
2. **Group by** page type + rule ID + WCAG criterion
3. **Count instances** per page type
4. **Calculate extrapolated totals** based on sampling confidence

**Output format:**
```
Page Type: Artist Pages
Violation: Missing alt text on images
WCAG: 1.1.1 Level A
Severity: Critical
Found on: 10/10 sampled pages
Likely affects: ~957 pages
Total instances: ~2,800 image elements
```

## Dashboard Features and UI

### Main Views

#### 1. Audit History Page
- Timeline of all audits (date, duration, total violations)
- Trend chart showing violations over time
- Color-coded by severity (critical/high/medium/low)
- Click any audit to view full report

#### 2. Current Punchlist (Primary View)
- Aggregated violations from most recent audit
- Organized by page type (tabs or sections)
- Each violation displays:
  - Issue description and WCAG criterion
  - Severity badge
  - Extrapolated impact ("~957 pages, ~2,800 instances")
  - Example URLs where found
  - Classification status: Unclassified / Content / Structural
  - Remediation guidance
- **Filters:** by severity, by classification, by WCAG level
- **Sort:** by impact, by severity, by page type

#### 3. Classification Workflow
- Bulk select violations to classify as "Content" or "Structural"
- Add notes explaining classification (shown in Asana export)
- Visual indicators for export-ready items
- Manual classification ensures accurate categorization based on CMS capabilities

#### 4. Asana Export Preview
- Shows exactly what will be created in Asana
- Two sections:
  - "Creative Growth - Content Fixes"
  - "ArtCloud - Structural Fixes"
- Each violation becomes one Asana task with:
  - Title: Rule description
  - Description: WCAG criterion, impact, remediation, example URLs
  - Priority: Based on severity
  - Tags: WCAG level, page type
- Confirm and export button

#### 5. Comparison View
- Compare two audit runs side-by-side
- Shows:
  - New issues
  - Fixed issues
  - Ongoing issues
- Celebrate progress: "42 issues resolved since last audit"

### Authentication

- Start simple: email/password via Supabase Auth
- Future: team features and role-based access if needed

## Database Schema

### Core Tables

#### `audits`
- `id` (uuid, primary key)
- `timestamp` (timestamptz)
- `status` (enum: running, completed, failed)
- `config_used` (jsonb - URL patterns, sampling rules)
- `total_violations` (integer)
- `duration_seconds` (integer)

#### `page_types`
- `id` (uuid, primary key)
- `audit_id` (uuid, foreign key)
- `type_name` (text - "Artist Page", "Artwork Page", etc.)
- `url_pattern` (text)
- `total_count_in_sitemap` (integer)
- `pages_sampled` (integer)

#### `violations`
- `id` (uuid, primary key)
- `audit_id` (uuid, foreign key)
- `page_type_id` (uuid, foreign key)
- `rule_id` (text)
- `wcag_criterion` (text)
- `wcag_level` (text - A, AA, AAA)
- `severity` (enum: critical, serious, moderate, minor)
- `description` (text)
- `instances_found` (integer)
- `extrapolated_total` (integer)
- `remediation_guidance` (text)

#### `violation_examples`
- `id` (uuid, primary key)
- `violation_id` (uuid, foreign key)
- `url` (text)
- `html_snippet` (text)
- `css_selector` (text)

#### `classifications`
- `id` (uuid, primary key)
- `violation_id` (uuid, foreign key)
- `category` (enum: content, structural)
- `notes` (text)
- `classified_by` (uuid, foreign key to users)
- `classified_at` (timestamptz)

#### `asana_exports`
- `id` (uuid, primary key)
- `violation_id` (uuid, foreign key)
- `asana_task_id` (text)
- `section` (enum: content, structural)
- `exported_at` (timestamptz)

### Schema Benefits

- Historical tracking and comparison between audits
- Prevents duplicate Asana task creation
- Enables drill-down from aggregated to specific examples
- Supports trend analysis and progress visualization

## Asana Integration

### Workflow

1. User classifies violations in dashboard (content vs structural)
2. Clicks "Preview Asana Export"
3. Dashboard generates mock-up of Asana tasks to be created
4. User confirms export
5. Dashboard calls Asana API:
   - Creates/updates project sections: "Content Fixes" and "Structural Fixes"
   - Creates one task per violation with full details
6. Records export in database to prevent duplicates
7. Future exports only send new/unclassified violations

### Task Structure

Each Asana task includes:
- **Title:** Rule description (e.g., "Missing alt text on images")
- **Description:**
  - WCAG criterion and level
  - Impact metrics (pages affected, instances)
  - Remediation guidance
  - Example URLs
- **Priority:** Mapped from severity (critical → high priority)
- **Tags:** WCAG level, page type, category
- **Section:** "Content Fixes" or "Structural Fixes"

### Configuration Notes

Asana integration is optional/configurable. The system works without it. API key can be added later when obtained from Creative Growth staff.

## Technical Stack

### CLI (`cg-a11y-cli`)

**Language:** Node.js with TypeScript

**Key Dependencies:**
- `puppeteer` - Headless browser automation
- `@axe-core/puppeteer` - Axe accessibility testing
- `pa11y` - Alternative accessibility testing engine
- `fast-xml-parser` - Sitemap parsing
- `@supabase/supabase-js` - Database client
- Configuration via YAML or JSON

**Output:**
- JSON results file (machine-readable)
- Optional console summary (human-readable)

### Dashboard

**Framework:** Next.js 14+ (App Router)

**Key Technologies:**
- **Styling:** Tailwind CSS + shadcn/ui components
- **Charts:** Recharts or similar for trend visualization
- **Auth:** Supabase Auth (email/password)
- **API Routes:** Next.js API routes for:
  - Triggering CLI remotely
  - Asana integration
  - Data ingestion from CLI JSON output

**Deployment:** Vercel (recommended) or similar platform

### Database

**Platform:** Supabase (managed PostgreSQL)

**Features:**
- Row Level Security policies for future multi-user support
- Automatic timestamps on all tables
- Soft deletes where appropriate

## Audit Trigger Mechanisms

Multiple ways to initiate audits:

1. **Manual CLI** - Run command locally for quick checks
2. **Scheduled** - Automatic audits (daily/weekly/monthly) via cron or GitHub Actions
3. **Dashboard button** - On-demand via "Run New Audit" in web UI
4. **CI/CD integration** - Trigger on deployment or content changes

This flexibility supports both ad-hoc testing and continuous monitoring.

## Performance Considerations

### CLI Optimization
- Parallel page testing (configurable concurrency)
- Adaptive sampling reduces unnecessary tests
- Efficient sitemap parsing
- Connection pooling for database writes

### Expected Performance
- **v1:** Hours for comprehensive audit
- **v2:** 10-15 minutes for thousands of pages

### Scalability
- Supabase handles historical data growth
- Dashboard pagination for large result sets
- Indexed database queries for fast comparisons

## Future Enhancements

Potential features for future versions:

- **Multi-site support** - Audit multiple Creative Growth properties
- **Custom rule creation** - Organization-specific accessibility rules
- **Scheduled reports** - Email digests of audit results
- **API endpoints** - Programmatic access to audit data
- **Jira/Linear integration** - Alternative to Asana
- **Screenshot capture** - Visual documentation of violations
- **Team collaboration** - Comments, assignments, approval workflows

## Success Metrics

The system will be considered successful if it:

1. Completes full audits in <15 minutes
2. Accurately clusters violations by page type
3. Clearly distinguishes content vs structural issues
4. Shows measurable improvement in accessibility scores over time
5. Reduces manual coordination effort between Creative Growth and ArtCloud
6. Provides actionable, understandable reports for non-technical stakeholders

## Implementation Approach

Recommended implementation order:

1. **Phase 1: CLI Core**
   - Sitemap parsing and page type detection
   - Adaptive sampling logic
   - Axe-core integration
   - JSON output format

2. **Phase 2: Database**
   - Supabase setup and schema
   - CLI → database integration
   - Basic data ingestion

3. **Phase 3: Testing Enhancement**
   - Pa11y integration
   - Result merging and deduplication
   - Aggregation logic

4. **Phase 4: Dashboard Foundation**
   - Next.js setup
   - Authentication
   - Audit history view
   - Current punchlist view

5. **Phase 5: Classification & Export**
   - Classification UI
   - Asana integration
   - Export workflow

6. **Phase 6: Analysis Features**
   - Comparison view
   - Trend visualization
   - Progress metrics

---

**Approved by:** Marc Cull
**Date:** December 1, 2025
