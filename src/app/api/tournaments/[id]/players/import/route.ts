import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';

interface ImportRow {
  name: string;
  fide_id?: string;
  national_id?: string;
  fide_rating?: string | number;
  national_rating?: string | number;
  club?: string;
  district?: string;
  sex?: string;
  category?: string;
}

export async function POST(
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
  const { rows, section_id } = body as { rows: ImportRow[]; section_id?: string };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Get current max starting rank
  const { data: existing } = await supabase
    .from('tournament_players')
    .select('starting_rank')
    .eq('tournament_id', params.id)
    .order('starting_rank', { ascending: false })
    .limit(1);

  let nextRank = (existing?.[0]?.starting_rank || 0) + 1;

  const validCategories = ['open', 'u8', 'u10', 'u12', 'u14', 'u16', 'u18'];
  const validSex = ['M', 'F'];

  const playersToInsert = rows
    .filter(row => row.name && row.name.trim())
    .map(row => {
      const sex = row.sex?.toUpperCase();
      const category = row.category?.toLowerCase();

      return {
        tournament_id: params.id,
        player_name: row.name.trim(),
        fide_id: row.fide_id?.toString().trim() || null,
        chess_sa_id: row.national_id?.toString().trim() || null,
        fide_rating: row.fide_rating ? parseInt(String(row.fide_rating)) || null : null,
        national_rating: row.national_rating ? parseInt(String(row.national_rating)) || null : null,
        club: row.club?.trim() || null,
        district: row.district?.trim() || null,
        sex: sex && validSex.includes(sex) ? sex : null,
        age_category: category && validCategories.includes(category) ? category : 'open',
        section_id: section_id || null,
        starting_rank: nextRank++,
        is_approved: true,
      };
    });

  if (playersToInsert.length === 0) {
    return NextResponse.json({ error: 'No valid players in import data' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tournament_players')
    .insert(playersToInsert)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    imported: data?.length || 0,
    players: data,
  }, { status: 201 });
}
