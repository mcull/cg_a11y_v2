import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase';
import { AuditFilters } from '@/components/audits/audit-filters';
import { StatusBadge } from '@/components/audits/status-badge';
import { LocalTimestamp } from '@/components/ui/local-timestamp';
import { DeleteAuditButton } from '@/components/audits/delete-audit-button';
import { MarkFailedButton } from '@/components/audits/mark-failed-button';

export const dynamic = 'force-dynamic';
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
  searchParams: Promise<{
    status?: string;
    sort?: string;
  }>;
}

export default async function AuditsPage({ searchParams }: AuditsPageProps) {
  const { status, sort } = await searchParams;
  const supabase = getSupabaseClient();

  // Build query with filters
  let query = supabase
    .from('audits')
    .select('id, timestamp, status, duration_seconds, total_violations')
    .order('timestamp', { ascending: sort === 'oldest' });

  if (status && status !== 'all') {
    query = query.eq('status', status);
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
                  <TableHead className="w-[50px]"></TableHead>
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
                        <LocalTimestamp timestamp={audit.timestamp} />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={audit.status} timestamp={audit.timestamp} />
                    </TableCell>
                    <TableCell>{audit.duration_seconds || 0}s</TableCell>
                    <TableCell>{audit.total_violations || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {audit.status === 'running' && (
                          <MarkFailedButton auditId={audit.id} />
                        )}
                        <DeleteAuditButton auditId={audit.id} />
                      </div>
                    </TableCell>
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
