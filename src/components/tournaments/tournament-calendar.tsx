'use client';

import { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import type { Tournament } from '@/lib/types';

export function TournamentCalendar({
  tournaments,
}: {
  tournaments: Tournament[];
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const tournamentsByDate = useMemo(() => {
    const map: Record<string, Tournament[]> = {};
    tournaments.forEach((t) => {
      const key = t.date;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [tournaments]);

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-semibold text-lg">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayTournaments = tournamentsByDate[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());

          return (
            <div
              key={dateKey}
              className={`min-h-[80px] sm:min-h-[100px] p-1.5 rounded-lg border transition-colors ${
                isCurrentMonth
                  ? 'border-border/50 bg-card/50'
                  : 'border-transparent opacity-40'
              } ${isToday ? 'border-primary/30 bg-primary/5' : ''}`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  isToday ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-0.5">
                {dayTournaments.slice(0, 2).map((t) => (
                  <Link key={t.id} href={`/tournaments/${t.id}`}>
                    <div className="text-[10px] sm:text-xs truncate px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer">
                      {t.name}
                    </div>
                  </Link>
                ))}
                {dayTournaments.length > 2 && (
                  <div className="text-[10px] text-muted-foreground px-1.5">
                    +{dayTournaments.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
