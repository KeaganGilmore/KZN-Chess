'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { Calendar, MapPin, ImageIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

export function GalleryBrowser({
  tournaments,
  media,
}: {
  tournaments: any[];
  media: any[];
}) {
  const [view, setView] = useState<'photos' | 'events'>('photos');
  const [selectedImage, setSelectedImage] = useState<any | null>(null);

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={(v) => setView(v as any)}>
        <TabsList>
          <TabsTrigger value="photos" className="gap-1.5">
            <ImageIcon className="w-3.5 h-3.5" />
            All Photos
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Past Events
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {view === 'photos' ? (
        <>
          {media.length > 0 ? (
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {media.map((item: any, i: number) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  className="break-inside-avoid"
                >
                  <button
                    onClick={() => setSelectedImage(item)}
                    className="group relative w-full rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors cursor-pointer"
                  >
                    <Image
                      src={item.url}
                      alt={item.caption || 'Tournament photo'}
                      width={400}
                      height={300}
                      className="w-full h-auto object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.tournament && (
                        <p className="text-xs text-white font-medium truncate">
                          {item.tournament.name}
                        </p>
                      )}
                      {item.uploader && (
                        <p className="text-[10px] text-white/70">
                          by {item.uploader.name}
                        </p>
                      )}
                    </div>
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No photos yet. Photos from tournaments will appear here.
              </p>
            </div>
          )}
        </>
      ) : (
        <>
          {tournaments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {tournaments.map((t: any, i: number) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                >
                  <Link href={`/tournaments/${t.id}`}>
                    <Card className="group cursor-pointer transition-colors hover:border-primary/30 overflow-hidden">
                      {t.poster_url && (
                        <div className="relative h-40 overflow-hidden">
                          <Image
                            src={t.poster_url}
                            alt={t.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                        </div>
                      )}
                      <CardContent className={t.poster_url ? 'pt-3 p-5' : 'p-5'}>
                        <Badge variant="outline" className="text-xs mb-2 bg-muted text-muted-foreground">
                          Completed
                        </Badge>
                        <h3 className="font-heading font-semibold text-base mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {t.name}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            {format(new Date(t.date), 'd MMM yyyy')}
                          </div>
                          {t.district && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5" />
                              {t.district.name}
                            </div>
                          )}
                        </div>
                        {t.media?.[0]?.count > 0 && (
                          <p className="text-xs text-primary mt-2">
                            {t.media[0].count} photo{t.media[0].count !== 1 ? 's' : ''}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-xl border border-border">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                No completed tournaments yet.
              </p>
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/10"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selectedImage.url}
              alt={selectedImage.caption || 'Tournament photo'}
              width={1200}
              height={800}
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-lg"
            />
            {selectedImage.tournament && (
              <div className="mt-4 text-center">
                <Link
                  href={`/tournaments/${selectedImage.tournament.id}`}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  {selectedImage.tournament.name}
                </Link>
                <p className="text-xs text-white/60 mt-1">
                  {selectedImage.tournament.date && format(new Date(selectedImage.tournament.date), 'd MMM yyyy')}
                  {selectedImage.uploader && ` - Photo by ${selectedImage.uploader.name}`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
