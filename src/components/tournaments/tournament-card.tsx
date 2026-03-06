'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  Calendar,
  MapPin,
  Clock,
  Users,
  BadgeCheck,
  ShieldCheck,
  Star,
  Banknote,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Tournament } from '@/lib/types';

const timeControlColors: Record<string, string> = {
  classical: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  rapid: 'bg-green-500/10 text-green-400 border-green-500/20',
  blitz: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  bullet: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function TournamentCard({
  tournament,
  featured = false,
  index = 0,
}: {
  tournament: Tournament;
  featured?: boolean;
  index?: number;
}) {
  const isFeatured = featured || tournament.status === 'featured';
  const isEndorsed = isFeatured || tournament.is_verified;

  const whatsappText = encodeURIComponent(
    `Check out this chess tournament: ${tournament.name} on ${format(new Date(tournament.date), 'd MMM yyyy')} at ${tournament.venue}. More info at kznchess.co.za/tournaments/${tournament.id}`
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <Link href={`/tournaments/${tournament.id}`}>
        <Card
          className={cn(
            'group cursor-pointer transition-colors duration-200 hover:border-primary/30 overflow-hidden',
            isFeatured
              ? 'border-primary/30 bg-primary/[0.03]'
              : 'border-border'
          )}
        >
          {isFeatured && (
            <div className="bg-primary px-4 py-1.5 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-xs font-semibold text-primary-foreground">
                Featured Tournament
              </span>
            </div>
          )}
          <CardContent className={cn('p-5', isFeatured && 'pt-4')}>
            <div className="flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-heading font-semibold text-base leading-tight group-hover:text-primary transition-colors line-clamp-2">
                  {tournament.name}
                </h3>
                {tournament.is_verified && (
                  <BadgeCheck className="w-4 h-4 text-primary shrink-0" />
                )}
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                {isEndorsed ? (
                  <Badge
                    variant="outline"
                    className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Officially Endorsed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs bg-muted text-muted-foreground"
                  >
                    Community
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs capitalize',
                    timeControlColors[tournament.time_control]
                  )}
                >
                  {tournament.time_control}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs',
                    tournament.is_rated
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {tournament.is_rated ? 'Rated' : 'Unrated'}
                </Badge>
                {tournament.district && (
                  <Badge variant="outline" className="text-xs">
                    {tournament.district.name}
                  </Badge>
                )}
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {format(new Date(tournament.date), 'EEE, d MMM yyyy')}
                    {tournament.end_date &&
                      tournament.end_date !== tournament.date &&
                      ` - ${format(new Date(tournament.end_date), 'd MMM')}`}
                  </span>
                </div>
                {tournament.start_time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>{tournament.start_time.slice(0, 5)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tournament.venue}</span>
                </div>
                {tournament.entry_fee && (
                  <div className="flex items-center gap-2">
                    <Banknote className="w-3.5 h-3.5 shrink-0" />
                    <span>{tournament.entry_fee}</span>
                  </div>
                )}
                {tournament.rounds && (
                  <div className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>{tournament.rounds} rounds</span>
                  </div>
                )}
              </div>

              {/* WhatsApp share */}
              <div
                className="pt-2 border-t border-border"
                onClick={(e) => e.preventDefault()}
              >
                <a
                  href={`https://wa.me/?text=${whatsappText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-green-500 hover:text-green-400 transition-colors min-h-[44px] min-w-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  Share on WhatsApp
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
