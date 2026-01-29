'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteAuditButtonProps {
  auditId: string;
}

export function DeleteAuditButton({ auditId }: DeleteAuditButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this audit? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/audits/${auditId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete audit');
      }

      router.refresh();
    } catch (error) {
      console.error('Error deleting audit:', error);
      alert('Failed to delete audit. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Delete audit"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
