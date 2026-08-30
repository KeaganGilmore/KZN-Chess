'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import type { ProductImage } from '@/lib/store/types';
import { cn } from '@/lib/utils';

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [selected, setSelected] = useState(0);
  const current = images[Math.min(selected, Math.max(0, images.length - 1))];

  if (!current) {
    return (
      <div className="relative aspect-square rounded-lg border border-border bg-secondary flex items-center justify-center text-muted-foreground/60">
        <ShoppingBag className="w-16 h-16" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square rounded-lg overflow-hidden border border-border bg-secondary">
        <Image
          key={current.id}
          src={current.url}
          alt={current.alt || name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`View image ${i + 1} of ${images.length}`}
              aria-pressed={i === selected}
              className={cn(
                'relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-md overflow-hidden border-2 bg-secondary transition-colors',
                i === selected ? 'border-primary' : 'border-transparent hover:border-primary/40'
              )}
            >
              <Image
                src={img.url}
                alt={img.alt || `${name} ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
