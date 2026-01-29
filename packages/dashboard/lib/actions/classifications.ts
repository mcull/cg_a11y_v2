'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';

export async function classifyViolation(
  violationId: string,
  category: 'content' | 'structural',
  notes?: string
) {
  const supabase = getSupabaseClient();

  // First, try to update existing classification
  const { error: updateError } = await supabase
    .from('classifications')
    .update({
      category,
      auto_classified: false,
      notes: notes || `Manually classified as ${category}`,
      classified_at: new Date().toISOString(),
    })
    .eq('violation_id', violationId);

  // If no rows were updated, insert a new one
  if (updateError?.code === 'PGRST116') {
    const { error: insertError } = await supabase.from('classifications').insert({
      violation_id: violationId,
      category,
      auto_classified: false,
      notes: notes || `Manually classified as ${category}`,
      classified_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`Failed to classify violation: ${insertError.message}`);
    }
  } else if (updateError) {
    throw new Error(`Failed to classify violation: ${updateError.message}`);
  }

  const error = null; // For backwards compatibility with code below

  if (error) {
    throw new Error(`Failed to classify violation: ${error.message}`);
  }

  // Revalidate the violations page to show updated classification
  // Use a broader path to ensure all related pages are refreshed
  revalidatePath('/audits', 'layout');
}
