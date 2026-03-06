'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Users,
  MapPin,
  FileText,
  Megaphone,
  ScrollText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/organizers', label: 'Organizers', icon: Users },
  { href: '/admin/districts', label: 'Districts', icon: MapPin },
  { href: '/admin/content', label: 'Site Content', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Audit Log', icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4 gap-1">
      <div className="px-3 py-2 mb-4">
        <h2 className="text-sm font-semibold text-primary">Admin CMS</h2>
        <p className="text-xs text-muted-foreground">Manage KZN Chess</p>
      </div>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
            pathname === link.href
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
          )}
        >
          <link.icon className="w-4 h-4" />
          {link.label}
        </Link>
      ))}
    </aside>
  );
}
