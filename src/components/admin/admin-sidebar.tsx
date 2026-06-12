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
  UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/admin/organizers', label: 'Organizers', icon: UserCog },
  { href: '/admin/districts', label: 'Districts', icon: MapPin },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/content', label: 'Site Content', icon: FileText },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/logs', label: 'Audit Log', icon: ScrollText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4 gap-1 shrink-0">
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

      {/* Mobile/tablet horizontal nav */}
      <nav className="lg:hidden sticky top-16 z-40 bg-card/95 backdrop-blur-sm border-b border-border">
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0',
                pathname === link.href
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
              )}
            >
              <link.icon className="w-3.5 h-3.5" />
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
