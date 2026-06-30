import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import type { UserRole } from '@/lib/types';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;
  return session.user as {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    is_tutor: boolean;
    district_id: string | null;
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireRole(role: 'organizer' | 'admin') {
  const user = await requireAuth();
  if (role === 'admin' && user.role !== 'admin') throw new Error('Forbidden');
  if (role === 'organizer' && !['organizer', 'admin'].includes(user.role)) throw new Error('Forbidden');
  return user;
}
