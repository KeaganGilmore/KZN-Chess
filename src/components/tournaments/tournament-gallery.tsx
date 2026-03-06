'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { ImageIcon, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MediaUpload } from './media-upload';
import { useToast } from '@/hooks/use-toast';
import type { TournamentMedia } from '@/lib/types';

export function TournamentGallery({
  tournamentId,
  isPast,
}: {
  tournamentId: string;
  isPast: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const { toast } = useToast();
  const [media, setMedia] = useState<TournamentMedia[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/tournaments/${tournamentId}/media`)
      .then((r) => r.json())
      .then(setMedia)
      .catch(() => {});
  }, [tournamentId]);

  const handleUpload = async (url: string) => {
    if (!url) return;
    const res = await fetch(`/api/tournaments/${tournamentId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, media_type: 'image' }),
    });
    if (res.ok) {
      const item = await res.json();
      setMedia((prev) => [item, ...prev]);
      setShowUpload(false);
      toast({ title: 'Photo added to gallery' });
    }
  };

  if (media.length === 0 && !isPast && !user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            {isPast ? 'Event Gallery' : 'Photos'}
          </CardTitle>
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="gap-1.5"
            >
              {showUpload ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              {showUpload ? 'Cancel' : 'Add Photo'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showUpload && (
          <MediaUpload
            label={isPast ? 'Upload event photos' : 'Upload a photo'}
            onUpload={handleUpload}
          />
        )}

        {media.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {media.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedImage(item.url)}
                className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/30 transition-colors cursor-pointer"
              >
                <Image
                  src={item.url}
                  alt={item.caption || 'Tournament photo'}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            {isPast
              ? 'No photos from this event yet. Be the first to share!'
              : 'No photos uploaded yet.'}
          </p>
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
            <Image
              src={selectedImage}
              alt="Full size"
              width={1200}
              height={800}
              className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
