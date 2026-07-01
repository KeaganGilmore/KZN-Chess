'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { Check, X, ArrowRight, RotateCcw, RefreshCw, Maximize2, Repeat, Target, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { NodeArrow } from '@/lib/openings/tree';
import { levelLabel } from '@/lib/openings/spaced-repetition';
import { AnnotatedBoard } from './annotated-board';
import { BoardStage } from './board-stage';
import { MarkdownNote } from './markdown-note';

interface Card_ {
  node_id: string;
  start_fen: string;
  answer_uci: string;
  move_san: string | null;
  comment_after: string | null;
  arrows: NodeArrow[];
  sr_level: number;
  fail_count: number;
}
type Mode = 'due' | 'weak';
type Phase = 'awaiting' | 'wrong' | 'correct' | 'done';

const uciFrom = (u: string) => u.slice(0, 2);
const uciTo = (u: string) => u.slice(2, 4);

export function OpeningQuiz({
  repertoire,
  initialMode = 'due',
}: {
  repertoire: { id: string; name: string; color: 'white' | 'black' };
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [items, setItems] = useState<Card_[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('awaiting');
  const [fen, setFen] = useState('');
  const [arrows, setArrows] = useState<NodeArrow[]>([]);
  const [border, setBorder] = useState<'none' | 'wrong' | 'correct'>('none');
  const [orientation, setOrientation] = useState<'white' | 'black'>(repertoire.color);
  const [fullscreen, setFullscreen] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const attempted = useRef(false); // has this card already been failed this session
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const load = useCallback(async () => {
    setLoading(true);
    clearTimers();
    const json = await fetch(`/api/repertoires/${repertoire.id}/review?mode=${mode}`)
      .then((r) => r.json())
      .catch(() => ({ items: [] }));
    setItems(json.items || []);
    setIdx(0);
    setResults([]);
    setPhase(json.items?.length ? 'awaiting' : 'done');
    setLoading(false);
  }, [repertoire.id, mode]);

  useEffect(() => {
    load();
    return clearTimers;
  }, [load]);

  const current = items[idx];

  // Reset board when the card changes.
  useEffect(() => {
    if (current) {
      setFen(current.start_fen);
      setArrows([]);
      setBorder('none');
      setOrientation(repertoire.color);
      attempted.current = false;
      setPhase('awaiting');
    }
  }, [idx, current, repertoire.color]);

  const grade = useCallback(
    (correct: boolean) => {
      if (!current) return;
      fetch(`/api/repertoires/${repertoire.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ node_id: current.node_id, correct }),
      }).catch(() => {});
    },
    [current, repertoire.id]
  );

  const onMove = useCallback(
    (from: string, to: string): boolean => {
      if (!current || phase !== 'awaiting') return false;
      const game = new Chess(current.start_fen);
      let move;
      try {
        move = game.move({ from, to, promotion: 'q' });
      } catch {
        return false;
      }
      if (!move) return false;
      const played = `${move.from}${move.to}${move.promotion || ''}`;
      const correct = played === current.answer_uci || played.slice(0, 4) === current.answer_uci.slice(0, 4);

      if (correct) {
        setFen(game.fen());
        setArrows([]);
        setBorder('correct');
        setPhase('correct');
        if (!attempted.current) {
          grade(true);
          setResults((r) => [...r, { correct: true }]);
        } else {
          setResults((r) => [...r, { correct: false }]); // completed after a miss
        }
        return true;
      }

      // Wrong-move sequence (spec §5): snap back, red pulse, then auto-play the
      // correct move with a green arrow and reveal comment_after.
      if (!attempted.current) {
        grade(false);
        attempted.current = true;
      }
      setBorder('wrong');
      clearTimers();
      timers.current.push(
        setTimeout(() => {
          const g = new Chess(current.start_fen);
          const a = current.answer_uci;
          g.move({ from: uciFrom(a), to: uciTo(a), promotion: a.slice(4) || undefined });
          setFen(g.fen());
          setArrows([{ from: uciFrom(a), to: uciTo(a), color: 'green' }]);
          setBorder('none');
          setPhase('wrong');
        }, 400)
      );
      return false;
    },
    [current, phase, grade]
  );

  const gotIt = () => {
    if (!current) return;
    clearTimers();
    setFen(current.start_fen);
    setArrows([]);
    setBorder('none');
    setPhase('awaiting');
  };

  const next = () => {
    clearTimers();
    setIdx((i) => i + 1);
    if (idx + 1 >= items.length) setPhase('done');
  };

  const lastMove =
    phase === 'wrong' || phase === 'correct'
      ? { from: uciFrom(current?.answer_uci || '  '), to: uciTo(current?.answer_uci || '    ') }
      : null;

  const board = current ? (
    <AnnotatedBoard
      fen={fen || current.start_fen}
      orientation={orientation}
      onMove={onMove}
      arrows={arrows}
      lastMove={lastMove}
      interactive={phase === 'awaiting'}
      border={border}
      maxWidth={720}
    />
  ) : null;

  // ---- render states ----
  if (loading) return <p className="text-sm text-muted-foreground px-3 md:px-0">Loading…</p>;

  if (!items.length || phase === 'done') {
    const correctCount = results.filter((r) => r.correct).length;
    return (
      <div className="px-3 md:px-0 space-y-4">
        <ModeTabs mode={mode} onChange={setMode} />
        <Card>
          <CardContent className="py-8 text-center space-y-3">
            {results.length > 0 ? (
              <>
                <p className="text-3xl font-bold">
                  {correctCount}/{results.length}
                </p>
                <p className="text-sm text-muted-foreground">clean first-try answers this session</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {mode === 'weak'
                  ? 'No problem moves right now — nice.'
                  : 'Nothing due for review. Add lines or check back later.'}
              </p>
            )}
            <Button onClick={load}>
              <RefreshCw className="w-4 h-4 mr-1.5" /> Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="md:space-y-3">
      <div className="px-3 md:px-0 pt-2 md:pt-0">
        <ModeTabs mode={mode} onChange={setMode} />
      </div>
      <BoardStage
        fullscreen={fullscreen}
        onExitFullscreen={() => setFullscreen(false)}
        breadcrumb={
          <span className="text-muted-foreground">
            {mode === 'weak' ? 'Problem move' : 'Review'} {idx + 1}/{items.length} ·{' '}
            <span className="capitalize">{repertoire.color}</span> to play · L{current.sr_level}
          </span>
        }
        board={board}
        controls={
          <>
            <Button variant="outline" size="sm" onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}>
              <Repeat className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </>
        }
        panel={
          <div className="space-y-3">
            {phase === 'awaiting' && (
              <p className="text-sm text-muted-foreground">
                Play {repertoire.color === 'white' ? "White's" : "Black's"} move from your repertoire.
              </p>
            )}
            {phase === 'correct' && (
              <p className="text-green-500 inline-flex items-center gap-1.5 text-sm font-medium">
                <Check className="w-4 h-4" /> Correct{attempted.current ? ' (after a miss)' : '!'}
              </p>
            )}
            {phase === 'wrong' && (
              <div className="space-y-2 animate-note-slide">
                <p className="text-red-500 inline-flex items-center gap-1.5 text-sm font-medium">
                  <X className="w-4 h-4" /> The move was {current.move_san}
                </p>
                {current.comment_after ? (
                  <Card>
                    <CardContent className="p-3">
                      <MarkdownNote>{current.comment_after}</MarkdownNote>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        }
        footer={
          <>
            {phase === 'correct' && (
              <Button size="sm" className="flex-1" onClick={next}>
                <ArrowRight className="w-4 h-4 mr-1.5" /> Next
              </Button>
            )}
            {phase === 'wrong' && (
              <>
                <Button size="sm" variant="outline" className="flex-1" onClick={gotIt}>
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Got it — try again
                </Button>
                <Button size="sm" className="flex-1" onClick={next}>
                  <ArrowRight className="w-4 h-4 mr-1.5" /> Skip
                </Button>
              </>
            )}
            {phase === 'awaiting' && (
              <p className="text-xs text-muted-foreground">Next review: {levelLabel(current.sr_level)}</p>
            )}
          </>
        }
      />
    </div>
  );
}

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
      <button
        onClick={() => onChange('due')}
        className={cn('px-3 py-1.5 rounded-md inline-flex items-center gap-1.5', mode === 'due' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
      >
        <Clock className="w-3.5 h-3.5" /> Review
      </button>
      <button
        onClick={() => onChange('weak')}
        className={cn('px-3 py-1.5 rounded-md inline-flex items-center gap-1.5', mode === 'weak' ? 'bg-primary/10 text-primary' : 'text-muted-foreground')}
      >
        <Target className="w-3.5 h-3.5" /> Problem moves
      </button>
    </div>
  );
}
