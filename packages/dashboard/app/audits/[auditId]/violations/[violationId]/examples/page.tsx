import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const dynamic = 'force-dynamic';

interface ViolationExamplesPageProps {
  params: Promise<{
    auditId: string;
    violationId: string;
  }>;
}

export default async function ViolationExamplesPage({
  params,
}: ViolationExamplesPageProps) {
  const { auditId, violationId } = await params;
  const supabase = getSupabaseClient();

  // Fetch violation details
  const { data: violation, error: violationError } = await supabase
    .from('violations')
    .select(`
      *,
      page_types (
        type_name,
        audit_id
      )
    `)
    .eq('id', violationId)
    .single();

  if (violationError || !violation) {
    notFound();
  }

  // Fetch all violation examples
  const { data: examples, error: examplesError } = await supabase
    .from('violation_examples')
    .select('*')
    .eq('violation_id', violationId)
    .order('url', { ascending: true });

  if (examplesError) {
    throw new Error(`Failed to fetch violation examples: ${examplesError.message}`);
  }

  const pageType = Array.isArray(violation.page_types)
    ? violation.page_types[0]
    : violation.page_types;

  return (
    <div className="container mx-auto py-8">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm text-muted-foreground">
        <Link href="/audits" className="hover:underline">
          Audits
        </Link>
        {' / '}
        <Link href={`/audits/${auditId}`} className="hover:underline">
          Audit Details
        </Link>
        {' / '}
        <span>Violation Examples</span>
      </div>

      {/* Violation Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start gap-4">
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
              <CardTitle className="text-2xl">{violation.description}</CardTitle>
              <CardDescription className="mt-2">
                {violation.wcag_criterion} (Level {violation.wcag_level})
                {pageType && ` • ${pageType.type_name}`}
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-3xl font-semibold">{violation.instances_found}</p>
              <p className="text-sm text-muted-foreground">instances found</p>
              {violation.extrapolated_total && (
                <p className="text-sm text-muted-foreground mt-1">
                  ~{violation.extrapolated_total.toLocaleString()} total estimated
                </p>
              )}
            </div>
          </div>
        </CardHeader>
        {violation.remediation_guidance && (
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium mb-2">Remediation Guidance:</p>
              <a
                href={violation.remediation_guidance}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {violation.remediation_guidance}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Examples List */}
      <Card>
        <CardHeader>
          <CardTitle>Affected Pages</CardTitle>
          <CardDescription>
            {examples?.length || 0} pages with this violation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {examples && examples.length > 0 ? (
            <div className="space-y-2">
              {examples.map((example, idx) => (
                <div
                  key={example.id}
                  className="border rounded-lg p-4 hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground mb-1">
                        Page {idx + 1}
                      </p>
                      <a
                        href={example.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline break-all flex items-center gap-2"
                      >
                        {example.url}
                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      </a>
                      {example.css_selector && (
                        <p className="text-xs text-muted-foreground font-mono mt-2">
                          Selector: {example.css_selector}
                        </p>
                      )}
                    </div>
                  </div>
                  {example.html_snippet && (
                    <pre className="text-xs bg-muted p-3 rounded mt-3 overflow-x-auto">
                      {example.html_snippet}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>No examples found for this violation.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
