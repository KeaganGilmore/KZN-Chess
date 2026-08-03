import { Chess } from 'chess.js';

// Lichess puzzle format: `fen` is the position BEFORE the setup move, and the
// first move in `moves` (UCI) is the opponent's setup move. The diagram — the
// position a student actually solves — is the position after that move.

export interface PuzzleDiagram {
  fen: string;
  turn: 'w' | 'b';
}

export function puzzleDiagram(fen: string, moves: string): PuzzleDiagram {
  try {
    const g = new Chess(fen);
    const first = (moves || '').split(' ').filter(Boolean)[0];
    if (first) {
      g.move({ from: first.slice(0, 2), to: first.slice(2, 4), promotion: first.slice(4) || undefined });
    }
    return { fen: g.fen(), turn: g.turn() as 'w' | 'b' };
  } catch {
    // Corrupt moves with a still-valid FEN: fall back to the raw position, but
    // read the turn from the FEN so the banner never contradicts the board.
    return { fen, turn: fen.split(' ')[1] === 'b' ? 'b' : 'w' };
  }
}

// Human-readable solution (SAN) for the continuation after the setup move.
export function puzzleSolutionSan(fen: string, moves: string): string[] {
  try {
    const g = new Chess(fen);
    const all = (moves || '').split(' ').filter(Boolean);
    const sans: string[] = [];
    all.forEach((u, i) => {
      const mv = g.move({ from: u.slice(0, 2), to: u.slice(2, 4), promotion: u.slice(4) || undefined });
      if (i >= 1 && mv) sans.push(mv.san);
    });
    return sans;
  } catch {
    return [];
  }
}
