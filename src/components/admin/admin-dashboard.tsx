'use client';

import { motion } from 'framer-motion';
import { Trophy, Clock, Users, Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface DashboardData {
  totalTournaments: number;
  pendingCount: number;
  pendingTournaments: any[];
  activeOrganizers: number;
  upcomingThisMonth: number;
  recentLogs: any[];
}

export function AdminDashboard({ data }: { data: DashboardData }) {
  const stats = [
    {
      label: 'Total Tournaments',
      value: data.totalTournaments,
      icon: Trophy,
      color: 'text-primary',
    },
    {
      label: 'Pending Approvals',
      value: data.pendingCount,
      icon: Clock,
      color: 'text-orange-400',
    },
    {
      label: 'Active Organizers',
      value: data.activeOrganizers,
      icon: Users,
      color: 'text-blue-400',
    },
    {
      label: 'Events This Month',
      value: data.upcomingThisMonth,
      icon: Calendar,
      color: 'text-green-400',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of KZN Chess platform
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${stat.color}`}
                  >
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/tournaments">
          <Button variant="outline" className="gap-2">
            <Trophy className="w-4 h-4" />
            Manage Tournaments
          </Button>
        </Link>
        <Link href="/admin/users">
          <Button variant="outline" className="gap-2">
            <Users className="w-4 h-4" />
            Manage Users
          </Button>
        </Link>
        <Link href="/admin/content">
          <Button variant="outline" className="gap-2">
            Edit Site Content
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tournaments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Pending Approvals</CardTitle>
            <Link href="/admin/tournaments">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.pendingTournaments.length > 0 ? (
              <div className="space-y-3">
                {data.pendingTournaments.map((t: any) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.district?.name} &middot; {t.organizer?.name}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-orange-400 border-orange-400/30 shrink-0">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No pending approvals
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <Link href="/admin/logs">
              <Button variant="ghost" size="sm" className="gap-1">
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentLogs.length > 0 ? (
              <div className="space-y-3">
                {data.recentLogs.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium capitalize">
                        {log.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), 'dd MMM HH:mm')}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      by {log.admin_email}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
