import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AuditNotFound() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Audit Not Found</CardTitle>
          <CardDescription>
            The audit you're looking for doesn't exist or has been deleted.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href="/audits">Back to Audits</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
