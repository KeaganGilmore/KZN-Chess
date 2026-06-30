'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { motion, useAnimationControls } from 'framer-motion';
import { Check, X, ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useBoardWidth } from '@/lib/use-board-width';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), { ssr: false });

interface Item {
  node_id: string;
  fen: string;
  answers: string[];
  answer_sans: string[];
}
interface Rep {
  id: string;
  name: string;
  color: 'white' | 'black';
}

export function OpeningQuiz({ repertoire }: { repertoire: Rep }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [status, setStatus] = useState<'answering' | 'correct' | 'wrong'>('answering');
  const [fen, setFen] = useState('');
  const [results, setResults] = useState<{ item: Item; correct: boolean }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [boardRef, boardWidth] = useBoardWidth(440);
  const shake = useAnimationControls();

  const load = async () => {
    setLoading(true);
    const json = await fetch(`/api/repertoires/${repertoire.id}/quiz`).then((r) => r.json()).catch(() => ({ items: [] }));
    setItems(json.items || []);
    setIdx(0);
    setResults([]);
    setStatus('answering');
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const current = items[idx];
  useEffect(() => {
    if (current) {
      setFen(current.fen);
      setStatus('answering');
      setSelected(null);
    }
  }, [idx, current]);

  const grade = async (nodeId: string, correct: boolean) => {
    try {
      await fetch(`/api/repertoires/${repertoire.id}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: nodeId, correct }),
      });
    } catch {
      /* best-effort */
    }
  };

  const attemptMove = useCallback(
    (source: string, target: string): 'correct' | 'wrong' | 'illegal' => {
      if (!current || status !== 'answering') return 'illegal';
      const game = new Chess(current.fen);
      let move;
      try {
        move = game.move({ from: source, to: target, promotion: 'q' });
      } catch {
        return 'illegal';
      }
      if (!move) return 'illegal';
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      const correct = current.answers.includes(uci);
      if (correct) {
        setFen(game.fen());
        setStatus('correct');
      } else {
        shake.start({ x: [0, -10, 10, -7, 7, 0], transition: { duration: 0.4 } });
        setStatus('wrong');
      }
      setResults((r) => [...r, { item: current, correct }]);
      grade(current.node_id, correct);
      return correct ? 'correct' : 'wrong';
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [current, status, shake, repertoire.id]
  );

  const onDrop = useCallback(
    (source: string, target: string): boolean => attemptMove(source, target) === 'correct',
    [attemptMove]
  );

  const onSquareClick = useCallback(
    (square: string) => {
      if (!current || status !== 'answering') return;
      const game = new Chess(current.fen);
      if (selected && square !== selected) {
        const result = attemptMove(selected, square);
        if (result === 'illegal') {
          const p = game.get(square as any);
          setSelected(p && p.color === game.turn() ? square : null);
        } else {
          setSelected(null);
        }
        return;
      }
      if (selected === square) {
        setSelected(null);
        return;
      }
      const p = game.get(square as any);
      if (p && p.color === game.turn()) setSelected(square);
    },
    [selected, current, status, attemptMove]
  );

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (items.length === 0)
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nothing to review yet — add some lines to this repertoire first.
        </CardContent>
      </Card>
    );

  if (idx >= items.length) {
    const correctCount = results.filter((r) => r.correct).length;
    const wrong = results.filter((r) => !r.correct);
    return (
      <Card>
        <CardContent className="py-8 space-y-4">
          <div className="text-center">
            <p className="text-3xl font-bold">
              {correctCount}/{results.length}
            </p>
            <p className="text-sm text-muted-foreground">correct this session</p>
          </div>
          {wrong.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Lines needing more work:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {wrong.map((w, i) => (
                  <li key={i}>Expected: {w.item.answer_sans.filter(Boolean).join(' or ')}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="text-center">
            <Button onClick={load}>
              <RotateCcw className="w-4 h-4 mr-1.5" /> Review again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const targetGame = current ? new Chess(current.fen) : null;
  const moveTargets =
    selected && status === 'answering' && targetGame
      ? targetGame.moves({ square: selected as any, verbose: true }).map((m: any) => m.to)
      : [];
  const customSquareStyles: Record<string, { background?: string }> = {};
  if (selected) customSquareStyles[selected] = { background: 'rgba(226, 160, 63, 0.5)' };
  for (const sq of moveTargets) {
    customSquareStyles[sq] = {
      background: targetGame && targetGame.get(sq as any)
        ? 'radial-gradient(circle, transparent 56%, rgba(226,160,63,0.55) 58%)'
        : 'radial-gradient(circle, rgba(226,160,63,0.55) 22%, transparent 24%)',
    };
  }

  return (
    <div className="space-y-4 max-w-md">
      <div className="text-sm text-muted-foreground">
        Position {idx + 1} of {items.length} · {repertoire.color} to move — play your move.
      </div>
      <div ref={boardRef} className="w-full max-w-[440px]">
        <motion.div animate={shake}>
          <div
            className={cn(
              'rounded-lg',
              status === 'correct' && 'ring-2 ring-green-500',
              status === 'wrong' && 'ring-2 ring-red-500'
            )}
          >
            <Chessboard
              position={fen}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              boardOrientation={repertoire.color}
              boardWidth={boardWidth}
              arePiecesDraggable={status === 'answering'}
              customSquareStyles={customSquareStyles}
              customBoardStyle={{ borderRadius: '0.5rem' }}
            />
          </div>
        </motion.div>
      </div>

      <div className="min-h-[24px] text-sm font-medium">
        {status === 'correct' && (
          <span className="text-green-500 inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Correct!
          </span>
        )}
        {status === 'wrong' && (
          <span className="text-red-500 inline-flex items-center gap-1.5">
            <X className="w-4 h-4" /> Expected: {current.answer_sans.filter(Boolean).join(' or ')}
          </span>
        )}
      </div>

      {status !== 'answering' && (
        <Button onClick={() => setIdx((i) => i + 1)}>
          <ArrowRight className="w-4 h-4 mr-1.5" /> Next
        </Button>
      )}
    </div>
  );
}
