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
                        : (pageType.violations as any)?.count || 0}
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
