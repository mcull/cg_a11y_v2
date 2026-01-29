'use client';

import { XCircle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MarkFailedButtonProps {
  auditId: string;
}

export function MarkFailedButton({ auditId }: MarkFailedButtonProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  const handleMarkFailed = async () => {
    if (!confirm('Mark this audit as failed? This will stop it from showing as running.')) {
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/audits/${auditId}/mark-failed`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to mark audit as failed');
      }

      router.refresh();
    } catch (error) {
      console.error('Error marking audit as failed:', error);
      alert('Failed to update audit status. Please try again.');
      setIsUpdating(false);
    }
  };

  return (
    <button
      onClick={handleMarkFailed}
      disabled={isUpdating}
      className="text-orange-600 hover:text-orange-800 disabled:opacity-50 disabled:cursor-not-allowed mr-2"
      title="Mark as failed"
    >
      <XCircle className="w-4 h-4" />
    </button>
  );
}
