'use client';

import Link from 'next/link';
import { signOut } from 'next-auth/react';
import {
  Trophy,
  LayoutDashboard,
  LogOut,
  User,
  PlusCircle,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface AccountPanelProps {
  user: {
    name: string;
    email: string;
    role: 'player' | 'organizer' | 'admin';
  };
}

const roleStyles: Record<string, string> = {
  admin: 'bg-primary/10 text-primary border-primary/20',
  organizer: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  player: 'bg-muted text-muted-foreground',
};

export function AccountPanel({ user }: AccountPanelProps) {
  const actions = [
    { href: '/my-tournaments', label: 'My Tournaments', icon: Trophy },
    { href: '/submit', label: 'Submit a Tournament', icon: PlusCircle },
    ...(user.role === 'admin'
      ? [{ href: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }]
      : []),
  ];

  return (
    <Card className="border-border">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mb-4">
          <User className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{user.name}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
        <div className="flex justify-center mt-2">
          <Badge variant="outline" className={`capitalize ${roleStyles[user.role] || ''}`}>
            {user.role}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {actions.map((action) => (
          <Link key={action.href} href={action.href} className="block">
            <Button variant="outline" className="w-full justify-between min-h-[44px]">
              <span className="flex items-center gap-2">
                <action.icon className="w-4 h-4" />
                {action.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </Button>
          </Link>
        ))}
        <Button
          variant="ghost"
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full justify-start gap-2 text-destructive hover:text-destructive min-h-[44px]"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </CardContent>
    </Card>
  );
}
