import { cn } from '@/lib/utils';

// High-contrast side-to-move indicator, legible from the back of a classroom:
// white banner with black text for White, black banner with white text for
// Black, plus a filled disc so it reads at a glance.
export function TurnBanner({
  turn,
  size = 'sm',
  className,
}: {
  turn: 'w' | 'b';
  size?: 'sm' | 'lg';
  className?: string;
}) {
  const white = turn === 'w';
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 rounded-md font-bold uppercase tracking-widest select-none',
        white
          ? 'bg-white text-black border border-black/25'
          : 'bg-black text-white border border-white/30',
        size === 'lg' ? 'px-4 py-2 text-lg sm:text-xl' : 'px-2 py-1 text-[11px]',
        className
      )}
      // Browsers drop background colors when printing by default; without this
      // the black banner prints as white-on-white on the puzzle worksheets.
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
    >
      <span
        aria-hidden
        className={cn(
          'shrink-0 rounded-full border-2',
          white ? 'bg-white border-black' : 'bg-black border-white',
          size === 'lg' ? 'w-4 h-4' : 'w-2.5 h-2.5'
        )}
      />
      {white ? 'White to move' : 'Black to move'}
    </div>
  );
}
