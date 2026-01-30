import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase';
import { ClassificationBadge } from '@/components/violations/classification-badge';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ViolationsByCategoryPageProps {
  params: Promise<{
    auditId: string;
    category: string;
  }>;
}

export default async function ViolationsByCategoryPage({ params }: ViolationsByCategoryPageProps) {
  const { auditId, category } = await params;

  // Validate category
  if (category !== 'content' && category !== 'structural') {
    notFound();
  }

  const supabase = getSupabaseClient();

  // Fetch audit details
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('timestamp')
    .eq('id', auditId)
    .single();

  if (auditError || !audit) {
    notFound();
  }

  // Fetch all violations for this audit
  const { data: violations } = await supabase
    .from('violations')
    .select('*')
    .eq('audit_id', auditId);

  // Fetch classifications
  const violationIds = violations?.map((v) => v.id) || [];
  const { data: classifications } = await supabase
    .from('classifications')
    .select('*')
    .in('violation_id', violationIds)
    .eq('category', category);

  // Create a map of violation_id to classification
  const classificationMap = new Map(
    classifications?.map((c) => [c.violation_id, c]) || []
  );

  // Filter violations that have the specified classification
  const filteredViolations = violations?.filter((v) => classificationMap.has(v.id)) || [];

  // Fetch page type names for display
  const pageTypeIds = [...new Set(filteredViolations.map((v) => v.page_type_id))];
  const { data: pageTypes } = await supabase
    .from('page_types')
    .select('id, type_name')
    .in('id', pageTypeIds);

  const pageTypeMap = new Map(
    pageTypes?.map((pt) => [pt.id, pt.type_name]) || []
  );

  // Sort by severity
  const severityOrder: Record<string, number> = { critical: 1, serious: 2, moderate: 3, minor: 4 };
  const sortedViolations = filteredViolations.sort(
    (a, b) => (severityOrder[a.severity] || 99) - (severityOrder[b.severity] || 99)
  );

  // Calculate totals
  const totalExtrapolated = sortedViolations.reduce((sum, v) => sum + (v.extrapolated_total || 0), 0);

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
        <span>{category === 'content' ? 'Content' : 'Structural'} Issues</span>
      </div>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {category === 'content' ? 'Content' : 'Structural'} Issues
          </CardTitle>
          <CardDescription>
            {sortedViolations.length} violation types • {totalExtrapolated.toLocaleString()} total instances (extrapolated)
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Violations List */}
      <div className="space-y-4">
        {sortedViolations.length > 0 ? (
          sortedViolations.map((violation) => {
            const classification = classificationMap.get(violation.id);
            const pageTypeName = pageTypeMap.get(violation.page_type_id) || 'Unknown';

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
                        <ClassificationBadge
                          category={classification?.category || null}
                          autoClassified={classification?.auto_classified || false}
                        />
                      </div>
                      <CardTitle className="text-lg mb-1">
                        {violation.description}
                      </CardTitle>
                      <CardDescription>
                        {violation.wcag_criterion} (Level {violation.wcag_level}) • Page Type: {pageTypeName}
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
                {violation.remediation_guidance && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Remediation: </span>
                      <a
                        href={violation.remediation_guidance}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {violation.remediation_guidance}
                      </a>
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <p>No {category} violations found.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
