'use client';

import { format } from 'date-fns';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  BadgeCheck,
  Star,
  Banknote,
  Trophy,
  Phone,
  Mail,
  ExternalLink,
  Share2,
  Copy,
  MessageCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TournamentCard } from './tournament-card';
import { useToast } from '@/hooks/use-toast';
import type { Tournament } from '@/lib/types';

export function TournamentDetail({
  tournament,
  related,
}: {
  tournament: Tournament;
  related: Tournament[];
}) {
  const { toast } = useToast();
  const isFeatured = tournament.status === 'featured';

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareText = `${tournament.name} - ${format(new Date(tournament.date), 'd MMM yyyy')} at ${tournament.venue}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Link copied!', description: 'Tournament link copied to clipboard.' });
  };

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {isFeatured && (
                  <Badge className="bg-primary text-primary-foreground border-0">
                    <Star className="w-3 h-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {tournament.is_verified && (
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    <BadgeCheck className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <Badge variant="outline" className="capitalize">
                  {tournament.time_control}
                </Badge>
                <Badge variant={tournament.is_rated ? 'default' : 'outline'}>
                  {tournament.is_rated ? 'Rated' : 'Unrated'}
                </Badge>
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold">{tournament.name}</h1>

              {tournament.district && (
                <p className="text-muted-foreground">
                  Organized by {tournament.district.name} District
                </p>
              )}
            </div>
          </motion.div>

          <Separator className="bg-border" />

          {/* Description */}
          {tournament.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {tournament.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Details Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Tournament Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <DetailItem
                    icon={Calendar}
                    label="Date"
                    value={
                      tournament.end_date && tournament.end_date !== tournament.date
                        ? `${format(new Date(tournament.date), 'd MMM yyyy')} - ${format(new Date(tournament.end_date), 'd MMM yyyy')}`
                        : format(new Date(tournament.date), 'EEEE, d MMMM yyyy')
                    }
                  />
                  {tournament.start_time && (
                    <DetailItem
                      icon={Clock}
                      label="Start Time"
                      value={tournament.start_time.slice(0, 5)}
                    />
                  )}
                  <DetailItem icon={MapPin} label="Venue" value={tournament.venue} />
                  {tournament.time_control_detail && (
                    <DetailItem
                      icon={Clock}
                      label="Time Control"
                      value={tournament.time_control_detail}
                    />
                  )}
                  {tournament.rounds && (
                    <DetailItem
                      icon={Users}
                      label="Rounds"
                      value={`${tournament.rounds} rounds`}
                    />
                  )}
                  {tournament.entry_fee && (
                    <DetailItem
                      icon={Banknote}
                      label="Entry Fee"
                      value={tournament.entry_fee}
                    />
                  )}
                  {tournament.prizes && (
                    <DetailItem
                      icon={Trophy}
                      label="Prizes"
                      value={tournament.prizes}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Registration */}
          {tournament.registration_procedure && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>How to Register</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/80 leading-relaxed">
                    {tournament.registration_procedure}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Share */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleWhatsAppShare}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Share on WhatsApp
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Link
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Venue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Venue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="font-medium">{tournament.venue}</p>
                {tournament.venue_address && (
                  <p className="text-sm text-muted-foreground">
                    {tournament.venue_address}
                  </p>
                )}
                {tournament.maps_link && (
                  <a
                    href={tournament.maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="w-full gap-2">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Open in Google Maps
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact */}
          {(tournament.contact_name || tournament.contact_phone || tournament.contact_email) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {tournament.contact_name && (
                    <p className="font-medium">{tournament.contact_name}</p>
                  )}
                  {tournament.contact_phone && (
                    <a
                      href={`tel:${tournament.contact_phone}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      {tournament.contact_phone}
                    </a>
                  )}
                  {tournament.contact_email && (
                    <a
                      href={`mailto:${tournament.contact_email}`}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {tournament.contact_email}
                    </a>
                  )}
                  {tournament.contact_phone && (
                    <a
                      href={`https://wa.me/${tournament.contact_phone.replace(/[^0-9+]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Related Tournaments */}
          {related.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="font-semibold mb-4">
                More from {tournament.district?.name}
              </h3>
              <div className="space-y-3">
                {related.map((t, i) => (
                  <TournamentCard key={t.id} tournament={t} index={i} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
