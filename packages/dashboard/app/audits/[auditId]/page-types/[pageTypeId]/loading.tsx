import { Card, CardContent, CardHeader } from '@/components/ui/card';

export default function ViolationsLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-4 h-4 w-48 bg-muted animate-pulse rounded" />

      <Card className="mb-6">
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
