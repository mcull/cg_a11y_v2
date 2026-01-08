'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function ViolationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Violations page error:', error);
  }, [error]);

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Violations</CardTitle>
          <CardDescription>
            {error.message || 'An error occurred while loading violations'}
          </CardDescription>
        </CardHeader>
        <CardFooter className="gap-2">
          <Button onClick={reset}>Retry</Button>
          <Button variant="outline" asChild>
            <Link href="/audits">Back to Audits</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
