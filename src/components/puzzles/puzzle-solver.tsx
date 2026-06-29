'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { useRouter } from 'next/navigation';
import { motion, useAnimationControls } from 'framer-motion';
import { Lightbulb, Eye, ArrowRight, Check, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useBoardWidth } from '@/lib/use-board-width';

const Chessboard = dynamic(
  () => import('react-chessboard').then((m) => m.Chessboard),
  { ssr: false }
);

export interface SolverPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
}

type Status = 'solving' | 'wrong' | 'solved' | 'failed';

const uci = (from: string, to: string, promo?: string) => `${from}${to}${promo || ''}`;

export function PuzzleSolver({
  puzzle,
  isAuthed,
}: {
  puzzle: SolverPuzzle;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const solution = useMemo(
    () => puzzle.moves.split(' ').filter(Boolean),
    [puzzle.moves]
  );

  const gameRef = useRef(new Chess(puzzle.fen));
  const [fen, setFen] = useState(puzzle.fen);
  const [moveIndex, setMoveIndex] = useState(1);
  const [status, setStatus] = useState<Status>('solving');
  const [usedHint, setUsedHint] = useState(false);
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardRef, boardWidth] = useBoardWidth(440);
  const [loadingNext, setLoadingNext] = useState(false);
  const recorded = useRef(false);
  const shake = useAnimationControls();

  // Apply the puzzle's setup move so it's the solver's turn.
  useEffect(() => {
    const game = new Chess(puzzle.fen);
    if (solution[0]) {
      const m = solution[0];
      game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.slice(4) || undefined });
    }
    gameRef.current = game;
    setOrientation(game.turn() === 'w' ? 'white' : 'black');
    setFen(game.fen());
    setMoveIndex(1);
    setStatus('solving');
    setUsedHint(false);
    setHintSquare(null);
    recorded.current = false;
  }, [puzzle.fen, puzzle.id, solution]);

  const record = useCallback(
    async (correct: boolean) => {
      if (recorded.current) return;
      recorded.current = true;
      if (!isAuthed) return;
      try {
        await fetch(`/api/puzzles/${puzzle.id}/attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correct, used_hint: usedHint }),
        });
      } catch {
        /* progress is best-effort */
      }
    },
    [puzzle.id, isAuthed, usedHint]
  );

  const onDrop = useCallback(
    (source: string, target: string): boolean => {
      if (status === 'solved' || status === 'failed') return false;
      const game = gameRef.current;
      const expected = solution[moveIndex];
      if (!expected) return false;

      const expectedPromo = expected.length > 4 ? expected[4] : undefined;
      let move;
      try {
        move = game.move({ from: source, to: target, promotion: expectedPromo || 'q' });
      } catch {
        return false;
      }
      if (!move) return false;

      const played = uci(move.from, move.to, move.promotion);
      const matches = played === expected || played.slice(0, 4) === expected.slice(0, 4);
      if (!matches) {
        game.undo();
        setStatus('wrong');
        setHintSquare(null);
        shake.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.4 } });
        record(false);
        return false;
      }

      setHintSquare(null);
      const replyIndex = moveIndex + 1;
      if (solution[replyIndex]) {
        const r = solution[replyIndex];
        game.move({ from: r.slice(0, 2), to: r.slice(2, 4), promotion: r.slice(4) || undefined });
        setFen(game.fen());
        setMoveIndex(replyIndex + 1);
        setStatus('solving');
      } else {
        setFen(game.fen());
        setStatus('solved');
        record(true);
      }
      return true;
    },
    [status, solution, moveIndex, shake, record]
  );

  const showHint = () => {
    if (status === 'solved' || status === 'failed') return;
    setUsedHint(true);
    const next = solution[moveIndex];
    if (next) setHintSquare(next.slice(0, 2));
  };

  const reveal = () => {
    setStatus('failed');
    setHintSquare(null);
    record(false);
    const game = gameRef.current;
    let i = moveIndex;
    const step = () => {
      const m = solution[i];
      if (!m) return;
      game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.slice(4) || undefined });
      setFen(game.fen());
      i++;
      if (solution[i]) setTimeout(step, 650);
    };
    step();
  };

  const retry = () => {
    const game = new Chess(puzzle.fen);
    if (solution[0]) {
      const m = solution[0];
      game.move({ from: m.slice(0, 2), to: m.slice(2, 4), promotion: m.slice(4) || undefined });
    }
    gameRef.current = game;
    setFen(game.fen());
    setMoveIndex(1);
    setStatus('solving');
    setHintSquare(null);
  };

  const nextPuzzle = async () => {
    setLoadingNext(true);
    try {
      const res = await fetch('/api/puzzles/next');
      const json = await res.json();
      if (json.puzzle?.id) router.push(`/learn/puzzles/${json.puzzle.id}`);
      else router.refresh();
    } catch {
      router.refresh();
    } finally {
      setLoadingNext(false);
    }
  };

  const customSquareStyles = hintSquare
    ? { [hintSquare]: { background: 'rgba(226, 160, 63, 0.45)' } }
    : {};
  const active = status === 'solving' || status === 'wrong';

  return (
    <div className="space-y-4">
      <div ref={boardRef} className="w-full max-w-[440px]">
        <motion.div animate={shake}>
          <div
            className={cn(
              'rounded-lg transition-shadow',
              status === 'solved' && 'ring-2 ring-green-500',
              status === 'wrong' && 'ring-2 ring-red-500',
              status === 'failed' && 'ring-2 ring-amber-500'
            )}
          >
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              boardOrientation={orientation}
              boardWidth={boardWidth}
              arePiecesDraggable={active}
              customSquareStyles={customSquareStyles}
              customBoardStyle={{ borderRadius: '0.5rem' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Status line */}
      <div className="min-h-[28px] text-sm font-medium">
        {status === 'solving' && (
          <span className="text-muted-foreground">
            {orientation === 'white' ? 'White' : 'Black'} to play — find the best move.
          </span>
        )}
        {status === 'wrong' && (
          <span className="text-red-500 inline-flex items-center gap-1.5">
            <X className="w-4 h-4" /> Not quite — try again.
          </span>
        )}
        {status === 'solved' && (
          <span className="text-green-500 inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Solved!{usedHint && ' (with a hint)'}
          </span>
        )}
        {status === 'failed' && (
          <span className="text-amber-500 inline-flex items-center gap-1.5">
            <Eye className="w-4 h-4" /> Solution shown.
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        {active && (
          <>
            <Button variant="outline" size="sm" onClick={showHint}>
              <Lightbulb className="w-4 h-4 mr-1.5" /> Hint
            </Button>
            <Button variant="outline" size="sm" onClick={reveal}>
              <Eye className="w-4 h-4 mr-1.5" /> Reveal solution
            </Button>
            {status === 'wrong' && (
              <Button variant="outline" size="sm" onClick={retry}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
              </Button>
            )}
          </>
        )}
        {(status === 'solved' || status === 'failed') && (
          <Button size="sm" onClick={nextPuzzle} disabled={loadingNext}>
            <ArrowRight className="w-4 h-4 mr-1.5" />
            {loadingNext ? 'Loading…' : 'Next puzzle'}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge variant="outline">Rating {puzzle.rating}</Badge>
        {puzzle.themes.slice(0, 5).map((t) => (
          <Badge key={t} variant="outline" className="capitalize">
            {t}
          </Badge>
        ))}
      </div>

      {!isAuthed && (
        <p className="text-xs text-muted-foreground">
          Sign in to track your rating, streak, and solved count.
        </p>
      )}
    </div>
  );
}
