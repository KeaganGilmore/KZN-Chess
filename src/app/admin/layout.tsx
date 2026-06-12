import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/auth');
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] lg:flex">
      <AdminSidebar />
      <div className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 overflow-auto">{children}</div>
    </div>
  );
}
