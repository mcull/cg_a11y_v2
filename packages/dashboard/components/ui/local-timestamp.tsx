'use client';

interface LocalTimestampProps {
  timestamp: string;
  className?: string;
}

export function LocalTimestamp({ timestamp, className }: LocalTimestampProps) {
  return (
    <time dateTime={timestamp} className={className}>
      {new Date(timestamp).toLocaleString()}
    </time>
  );
}
