import Link from 'next/link';
import type { StoreCategory } from '@/lib/store/types';

/** Horizontal row of category chips linking into the store. Renders nothing when there are none. */
export function CategoryStrip({ categories }: { categories: StoreCategory[] }) {
  if (categories.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground shrink-0 mr-1">
          Shop by
        </span>
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/store?category=${encodeURIComponent(c.slug)}`}
            className="shrink-0 px-4 py-2 rounded-full border border-border bg-card text-sm font-medium hover:border-primary/50 hover:text-primary transition-colors min-h-[44px] inline-flex items-center"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
