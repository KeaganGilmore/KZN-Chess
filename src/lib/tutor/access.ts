import { getCurrentUser } from '@/lib/auth';

/** Returns the current user if they may use the tutor toolkit, else null. */
export async function getTutor() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.is_tutor && user.role !== 'admin') return null;
  return user;
}
