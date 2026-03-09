'use client';

import { useState, useMemo } from 'react';
import { Search, Grid3X3, List, Calendar as CalendarIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TournamentCard } from './tournament-card';
import { TournamentCalendar } from './tournament-calendar';
import type { Tournament, District } from '@/lib/types';

export function TournamentBrowser({
  tournaments,
  districts,
}: {
  tournaments: Tournament[];
  districts: District[];
}) {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [ratedFilter, setRatedFilter] = useState<string>('all');
  const [view, setView] = useState<'grid' | 'list' | 'calendar'>('grid');

  const filtered = useMemo(() => {
    const results = tournaments.filter((t) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.name.toLowerCase().includes(q) &&
          !t.venue.toLowerCase().includes(q) &&
          !(t.district?.name || '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (districtFilter !== 'all' && t.district_id !== districtFilter) return false;
      if (ratedFilter === 'rated' && !t.is_rated) return false;
      if (ratedFilter === 'unrated' && t.is_rated) return false;
      return true;
    });

    // Prioritize: featured/verified > approved > pending
    return results.sort((a, b) => {
      const rank = (t: typeof results[0]) => {
        if (t.status === 'featured' || t.is_verified) return 2;
        if (t.status === 'approved') return 1;
        return 0; // pending
      };
      const diff = rank(b) - rank(a);
      if (diff !== 0) return diff;
      return 0; // preserve date ordering from server
    });
  }, [tournaments, search, districtFilter, ratedFilter]);

  const hasFilters = search || districtFilter !== 'all' || ratedFilter !== 'all';

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments, venues, districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <Select value={districtFilter} onValueChange={setDistrictFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            {districts.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ratedFilter} onValueChange={setRatedFilter}>
          <SelectTrigger className="w-full sm:w-[140px] bg-card">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="rated">Rated</SelectItem>
            <SelectItem value="unrated">Unrated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Toggle & Results */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {filtered.length} tournament{filtered.length !== 1 ? 's' : ''}
          </p>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch('');
                setDistrictFilter('all');
                setRatedFilter('all');
              }}
              className="text-xs gap-1 h-7"
            >
              <X className="w-3 h-3" />
              Clear filters
            </Button>
          )}
        </div>
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList className="h-8">
            <TabsTrigger value="grid" className="h-6 px-2">
              <Grid3X3 className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="list" className="h-6 px-2">
              <List className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="calendar" className="h-6 px-2">
              <CalendarIcon className="w-3.5 h-3.5" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Views */}
      {view === 'calendar' ? (
        <TournamentCalendar tournaments={filtered} />
      ) : (
        <>
          {filtered.length > 0 ? (
            <div
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                  : 'space-y-3'
              }
            >
              {filtered.map((t, i) => (
                <TournamentCard key={t.id} tournament={t} index={i} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <p className="text-muted-foreground">
                No tournaments match your filters.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
