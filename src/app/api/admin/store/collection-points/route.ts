export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { collectionPointSchema } from '@/lib/store/validation';
import { listCollectionPoints } from '@/lib/store/catalog';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // Admins see inactive points too.
  return NextResponse.json(await listCollectionPoints(false));
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = collectionPointSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid collection point', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('collection_points')
    .insert({
      name: body.name,
      address: body.address ?? null,
      instructions: body.instructions ?? null,
      tournament_id: body.tournament_id ?? null,
      is_active: body.is_active,
      sort_order: body.sort_order,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_collection_point_created',
    entity_type: 'collection_point',
    entity_id: data.id,
    details: { name: body.name, tournament_id: body.tournament_id ?? null },
  });

  return NextResponse.json(data, { status: 201 });
}
