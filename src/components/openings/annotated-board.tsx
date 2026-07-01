'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { useBoardWidth } from '@/lib/use-board-width';
import { cn } from '@/lib/utils';
import type { NodeArrow } from '@/lib/openings/tree';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), { ssr: false });

export const ARROW_COLORS: Record<string, string> = {
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  blue: '#3b82f6',
};
const HEX_TO_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(ARROW_COLORS).map(([name, hex]) => [hex.toLowerCase(), name])
);

export function AnnotatedBoard({
  fen,
  orientation,
  onMove,
  arrows = [],
  lastMove = null,
  interactive = true,
  allowDraw = false,
  onDrawArrows,
  drawColor = 'green',
  border = 'none',
  maxWidth = 440,
  fullBleed = false,
}: {
  fen: string;
  orientation: 'white' | 'black';
  onMove: (from: string, to: string) => boolean;
  arrows?: NodeArrow[];
  lastMove?: { from: string; to: string } | null;
  interactive?: boolean;
  allowDraw?: boolean;
  onDrawArrows?: (arrows: NodeArrow[]) => void;
  drawColor?: string;
  border?: 'none' | 'wrong' | 'correct';
  maxWidth?: number;
  fullBleed?: boolean;
}) {
  const [boardRef, boardWidth] = useBoardWidth(fullBleed ? 4096 : maxWidth);
  const [selected, setSelected] = useState<string | null>(null);

  const game = useMemo(() => {
    try {
      return new Chess(fen);
    } catch {
      return null;
    }
  }, [fen]);

  const onSquareClick = (square: string) => {
    if (!interactive || !game) return;
    if (selected && square !== selected) {
      const accepted = onMove(selected, square);
      const p = game.get(square as any);
      setSelected(!accepted && p && p.color === game.turn() ? square : null);
      return;
    }
    if (selected === square) {
      setSelected(null);
      return;
    }
    const p = game.get(square as any);
    if (p && p.color === game.turn()) setSelected(square);
  };

  const onPieceDrop = (from: string, to: string): boolean => {
    const ok = onMove(from, to);
    setSelected(null);
    return ok;
  };

  // Layers 3–4: arrow bodies + heads (react-chessboard renders these above pieces).
  const boardArrows = useMemo(
    () => arrows.map((a) => [a.from, a.to, ARROW_COLORS[a.color] || a.color] as [any, any, string]),
    [arrows]
  );

  const handleArrowsChange = (tuples: any[]) => {
    if (!allowDraw || !onDrawArrows) return;
    onDrawArrows(
      tuples.map((t) => ({ from: t[0], to: t[1], color: HEX_TO_NAME[(t[2] || '').toLowerCase()] || 'green' }))
    );
  };

  // Layer 1: square highlights (below pieces) — last move (yellow), selection,
  // and legal-move dots (grey).
  const styles: Record<string, { background?: string }> = {};
  if (lastMove) {
    styles[lastMove.from] = { background: 'rgba(234,179,8,0.35)' };
    styles[lastMove.to] = { background: 'rgba(234,179,8,0.35)' };
  }
  if (selected && game) {
    styles[selected] = { ...(styles[selected] || {}), background: 'rgba(226,160,63,0.5)' };
    for (const m of game.moves({ square: selected as any, verbose: true }) as any[]) {
      styles[m.to] = {
        background: game.get(m.to as any)
          ? 'radial-gradient(circle, transparent 56%, rgba(120,120,120,0.55) 58%)'
          : 'radial-gradient(circle, rgba(120,120,120,0.5) 22%, transparent 24%)',
      };
    }
  }

  return (
    <div
      ref={boardRef}
      className={cn(
        'w-full',
        border === 'wrong' && 'animate-pulse-red',
        border === 'correct' && 'ring-2 ring-green-500 rounded-lg'
      )}
      style={fullBleed ? undefined : { maxWidth }}
    >
      <Chessboard
        position={fen}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        boardOrientation={orientation}
        boardWidth={boardWidth}
        arePiecesDraggable={interactive}
        areArrowsAllowed={allowDraw}
        customArrows={boardArrows as any}
        customArrowColor={ARROW_COLORS[drawColor] || '#22c55e'}
        onArrowsChange={handleArrowsChange}
        customSquareStyles={styles}
        customBoardStyle={{ borderRadius: '0.5rem' }}
      />
    </div>
  );
}
