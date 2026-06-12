import { createServerClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const revalidate = 0;

export const metadata = {
  title: 'Admin Dashboard - KZN Chess',
};

async function getData() {
  const supabase = createServerClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [tournaments, pending, organizers, totalUsers, thisMonth, logs] = await Promise.all([
    supabase.from('tournaments').select('id', { count: 'exact', head: true }),
    supabase
      .from('tournaments')
      .select('*, district:districts(name), organizer:users(name)', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'organizer'),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .gte('date', monthStart)
      .lte('date', monthEnd),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  return {
    totalTournaments: tournaments.count || 0,
    pendingCount: pending.count || 0,
    pendingTournaments: pending.data || [],
    activeOrganizers: organizers.count || 0,
    totalUsers: totalUsers.count || 0,
    upcomingThisMonth: thisMonth.count || 0,
    recentLogs: logs.data || [],
  };
}

export default async function AdminPage() {
  const data = await getData();
  return <AdminDashboard data={data} />;
}
