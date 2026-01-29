import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const supabase = getSupabaseClient();

    // Update the audit status to failed
    const { error } = await supabase
      .from('audits')
      .update({ status: 'failed' })
      .eq('id', auditId);

    if (error) {
      return NextResponse.json(
        { error: `Failed to update audit: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
