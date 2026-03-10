/**
 * Tournament access control helpers
 * Checks if a user is a director or arbiter for a tournament
 */

import { createServerClient } from '@/lib/supabase/server';

export async function isTournamentManager(
  tournamentId: string,
  userId: string
): Promise<boolean> {
  const supabase = createServerClient();

  // Check if user is the tournament organizer (auto-director)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('organizer_id')
    .eq('id', tournamentId)
    .single();

  if (tournament?.organizer_id === userId) return true;

  // Check tournament_arbiters table
  const { data: arbiter } = await supabase
    .from('tournament_arbiters')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  return !!arbiter;
}

export async function getTournamentRole(
  tournamentId: string,
  userId: string
): Promise<'director' | 'arbiter' | null> {
  const supabase = createServerClient();

  const { data: arbiter } = await supabase
    .from('tournament_arbiters')
    .select('role')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  if (arbiter) return arbiter.role;

  // Check if organizer (implicitly a director)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('organizer_id')
    .eq('id', tournamentId)
    .single();

  if (tournament?.organizer_id === userId) return 'director';

  return null;
}

export async function requireTournamentManager(
  tournamentId: string,
  userId: string,
  userRole?: string
): Promise<void> {
  if (userRole === 'admin') return; // Admins can manage all tournaments

  const isManager = await isTournamentManager(tournamentId, userId);
  if (!isManager) {
    throw new Error('Forbidden: You are not a director or arbiter for this tournament');
  }
}
