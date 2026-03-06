'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  ShieldCheck,
  Star,
  ImageIcon,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function FeedView({ items }: { items: any[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16 bg-card rounded-xl border border-border">
        <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          The feed is quiet... Submit a tournament or upload photos to get things moving!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, i) => (
        <motion.div
          key={`${item.type}-${item.data.id}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: i * 0.05 }}
        >
          {item.type === 'media' ? (
            <MediaFeedItem data={item.data} />
          ) : (
            <TournamentFeedItem data={item.data} />
          )}
        </motion.div>
      ))}
    </div>
  );
}

function MediaFeedItem({ data }: { data: any }) {
  const isEndorsed = data.tournament?.status === 'featured' || data.tournament?.is_verified;

  return (
    <Card className="overflow-hidden hover:border-primary/20 transition-colors">
      <div className="relative">
        <Image
          src={data.url}
          alt={data.caption || 'Tournament photo'}
          width={800}
          height={500}
          className="w-full h-auto max-h-96 object-cover"
        />
      </div>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isEndorsed && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-0.5">
                <ShieldCheck className="w-2.5 h-2.5" />
                Endorsed
              </Badge>
            )}
            {data.uploader && (
              <span className="text-xs text-muted-foreground">
                by {data.uploader.name}
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(data.created_at), 'd MMM yyyy')}
          </span>
        </div>
        {data.tournament && (
          <>
            <Separator />
            <Link
              href={`/tournaments/${data.tournament.id}`}
              className="flex items-center justify-between group"
            >
              <div>
                <p className="text-sm font-medium group-hover:text-primary transition-colors">
                  {data.tournament.name}
                </p>
                {data.tournament.district && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {data.tournament.district.name}
                  </p>
                )}
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TournamentFeedItem({ data }: { data: any }) {
  const isEndorsed = data.status === 'featured' || data.is_verified;
  const isPast = new Date(data.end_date || data.date) < new Date();

  return (
    <Link href={`/tournaments/${data.id}`}>
      <Card className="overflow-hidden hover:border-primary/20 transition-colors group cursor-pointer">
        {data.poster_url && (
          <div className="relative h-48 overflow-hidden">
            <Image
              src={data.poster_url}
              alt={data.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
            {data.status === 'featured' && (
              <div className="absolute top-3 left-3">
                <Badge className="bg-primary text-primary-foreground border-0 gap-1">
                  <Star className="w-3 h-3" />
                  Featured
                </Badge>
              </div>
            )}
          </div>
        )}
        <CardContent className={data.poster_url ? 'p-4 pt-3' : 'p-4'}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                {isEndorsed ? (
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Endorsed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                    Community
                  </Badge>
                )}
                {isPast && (
                  <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground">
                    Completed
                  </Badge>
                )}
              </div>
              <h3 className="font-heading font-semibold text-base group-hover:text-primary transition-colors">
                {data.name}
              </h3>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(data.date), 'd MMM yyyy')}
                </span>
                {data.district && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {data.district.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
