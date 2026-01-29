import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ClassificationBadge } from '@/components/violations/classification-badge';
import { ClassificationButtons } from '@/components/violations/classification-buttons';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
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
  params: Promise<{
    auditId: string;
    pageTypeId: string;
  }>;
}

export default async function ViolationsPage({ params }: ViolationsPageProps) {
  const { auditId, pageTypeId } = await params;
  const supabase = getSupabaseClient();

  // Fetch page type info
  const { data: pageType, error: pageTypeError } = await supabase
    .from('page_types')
    .select('*')
    .eq('id', pageTypeId)
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
    .eq('page_type_id', pageTypeId)
    .order('severity', { ascending: true });

  if (violationsError) {
    throw new Error(`Failed to fetch violations: ${violationsError.message}`);
  }

  const severityOrder: Record<string, number> = { critical: 1, serious: 2, moderate: 3, minor: 4 };
  const sortedViolations = violations?.sort(
    (a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
  );

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
                          <Link
                            href={`/audits/${auditId}/violations/${violation.id}/examples`}
                            className="block hover:bg-accent rounded-lg p-2 transition-colors"
                          >
                            <p className="text-2xl font-semibold text-primary hover:underline">
                              {violation.instances_found}
                            </p>
                            <p className="text-sm text-muted-foreground">instances →</p>
                          </Link>
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
                                  {violation.violation_examples.map((example: any, idx: number) => (
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
