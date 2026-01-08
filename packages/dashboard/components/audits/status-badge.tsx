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
