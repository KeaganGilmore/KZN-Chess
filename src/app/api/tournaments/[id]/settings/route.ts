import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_settings')
    .select('*')
    .eq('tournament_id', params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('tournament_settings')
    .update(body)
    .eq('tournament_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
