'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from './cart-provider';

export function CartButton({ className }: { className?: string }) {
  const { count, hydrated } = useCart();
  return (
    <Link
      href="/store/cart"
      aria-label={hydrated && count > 0 ? `Cart, ${count} items` : 'Cart'}
      className={cn(
        'relative inline-flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors',
        className
      )}
    >
      <ShoppingCart className="w-5 h-5" />
      {hydrated && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
