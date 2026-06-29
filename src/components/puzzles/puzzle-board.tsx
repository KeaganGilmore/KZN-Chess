'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';

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

  return (
    <Chessboard
      position={position}
      boardOrientation={orientation}
      boardWidth={boardWidth}
      arePiecesDraggable={false}
      customBoardStyle={{ borderRadius: '0.5rem' }}
    />
  );
}
