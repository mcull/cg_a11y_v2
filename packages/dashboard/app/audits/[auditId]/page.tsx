import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { StatusBadge } from '@/components/audits/status-badge';

export const dynamic = 'force-dynamic';
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
  params: Promise<{
    auditId: string;
  }>;
}

export default async function AuditDetailPage({ params }: AuditDetailPageProps) {
  const { auditId } = await params;
  const supabase = getSupabaseClient();

  // Fetch audit details (only if active)
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .eq('active', true)
    .single();

  if (auditError || !audit) {
    notFound();
  }

  // Fetch page types with violation data
  const { data: pageTypes, error: pageTypesError } = await supabase
    .from('page_types')
    .select(`
      id,
      type_name,
      url_pattern,
      total_count_in_sitemap,
      pages_sampled,
      violations (
        instances_found,
        extrapolated_total
      )
    `)
    .eq('audit_id', auditId);

  if (pageTypesError) {
    throw new Error(`Failed to fetch page types: ${pageTypesError.message}`);
  }

  // Fetch classification breakdown
  const { data: classificationData, error: classificationError } = await supabase
    .from('violations')
    .select(`
      id,
      extrapolated_total,
      classifications (
        category
      )
    `)
    .eq('audit_id', auditId);

  if (classificationError) {
    throw new Error(`Failed to fetch classifications: ${classificationError.message}`);
  }

  // Calculate classification breakdown
  let contentViolations = 0;
  let structuralViolations = 0;
  let unclassifiedViolations = 0;

  classificationData?.forEach((violation: any) => {
    const total = violation.extrapolated_total || 0;
    const classification = Array.isArray(violation.classifications) && violation.classifications[0];

    if (classification) {
      if (classification.category === 'content') {
        contentViolations += total;
      } else if (classification.category === 'structural') {
        structuralViolations += total;
      }
    } else {
      unclassifiedViolations += total;
    }
  });

  // Calculate violation totals for each page type
  const pageTypesWithCounts = pageTypes?.map((pageType) => {
    const violations = Array.isArray(pageType.violations) ? pageType.violations : [];
    const totalInstances = violations.reduce((sum, v: any) => sum + (v.instances_found || 0), 0);
    const totalExtrapolated = violations.reduce((sum, v: any) => sum + (v.extrapolated_total || 0), 0);

    return {
      ...pageType,
      violationCount: violations.length,
      totalInstances,
      totalExtrapolated,
    };
  }) || [];

  // Calculate total violations across all page types
  const totalViolationsFound = pageTypesWithCounts.reduce((sum, pt) => sum + pt.totalExtrapolated, 0);

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-2xl font-semibold">{audit.duration_seconds || 0}s</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Violations</p>
              <p className="text-2xl font-semibold">{totalViolationsFound.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Content Issues</p>
              <p className="text-2xl font-semibold text-blue-600">{contentViolations.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Structural Issues</p>
              <p className="text-2xl font-semibold text-purple-600">{structuralViolations.toLocaleString()}</p>
            </div>
          </div>
          {unclassifiedViolations > 0 && (
            <p className="text-sm text-muted-foreground mt-4">
              {unclassifiedViolations.toLocaleString()} violations not yet classified
            </p>
          )}
        </CardContent>
      </Card>

      {/* Page Types Card */}
      <Card>
        <CardHeader>
          <CardTitle>Page Types</CardTitle>
          <CardDescription>Click a page type to view violations</CardDescription>
        </CardHeader>
        <CardContent>
          {pageTypesWithCounts && pageTypesWithCounts.length > 0 ? (
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
                {pageTypesWithCounts.map((pageType) => (
                  <TableRow key={pageType.id}>
                    <TableCell>
                      <Link
                        href={`/audits/${auditId}/page-types/${pageType.id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {pageType.type_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {pageType.url_pattern}
                    </TableCell>
                    <TableCell>{pageType.pages_sampled}</TableCell>
                    <TableCell>{pageType.total_count_in_sitemap.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-semibold">{pageType.totalExtrapolated.toLocaleString()}</div>
                        <div className="text-muted-foreground text-xs">
                          {pageType.violationCount} unique types
                        </div>
                      </div>
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
