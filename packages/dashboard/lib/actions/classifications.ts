'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseClient } from '@/lib/supabase';

export async function classifyViolation(
  violationId: string,
  category: 'content' | 'structural',
  notes?: string
) {
  const supabase = getSupabaseClient();

  // Check if classification already exists
  const { data: existing } = await supabase
    .from('classifications')
    .select('id')
    .eq('violation_id', violationId)
    .maybeSingle();

  if (existing) {
    // Update existing classification
    const { error } = await supabase
      .from('classifications')
      .update({
        category,
        auto_classified: false,
        notes: notes || `Manually classified as ${category}`,
        classified_at: new Date().toISOString(),
      })
      .eq('violation_id', violationId);

    if (error) {
      throw new Error(`Failed to update classification: ${error.message}`);
    }
  } else {
    // Insert new classification
    const { error } = await supabase.from('classifications').insert({
      violation_id: violationId,
      category,
      auto_classified: false,
      notes: notes || `Manually classified as ${category}`,
      classified_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to insert classification: ${error.message}`);
    }
  }

  // Revalidate the violations page to show updated classification
  // Use a broader path to ensure all related pages are refreshed
  revalidatePath('/audits', 'layout');
}
