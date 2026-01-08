'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuditsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Audits page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Audits</CardTitle>
          <CardDescription>
            {error.message || 'An error occurred while loading audits'}
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={reset}>Retry</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
