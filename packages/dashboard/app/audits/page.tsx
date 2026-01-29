import Link from 'next/link';
import Image from 'next/image';
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

  // Build query with filters (only show active audits)
  let query = supabase
    .from('audits')
    .select('id, timestamp, status, duration_seconds, total_violations')
    .eq('active', true)
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
      {/* Header Section with Logos */}
      <div className="mb-8 flex items-start justify-between gap-8">
        <div className="flex-shrink-0">
          <Image
            src="/cglogo.png"
            alt="Creative Growth"
            width={180}
            height={80}
            className="h-auto w-auto"
            priority
          />
        </div>

        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                These accessibility audits are powered by{' '}
                <a
                  href="https://www.deque.com/axe/axe-core/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  Deque's axe-core
                </a>{' '}
                testing engine:
              </p>
              <blockquote className="border-l-3 border-muted-foreground/30 pl-4 text-sm text-muted-foreground leading-relaxed italic">
                Axe-core's rules library is constantly updated and covers WCAG 2.0, 2.1, and 2.2 at levels A, AA, and AAA. The testing engine also adheres to rules outlined in global accessibility standards and regulations such as Section 508, EN 301 549, RGAA, and ADA, enabling you to ensure you're meeting all your compliance requirements.
              </blockquote>
            </div>
            <a
              href="https://www.deque.com/axe/axe-core/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
            >
              <Image
                src="/deque-logo.svg"
                alt="Deque Systems"
                width={120}
                height={40}
                className="h-auto w-auto"
              />
            </a>
          </div>
        </div>
      </div>

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
