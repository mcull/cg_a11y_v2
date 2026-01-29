import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ auditId: string }> }
) {
  try {
    const { auditId } = await params;
    const supabase = getSupabaseClient();

    // Soft delete the audit by setting active to false
    const { error } = await supabase
      .from('audits')
      .update({ active: false })
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
