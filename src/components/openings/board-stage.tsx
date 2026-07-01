'use client';

import { type ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * Responsive stage for the board + annotation panel.
 *  - Portrait mobile: vertical stack (breadcrumb / full-width board / control
 *    bar / scrollable panel / sticky prev-next).
 *  - Landscape + desktop: two columns (board left, panel right).
 *  - Fullscreen: board fills the screen with a floating close button.
 */
export function BoardStage({
  breadcrumb,
  board,
  controls,
  panel,
  footer,
  fullscreen,
  onExitFullscreen,
}: {
  breadcrumb?: ReactNode;
  board: ReactNode;
  controls?: ReactNode;
  panel: ReactNode;
  footer?: ReactNode;
  fullscreen: boolean;
  onExitFullscreen: () => void;
}) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[60] bg-background flex items-center justify-center p-2">
        <div className="w-[min(96vw,96vh)]">{board}</div>
        <button
          onClick={onExitFullscreen}
          aria-label="Exit fullscreen"
          className="absolute top-3 right-3 h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center shadow"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col landscape:flex-row md:flex-row md:gap-6">
      {/* Board column */}
      <div className="w-full landscape:w-1/2 md:w-auto md:shrink-0">
        {breadcrumb && (
          <div className="h-10 flex items-center gap-1 px-3 md:px-0 text-sm overflow-x-auto whitespace-nowrap">
            {breadcrumb}
          </div>
        )}
        <div className="w-full md:w-[440px]">{board}</div>
        {controls && (
          <div className="h-12 flex items-center gap-2 px-3 md:px-0">{controls}</div>
        )}
      </div>

      {/* Panel column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 overflow-y-auto px-3 md:px-0 py-3 max-h-[calc(100vh-16rem)] landscape:max-h-[82vh]">
          {panel}
        </div>
        {footer && (
          <div className="sticky bottom-0 min-h-[60px] bg-background/95 backdrop-blur-sm border-t border-border px-3 md:px-0 flex items-center gap-2 py-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
