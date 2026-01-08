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
