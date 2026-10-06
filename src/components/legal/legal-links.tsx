import Link from 'next/link';
import { cn } from '@/lib/utils';

/** "Terms of Service · Privacy Policy" — for cards and footers. */
export function LegalLinks({ className }: { className?: string }) {
  return (
    <p className={cn('text-center text-xs text-muted-foreground', className)}>
      <Link href="/terms" className="hover:text-foreground transition-colors">
        Terms of Service
      </Link>
      <span className="mx-2" aria-hidden>
        ·
      </span>
      <Link href="/privacy" className="hover:text-foreground transition-colors">
        Privacy Policy
      </Link>
    </p>
  );
}
