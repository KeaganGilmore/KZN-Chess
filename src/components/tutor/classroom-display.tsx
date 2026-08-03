'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';
import { TurnBanner } from '@/components/puzzles/turn-banner';
import { Button } from '@/components/ui/button';
import { puzzleDiagram, puzzleSolutionSan } from '@/lib/puzzles/diagram';

interface P {
  id: string;
  fen: string;
  moves: string;
  rating: number;
}

const PER_PAGE_OPTIONS = [1, 2, 4, 6] as const;

// Vertical space a tile consumes besides the board itself (number row, turn
// banner, solution row, internal gaps). Used to fit whole pages on screen.
const TILE_CHROME = 124;
const GRID_GAP = 16;
// The grid wrapper's p-4 padding — clientHeight includes it, the grid doesn't.
const WRAPPER_PADDING = 32;

export function ClassroomDisplay({
  setId,
  setName,
  puzzles,
}: {
  setId: string;
  setName: string;
  puzzles: P[];
}) {
  const [perPage, setPerPage] = useState(4);
  const [page, setPage] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [boardMax, setBoardMax] = useState(360);
  const gridRef = useRef<HTMLDivElement>(null);

  const diagrams = useMemo(
    () =>
      puzzles.map((p) => ({
        ...p,
        diagram: puzzleDiagram(p.fen, p.moves),
        solution: puzzleSolutionSan(p.fen, p.moves),
      })),
    [puzzles]
  );

  const pages = Math.max(1, Math.ceil(diagrams.length / perPage));
  const current = Math.min(page, pages - 1);
  const visible = diagrams.slice(current * perPage, current * perPage + perPage);

  // Lay out by what's actually on this page, not the nominal per-page count,
  // so a short last page (or a 1-puzzle set) gets big centered boards instead
  // of a small board stranded in the first cell.
  const nominalCols = perPage === 1 ? 1 : perPage === 2 ? 2 : perPage === 4 ? 2 : 3;
  const cols = Math.max(1, Math.min(nominalCols, visible.length));
  const rows = Math.max(1, Math.ceil(visible.length / cols));

  // Fit a whole page vertically: the board's max width is what's left of the
  // grid row after the tile chrome, so nothing ever scrolls on a projector.
  // Measured on the fixed-height wrapper (not the grid, which may grow) to
  // avoid a resize feedback loop.
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const h = el.clientHeight - WRAPPER_PADDING;
      if (h > 0) {
        const perRow = (h - (rows - 1) * GRID_GAP) / rows;
        setBoardMax(Math.max(180, Math.floor(perRow - TILE_CHROME)));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows]);

  // If the tutor navigates away (X, back button) while projecting, drop out of
  // browser fullscreen — a client-side route change won't do it for us.
  useEffect(
    () => () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    },
    []
  );

  const prev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const next = useCallback(
    () => setPage((p) => Math.min(pages - 1, p + 1)),
    [pages]
  );

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, toggleFullscreen]);

  const allShown = diagrams.length > 0 && diagrams.every((p) => revealed[p.id]);
  const toggleAll = () => {
    if (allShown) setRevealed({});
    else setRevealed(Object.fromEntries(diagrams.map((p) => [p.id, true])));
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col">
      {/* Toolbar */}
      <div className="h-14 shrink-0 border-b border-border bg-background relative z-10 flex items-center gap-2 sm:gap-3 px-3 sm:px-4">
        <Link href={`/learn/tutor/sets/${setId}`} aria-label="Exit classroom display">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <X className="w-5 h-5" />
          </Button>
        </Link>
        <span className="font-semibold truncate">{setName}</span>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <label className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            Boards
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
            >
              {PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <Button variant="outline" size="sm" onClick={toggleAll}>
            {allShown ? (
              <>
                <EyeOff className="w-4 h-4 mr-1.5" /> Hide solutions
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1.5" /> Reveal all
              </>
            )}
          </Button>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={prev} disabled={current === 0} aria-label="Previous page">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm text-muted-foreground tabular-nums px-1 whitespace-nowrap">
              {current + 1} / {pages}
            </span>
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={next} disabled={current >= pages - 1} aria-label="Next page">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          <Button variant="outline" size="icon" className="h-9 w-9" onClick={toggleFullscreen} aria-label="Toggle fullscreen">
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Boards */}
      {diagrams.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          No puzzles in this set yet.
        </div>
      ) : (
        // overflow-y-auto + safe centering: if a tile still ends up taller
        // than its row (tiny window, huge solution), the page scrolls instead
        // of clipping into the toolbar or off the bottom of the projector.
        <div ref={gridRef} className="flex-1 min-h-0 p-4 overflow-y-auto">
          <div
            className="min-h-full grid justify-items-center"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gap: GRID_GAP,
              alignContent: 'safe center',
            }}
          >
            {visible.map((p, i) => {
              const number = current * perPage + i + 1;
              const shown = !!revealed[p.id];
              return (
                <div key={p.id} className="w-full flex flex-col items-center gap-2" style={{ maxWidth: boardMax }}>
                  <div className="w-full flex items-baseline justify-between">
                    <span className="font-bold text-lg leading-none">#{number}</span>
                    <span className="text-xs text-muted-foreground">{p.rating}</span>
                  </div>
                  <TurnBanner turn={p.diagram.turn} size="lg" className="w-full" />
                  <PuzzleBoard fen={p.diagram.fen} boardWidth={boardMax} />
                  <div className="w-full min-h-[32px] flex items-center justify-center">
                    {shown ? (
                      <button
                        type="button"
                        onClick={() => setRevealed((r) => ({ ...r, [p.id]: false }))}
                        title={p.solution.join(' ')}
                        className="font-mono text-sm sm:text-base text-emerald-400 text-center max-w-full whitespace-nowrap overflow-hidden text-ellipsis"
                      >
                        {p.solution.join('  ') || '—'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setRevealed((r) => ({ ...r, [p.id]: true }))}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Show solution
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
