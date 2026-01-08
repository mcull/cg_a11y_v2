'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { classifyViolation } from '@/lib/actions/classifications';

interface ClassificationButtonsProps {
  violationId: string;
  currentCategory: 'content' | 'structural' | null;
}

export function ClassificationButtons({
  violationId,
  currentCategory,
}: ClassificationButtonsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClassify(category: 'content' | 'structural') {
    setLoading(true);
    setError(null);

    try {
      await classifyViolation(violationId, category);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to classify');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={currentCategory === 'content' ? 'default' : 'outline'}
          onClick={() => handleClassify('content')}
          disabled={loading}
        >
          Content Issue
        </Button>
        <Button
          size="sm"
          variant={currentCategory === 'structural' ? 'default' : 'outline'}
          onClick={() => handleClassify('structural')}
          disabled={loading}
        >
          Structural Issue
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
