'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import {
  Undo2,
  Trash2,
  Save,
  Upload,
  CornerDownRight,
  Repeat,
  Maximize2,
  ArrowRight,
  Pencil,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { childrenOf, pathToNode, START_FEN, type RepNode, type NodeArrow } from '@/lib/openings/tree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AnnotatedBoard, ARROW_COLORS } from './annotated-board';
import { BoardStage } from './board-stage';
import { MarkdownNote } from './markdown-note';

interface Rep {
  id: string;
  name: string;
  color: 'white' | 'black';
}
type Mode = 'edit' | 'read' | 'learn';

function TreeRows({
  nodes,
  parentId,
  currentId,
  onSelect,
  depth = 0,
}: {
  nodes: RepNode[];
  parentId: string;
  currentId: string | null;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  const kids = childrenOf(nodes, parentId);
  if (kids.length === 0) return null;
  return (
    <>
      {kids.map((k) => (
        <div key={k.id}>
          <button
            onClick={() => onSelect(k.id)}
            style={{ paddingLeft: 8 + Math.min(depth, 6) * 14 }}
            className={cn(
              'block w-max min-w-full text-left text-sm py-0.5 rounded hover:bg-secondary whitespace-nowrap',
              k.id === currentId && 'text-primary font-medium'
            )}
          >
            <CornerDownRight className="inline w-3 h-3 mr-1 text-muted-foreground" />
            {k.move_san}
            {(k.comment_after || k.comment_before) && <span className="ml-1 text-primary/60">•</span>}
          </button>
          <TreeRows nodes={nodes} parentId={k.id} currentId={currentId} onSelect={onSelect} depth={depth + 1} />
        </div>
      ))}
    </>
  );
}

export function RepertoireBuilder({
  repertoire,
  initialNodes,
}: {
  repertoire: Rep;
  initialNodes: RepNode[];
}) {
  const [nodes, setNodes] = useState<RepNode[]>(initialNodes);
  const rootId = useMemo(() => nodes.find((n) => n.parent_id === null)?.id ?? null, [nodes]);
  const [currentId, setCurrentId] = useState<string | null>(rootId);
  const [orientation, setOrientation] = useState<'white' | 'black'>(repertoire.color);
  const [fullscreen, setFullscreen] = useState(false);
  const [mode, setMode] = useState<Mode>('edit');
  const [drawColor, setDrawColor] = useState('green');

  const [cbefore, setCbefore] = useState('');
  const [cafter, setCafter] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [pgn, setPgn] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!currentId && rootId) setCurrentId(rootId);
  }, [rootId, currentId]);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const current = currentId ? byId.get(currentId) : undefined;
  const currentFen = current?.fen ?? START_FEN;
  const kids = currentId ? childrenOf(nodes, currentId) : [];
  const path = currentId ? pathToNode(nodes, currentId).filter((n) => n.move_san) : [];
  const lastMove = current?.move_uci ? { from: current.move_uci.slice(0, 2), to: current.move_uci.slice(2, 4) } : null;

  useEffect(() => {
    setCbefore(current?.comment_before || '');
    setCafter(current?.comment_after || current?.notes || '');
    setTagsInput((current?.tags || []).join(', '));
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const reload = async () => {
    const json = await fetch(`/api/repertoires/${repertoire.id}`).then((r) => r.json()).catch(() => ({}));
    if (json.nodes) setNodes(json.nodes);
  };

  const patchNode = useCallback(
    async (id: string, body: any) => {
      const json = await fetch(`/api/repertoires/${repertoire.id}/nodes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then((r) => r.json())
        .catch(() => ({}));
      if (json.node) setNodes((prev) => prev.map((n) => (n.id === json.node.id ? json.node : n)));
    },
    [repertoire.id]
  );

  const onMove = useCallback(
    (from: string, to: string): boolean => {
      const game = new Chess(currentFen);
      let move;
      try {
        move = game.move({ from, to, promotion: 'q' });
      } catch {
        return false;
      }
      if (!move) return false;
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      const existing = nodes.find((n) => n.parent_id === currentId && n.move_uci === uci);
      if (existing) {
        setCurrentId(existing.id);
        return true;
      }
      const fen = game.fen();
      (async () => {
        const json = await fetch(`/api/repertoires/${repertoire.id}/nodes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parent_id: currentId, fen, move_san: move.san, move_uci: uci }),
        })
          .then((r) => r.json())
          .catch(() => ({}));
        if (json.node) {
          setNodes((prev) => (prev.some((n) => n.id === json.node.id) ? prev : [...prev, json.node]));
          setCurrentId(json.node.id);
        }
      })();
      return true;
    },
    [currentFen, currentId, nodes, repertoire.id]
  );

  const onDrawArrows = useCallback(
    (drawn: NodeArrow[]) => {
      if (!currentId) return;
      setNodes((prev) => prev.map((n) => (n.id === currentId ? { ...n, arrows: drawn } : n)));
      patchNode(currentId, { arrows: drawn });
    },
    [currentId, patchNode]
  );

  const saveAnnotations = () => {
    if (!currentId) return;
    patchNode(currentId, {
      comment_before: cbefore,
      comment_after: cafter,
      tags: tagsInput.split(',').map((t) => t.trim()).filter(Boolean),
    });
  };

  const deleteNode = async () => {
    if (!current?.parent_id || !currentId) return;
    if (!confirm('Delete this move and everything after it?')) return;
    await fetch(`/api/repertoires/${repertoire.id}/nodes/${currentId}`, { method: 'DELETE' });
    const toRemove = new Set<string>();
    const collect = (id: string) => {
      toRemove.add(id);
      nodes.filter((n) => n.parent_id === id).forEach((c) => collect(c.id));
    };
    collect(currentId);
    const parent = current.parent_id;
    setNodes((prev) => prev.filter((n) => !toRemove.has(n.id)));
    setCurrentId(parent);
  };

  const importPgn = async () => {
    if (!pgn.trim()) return;
    setImporting(true);
    await fetch(`/api/repertoires/${repertoire.id}/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pgn }),
    });
    setPgn('');
    await reload();
    setImporting(false);
  };

  const goParent = () => current?.parent_id && setCurrentId(current.parent_id);
  const goFirstChild = () => kids[0] && setCurrentId(kids[0].id);

  // Read mode: the mainline from root through the current node's deepest first-child chain.
  const readLine = useMemo(() => {
    const line: RepNode[] = [];
    let n: RepNode | undefined = rootId ? byId.get(rootId) : undefined;
    // walk down first-children
    while (n) {
      if (n.move_san) line.push(n);
      const c = childrenOf(nodes, n.id);
      n = c[0];
    }
    return line;
  }, [nodes, rootId, byId]);

  const board = (
    <AnnotatedBoard
      fen={currentFen}
      orientation={orientation}
      onMove={onMove}
      arrows={current?.arrows || []}
      lastMove={lastMove}
      allowDraw={mode === 'edit'}
      onDrawArrows={onDrawArrows}
      drawColor={drawColor}
      interactive={mode !== 'read'}
      maxWidth={720}
    />
  );

  const upcoming = kids[0];

  return (
    <div className="md:space-y-3">
      <div className="px-3 md:px-0 pt-2 md:pt-0 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
          {(['edit', 'read', 'learn'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'px-3 py-1.5 rounded-md inline-flex items-center gap-1.5 capitalize',
                mode === m ? 'bg-primary/10 text-primary' : 'text-muted-foreground'
              )}
            >
              {m === 'edit' ? <Pencil className="w-3.5 h-3.5" /> : m === 'read' ? <BookOpen className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
              {m}
            </button>
          ))}
        </div>
      </div>

      <BoardStage
        fullscreen={fullscreen}
        onExitFullscreen={() => setFullscreen(false)}
        breadcrumb={
          path.length === 0 ? (
            <span className="text-muted-foreground">Start position</span>
          ) : (
            path.map((n) => (
              <button key={n.id} onClick={() => setCurrentId(n.id)} className="hover:text-foreground">
                {n.move_san}
              </button>
            ))
          )
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
            {mode === 'edit' && (
              <div className="flex items-center gap-1 ml-1">
                {Object.keys(ARROW_COLORS).map((c) => (
                  <button
                    key={c}
                    onClick={() => setDrawColor(c)}
                    aria-label={`Arrow ${c}`}
                    className={cn('w-6 h-6 rounded-full border-2', drawColor === c ? 'border-foreground' : 'border-transparent')}
                    style={{ background: ARROW_COLORS[c] }}
                  />
                ))}
              </div>
            )}
          </>
        }
        panel={
          mode === 'read' ? (
            <ReadPanel line={readLine} onSelect={setCurrentId} currentId={currentId} />
          ) : mode === 'learn' ? (
            <LearnPanel current={current} upcoming={upcoming} />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Continuations</CardTitle>
                </CardHeader>
                <CardContent>
                  {kids.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Play a move on the board to add one.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {kids.map((k) => (
                        <Button key={k.id} variant="outline" size="sm" onClick={() => setCurrentId(k.id)}>
                          {k.move_san}
                        </Button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Annotations (markdown)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Comment before the move</label>
                    <Textarea value={cbefore} onChange={(e) => setCbefore(e.target.value)} rows={2} placeholder="Shown before the move in Learn mode…" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Comment after the move</label>
                    <Textarea value={cafter} onChange={(e) => setCafter(e.target.value)} rows={3} placeholder="Idea / plan / why this move…" />
                  </div>
                  <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tags, comma separated" />
                  {current?.tags && current.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {current.tags.map((t) => (
                        <Badge key={t} variant="outline">{t}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveAnnotations} disabled={!currentId}>
                      <Save className="w-4 h-4 mr-1.5" /> Save
                    </Button>
                    {current?.parent_id && (
                      <Button size="sm" variant="outline" onClick={deleteNode}>
                        <Trash2 className="w-4 h-4 mr-1.5" /> Delete line
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Right-click-drag on the board to draw arrows (colour above). Arrows save automatically.
                  </p>
                </CardContent>
              </Card>

              {rootId && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Repertoire lines</CardTitle>
                  </CardHeader>
                  <CardContent className="max-h-64 overflow-auto">
                    <TreeRows nodes={nodes} parentId={rootId} currentId={currentId} onSelect={setCurrentId} />
                    {childrenOf(nodes, rootId).length === 0 && (
                      <p className="text-sm text-muted-foreground">Empty — build a line or import a PGN.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Import PGN</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Textarea value={pgn} onChange={(e) => setPgn(e.target.value)} rows={2} placeholder="Paste a PGN line…" />
                  <Button size="sm" onClick={importPgn} disabled={importing || !pgn.trim()}>
                    <Upload className="w-4 h-4 mr-1.5" /> {importing ? 'Importing…' : 'Import mainline'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )
        }
        footer={
          <>
            <Button variant="outline" size="sm" className="flex-1" onClick={goParent} disabled={!current?.parent_id}>
              <Undo2 className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onClick={goFirstChild} disabled={kids.length === 0}>
              Next <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </>
        }
      />
    </div>
  );
}

function ReadPanel({ line, onSelect, currentId }: { line: RepNode[]; onSelect: (id: string) => void; currentId: string | null }) {
  if (line.length === 0) return <p className="text-sm text-muted-foreground">No moves yet.</p>;
  return (
    <div className="space-y-3">
      {line.map((n, i) => (
        <div key={n.id} className={cn('rounded-lg p-3 border', n.id === currentId ? 'border-primary/40 bg-primary/[0.03]' : 'border-border')}>
          <button onClick={() => onSelect(n.id)} className="font-medium text-sm mb-1">
            {Math.floor(i / 2) + 1}
            {i % 2 === 0 ? '.' : '…'} {n.move_san}
          </button>
          {n.comment_before && (
            <div className="text-muted-foreground mb-1">
              <MarkdownNote>{n.comment_before}</MarkdownNote>
            </div>
          )}
          {(n.comment_after || n.notes) && <MarkdownNote>{(n.comment_after || n.notes)!}</MarkdownNote>}
        </div>
      ))}
    </div>
  );
}

function LearnPanel({ current, upcoming }: { current?: RepNode; upcoming?: RepNode }) {
  return (
    <div className="space-y-3">
      {current?.comment_after || current?.notes ? (
        <Card>
          <CardContent className="p-3 animate-note-slide">
            <p className="text-xs text-muted-foreground mb-1">After {current.move_san}</p>
            <MarkdownNote>{(current.comment_after || current.notes)!}</MarkdownNote>
          </CardContent>
        </Card>
      ) : null}
      {upcoming ? (
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground mb-1">Next move: {upcoming.move_san}</p>
            {upcoming.comment_before ? (
              <MarkdownNote>{upcoming.comment_before}</MarkdownNote>
            ) : (
              <p className="text-sm text-muted-foreground">Tap Next to play {upcoming.move_san}.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">End of line. Use Back to review.</p>
      )}
    </div>
  );
}
