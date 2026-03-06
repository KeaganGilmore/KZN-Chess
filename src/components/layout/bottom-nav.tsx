'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Trophy, Info, User, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as any;

  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/tournaments', label: 'Tournaments', icon: Trophy },
    { href: '/about', label: 'About', icon: Info },
    ...(user?.role === 'admin'
      ? [{ href: '/admin', label: 'Admin', icon: LayoutDashboard }]
      : []),
    { href: session ? '/auth' : '/auth', label: session ? 'Account' : 'Sign In', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 px-2">
        {links.map((link) => {
          const isActive = pathname === link.href ||
            (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <link.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
