import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const supabase = getSupabaseClient();

    // Delete the audit (cascade will handle related records)
    const { error } = await supabase
      .from('audits')
      .delete()
      .eq('id', auditId);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete audit: ${error.message}` },
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
