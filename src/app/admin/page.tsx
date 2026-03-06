import { createServerClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const revalidate = 0;

export const metadata = {
  title: 'Admin Dashboard - KZN Chess',
};

async function getData() {
  const supabase = createServerClient();

  const [tournaments, pending, organizers, logs] = await Promise.all([
    supabase.from('tournaments').select('id, status, date', { count: 'exact' }),
    supabase
      .from('tournaments')
      .select('*, district:districts(name), organizer:users(name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('users').select('id', { count: 'exact' }).eq('role', 'organizer'),
    supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const now = new Date();
  const thisMonth = tournaments.data?.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }) || [];

  return {
    totalTournaments: tournaments.count || 0,
    pendingCount: pending.data?.length || 0,
    pendingTournaments: pending.data || [],
    activeOrganizers: organizers.count || 0,
    upcomingThisMonth: thisMonth.length,
    recentLogs: logs.data || [],
  };
}

export default async function AdminPage() {
  const data = await getData();
  return <AdminDashboard data={data} />;
}
