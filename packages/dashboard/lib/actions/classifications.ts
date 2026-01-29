'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';

export async function classifyViolation(
  violationId: string,
  category: 'content' | 'structural',
  notes?: string
) {
  const supabase = getSupabaseClient();

  // Upsert classification (update if exists, insert if not)
  const { error } = await supabase.from('classifications').upsert(
    {
      violation_id: violationId,
      category,
      auto_classified: false,
      notes: notes || `Manually classified as ${category}`,
      classified_at: new Date().toISOString(),
    },
    {
      onConflict: 'violation_id',
    }
  );

  if (error) {
    throw new Error(`Failed to classify violation: ${error.message}`);
  }

  // Revalidate the violations page to show updated classification
  // Use a broader path to ensure all related pages are refreshed
  revalidatePath('/audits', 'layout');
}
