'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { useBoardWidth } from '@/lib/use-board-width';

// react-chessboard touches browser-only APIs, so load it client-side only.
const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false }
);

export function PuzzleBoard({
  fen,
  boardWidth = 360,
}: {
  fen: string;
  boardWidth?: number;
}) {
  // Validate the FEN with chess.js so a malformed row can never crash the page,
  // and orient the board to the side to move.
  const { position, orientation } = useMemo(() => {
    try {
      const game = new Chess(fen);
      return {
        position: game.fen(),
        orientation: (game.turn() === 'w' ? 'white' : 'black') as 'white' | 'black',
      };
    } catch {
      return { position: 'start', orientation: 'white' as const };
    }
  }, [fen]);

  // boardWidth is treated as a max; the board shrinks to fit narrow screens.
  const [ref, width] = useBoardWidth(boardWidth);

  return (
    <div ref={ref} className="w-full" style={{ maxWidth: boardWidth }}>
      <Chessboard
        position={position}
        boardOrientation={orientation}
        boardWidth={width}
        arePiecesDraggable={false}
        customBoardStyle={{ borderRadius: '0.5rem' }}
      />
    </div>
  );
}
