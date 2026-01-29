'use client';

import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'running' | 'completed' | 'failed';
  timestamp?: string;
}

export function StatusBadge({ status, timestamp }: StatusBadgeProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  useEffect(() => {
    if (status === 'running' && timestamp) {
      const updateElapsed = () => {
        const started = new Date(timestamp).getTime();
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - started) / 1000));
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 1000);
      return () => clearInterval(interval);
    }
  }, [status, timestamp]);

  const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
    running: { variant: 'secondary', label: 'Running' },
    completed: { variant: 'default', label: 'Completed' },
    failed: { variant: 'destructive', label: 'Failed' },
  };

  const config = variants[status] || variants.completed;

  // Show warning if running for more than 20 minutes (1200 seconds)
  const isStuck = status === 'running' && elapsedSeconds > 1200;

  if (status === 'running' && timestamp) {
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    return (
      <div className="flex items-center gap-2">
        <Badge variant={isStuck ? 'destructive' : config.variant}>
          {config.label} {timeStr}
        </Badge>
        {isStuck && (
          <AlertTriangle className="w-4 h-4 text-red-600" title="Audit may be stuck" />
        )}
      </div>
    );
  }

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
