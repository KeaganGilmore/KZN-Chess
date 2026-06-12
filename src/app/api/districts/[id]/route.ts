import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  const update: Record<string, any> = {};
  for (const field of ['name', 'region', 'coordinator_name', 'coordinator_email', 'coordinator_phone', 'is_active']) {
    if (field in body) update[field] = body[field];
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }
  if ('name' in update && !String(update.name || '').trim()) {
    return NextResponse.json({ error: 'District name cannot be empty' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('districts')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'district_updated',
    entity_type: 'district',
    entity_id: params.id,
    details: update,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();

  // Refuse deletion while tournaments still reference this district
  const { count } = await supabase
    .from('tournaments')
    .select('id', { count: 'exact', head: true })
    .eq('district_id', params.id);

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${count} tournament${count !== 1 ? 's' : ''} belong to this district. Deactivate it instead.` },
      { status: 409 }
    );
  }

  const { error } = await supabase
    .from('districts')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'district_deleted',
    entity_type: 'district',
    entity_id: params.id,
  });

  return NextResponse.json({ success: true });
}
