'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { RepNode } from '@/lib/openings/tree';
import { cn } from '@/lib/utils';

/** Trees up to this size start fully expanded; bigger ones (imports) start folded below the first level. */
const OPEN_BY_DEFAULT_MAX_NODES = 80;
const INDENT_PX = 14;
const MAX_INDENT_LEVELS = 8;

interface TreeIndex {
  kids: Map<string, RepNode[]>;
  /** Half-moves from the start position (first move = 1). */
  ply: Map<string, number>;
  /** Number of complete lines (leaves) below a node. */
  lines: Map<string, number>;
  parent: Map<string, string | null>;
}

function indexTree(nodes: RepNode[], rootId: string): TreeIndex {
  const kids = new Map<string, RepNode[]>();
  const parent = new Map<string, string | null>();
  for (const n of nodes) {
    parent.set(n.id, n.parent_id);
    if (n.parent_id) {
      const list = kids.get(n.parent_id);
      if (list) list.push(n);
      else kids.set(n.parent_id, [n]);
    }
  }
  const ply = new Map<string, number>([[rootId, 0]]);
  const order: string[] = [rootId];
  for (let i = 0; i < order.length; i++) {
    for (const k of kids.get(order[i]) ?? []) {
      ply.set(k.id, ply.get(order[i])! + 1);
      order.push(k.id);
    }
  }
  const lines = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const ks = kids.get(id) ?? [];
    lines.set(id, ks.length === 0 ? 1 : ks.reduce((n, k) => n + (lines.get(k.id) ?? 1), 0));
  }
  return { kids, ply, lines, parent };
}

/**
 * The repertoire as a collapsible variation tree: moves with no alternatives
 * run together on one row ("1. e4 e5 2. Nf3 Nc6"), and every branch point
 * gets a toggle that folds the lines below it.
 */
export function RepertoireTree({
  nodes,
  rootId,
  currentId,
  onSelect,
}: {
  nodes: RepNode[];
  rootId: string;
  currentId: string | null;
  onSelect: (id: string) => void;
}) {
  const idx = useMemo(() => indexTree(nodes, rootId), [nodes, rootId]);
  const small = nodes.length <= OPEN_BY_DEFAULT_MAX_NODES;
  const [bulk, setBulk] = useState<'auto' | 'all' | 'none'>('auto');
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  // Keep the selected move visible: open every branch point above it.
  useEffect(() => {
    if (!currentId) return;
    const open: Record<string, boolean> = {};
    let p = idx.parent.get(currentId) ?? null;
    while (p) {
      if ((idx.kids.get(p)?.length ?? 0) > 1) open[p] = true;
      p = idx.parent.get(p) ?? null;
    }
    if (Object.keys(open).length) setOverrides((prev) => ({ ...prev, ...open }));
  }, [currentId, idx]);

  const isOpen = (id: string, depth: number) =>
    overrides[id] ?? (bulk === 'all' ? true : bulk === 'none' ? false : small || depth === 0);

  const toggle = (id: string, depth: number) =>
    setOverrides((prev) => ({ ...prev, [id]: !isOpen(id, depth) }));

  const moveLabel = (n: RepNode, first: boolean) => {
    const ply = idx.ply.get(n.id) ?? 1;
    const num = Math.ceil(ply / 2);
    if (ply % 2 === 1) return `${num}. ${n.move_san}`;
    return first ? `${num}… ${n.move_san}` : n.move_san;
  };

  const segment = (start: RepNode, depth: number): ReactNode => {
    const chain: RepNode[] = [start];
    let end = start;
    for (let next = idx.kids.get(end.id); next && next.length === 1; next = idx.kids.get(end.id)) {
      end = next[0];
      chain.push(end);
    }
    const branches = idx.kids.get(end.id) ?? [];
    const open = branches.length > 0 && isOpen(end.id, depth);
    return (
      <div key={start.id}>
        <div
          className="flex items-start gap-1 py-0.5"
          style={{ paddingLeft: Math.min(depth, MAX_INDENT_LEVELS) * INDENT_PX }}
        >
          {branches.length > 0 ? (
            <button
              type="button"
              onClick={() => toggle(end.id, depth)}
              aria-expanded={open}
              aria-label={open ? 'Collapse these lines' : 'Expand these lines'}
              className="mt-0.5 shrink-0 rounded text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-1 text-sm leading-6">
            {chain.map((n, i) => (
              <button
                key={n.id}
                type="button"
                onClick={() => onSelect(n.id)}
                className={cn(
                  'whitespace-nowrap rounded px-0.5 hover:bg-secondary',
                  n.id === currentId ? 'bg-primary/15 font-medium text-primary' : depth > 0 && 'text-foreground/85'
                )}
              >
                {moveLabel(n, i === 0)}
                {(n.comment_after || n.comment_before) && <span className="ml-0.5 text-primary/60">•</span>}
              </button>
            ))}
            {branches.length > 0 && !open && (
              <button
                type="button"
                onClick={() => toggle(end.id, depth)}
                className="whitespace-nowrap rounded-full border border-border px-1.5 text-xs leading-5 text-muted-foreground hover:text-foreground"
              >
                {idx.lines.get(end.id)} lines
              </button>
            )}
          </div>
        </div>
        {open && branches.map((b) => segment(b, depth + 1))}
      </div>
    );
  };

  const top = idx.kids.get(rootId) ?? [];
  if (top.length === 0) return null;
  const hasBranches = nodes.some((n) => (idx.kids.get(n.id)?.length ?? 0) > 1);

  return (
    <div>
      {hasBranches && (
        <div className="mb-2 flex gap-3 text-xs">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setBulk('all');
              setOverrides({});
            }}
          >
            Expand all
          </button>
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => {
              setBulk('none');
              setOverrides({});
            }}
          >
            Collapse all
          </button>
          <span className="ml-auto text-muted-foreground">{idx.lines.get(rootId)} lines</span>
        </div>
      )}
      {top.map((t) => segment(t, 0))}
    </div>
  );
}
