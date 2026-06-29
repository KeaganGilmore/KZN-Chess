'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { Undo2, Trash2, Save, Upload, CornerDownRight } from 'lucide-react';
import { childrenOf, pathToNode, START_FEN, type RepNode } from '@/lib/openings/tree';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const Chessboard = dynamic(() => import('react-chessboard').then((m) => m.Chessboard), { ssr: false });

interface Rep {
  id: string;
  name: string;
  color: 'white' | 'black';
}

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
            style={{ paddingLeft: 8 + depth * 14 }}
            className={`block w-full text-left text-sm py-0.5 rounded hover:bg-secondary ${
              k.id === currentId ? 'text-primary font-medium' : ''
            }`}
          >
            <CornerDownRight className="inline w-3 h-3 mr-1 text-muted-foreground" />
            {k.move_san}
            {k.tags.length > 0 && <span className="ml-2 text-[10px] text-muted-foreground">{k.tags.join(' · ')}</span>}
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
  const [boardWidth, setBoardWidth] = useState(420);
  const [notes, setNotes] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [pgn, setPgn] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    if (!currentId && rootId) setCurrentId(rootId);
  }, [rootId, currentId]);

  useEffect(() => {
    const u = () => setBoardWidth(Math.min(440, window.innerWidth - 48));
    u();
    window.addEventListener('resize', u);
    return () => window.removeEventListener('resize', u);
  }, []);

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const current = currentId ? byId.get(currentId) : undefined;
  const currentFen = current?.fen ?? START_FEN;
  const kids = currentId ? childrenOf(nodes, currentId) : [];
  const path = currentId ? pathToNode(nodes, currentId).filter((n) => n.move_san) : [];

  useEffect(() => {
    setNotes(current?.notes || '');
    setTagsInput((current?.tags || []).join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const reload = async () => {
    const json = await fetch(`/api/repertoires/${repertoire.id}`).then((r) => r.json()).catch(() => ({}));
    if (json.nodes) setNodes(json.nodes);
  };

  const onDrop = useCallback(
    (source: string, target: string): boolean => {
      const game = new Chess(currentFen);
      let move;
      try {
        move = game.move({ from: source, to: target, promotion: 'q' });
      } catch {
        return false;
      }
      if (!move) return false;
      const uci = `${move.from}${move.to}${move.promotion || ''}`;
      const fen = game.fen();
      const existing = nodes.find((n) => n.parent_id === currentId && n.move_uci === uci);
      if (existing) {
        setCurrentId(existing.id);
        return true;
      }
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

  const saveNotes = async () => {
    if (!currentId) return;
    const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
    const json = await fetch(`/api/repertoires/${repertoire.id}/nodes/${currentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, tags }),
    })
      .then((r) => r.json())
      .catch(() => ({}));
    if (json.node) setNodes((prev) => prev.map((n) => (n.id === json.node.id ? json.node : n)));
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

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-8">
      {/* Board + line */}
      <div className="space-y-3">
        <Chessboard
          position={currentFen}
          onPieceDrop={onDrop}
          boardOrientation={repertoire.color}
          boardWidth={boardWidth}
          customBoardStyle={{ borderRadius: '0.5rem' }}
        />
        <div className="text-sm text-muted-foreground flex flex-wrap gap-1 items-center min-h-[20px]">
          {path.length === 0 ? (
            <span>Starting position — play a move to begin.</span>
          ) : (
            path.map((n) => (
              <button key={n.id} onClick={() => setCurrentId(n.id)} className="hover:text-foreground">
                {n.move_san}
              </button>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => current?.parent_id && setCurrentId(current.parent_id)} disabled={!current?.parent_id}>
            <Undo2 className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={() => rootId && setCurrentId(rootId)}>
            Start
          </Button>
          {current?.parent_id && (
            <Button variant="outline" size="sm" onClick={deleteNode}>
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete line
            </Button>
          )}
        </div>
      </div>

      {/* Side panels */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Continuations from here</CardTitle>
          </CardHeader>
          <CardContent>
            {kids.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                None yet — play a move on the board to add one.
              </p>
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
          <CardHeader>
            <CardTitle className="text-base">Notes &amp; tags for this position</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ideas, plans, traps to remember…" />
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="tags, comma separated" />
            {current?.tags && current.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {current.tags.map((t) => (
                  <Badge key={t} variant="outline">{t}</Badge>
                ))}
              </div>
            )}
            <Button size="sm" onClick={saveNotes} disabled={!currentId}>
              <Save className="w-4 h-4 mr-1.5" /> Save
            </Button>
          </CardContent>
        </Card>

        {rootId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Repertoire lines</CardTitle>
            </CardHeader>
            <CardContent className="max-h-72 overflow-y-auto">
              <TreeRows nodes={nodes} parentId={rootId} currentId={currentId} onSelect={setCurrentId} />
              {childrenOf(nodes, rootId).length === 0 && (
                <p className="text-sm text-muted-foreground">Empty — build a line or import a PGN.</p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import PGN</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={pgn} onChange={(e) => setPgn(e.target.value)} rows={3} placeholder="Paste a PGN line…" />
            <Button size="sm" onClick={importPgn} disabled={importing || !pgn.trim()}>
              <Upload className="w-4 h-4 mr-1.5" /> {importing ? 'Importing…' : 'Import mainline'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
