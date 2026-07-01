export const START_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface NodeArrow {
  from: string;
  to: string;
  color: string;
}

export interface RepNode {
  id: string;
  parent_id: string | null;
  fen: string;
  move_san: string | null;
  move_uci: string | null;
  notes: string | null;
  tags: string[];
  comment_before: string | null;
  comment_after: string | null;
  arrows: NodeArrow[];
}

export function childrenOf(nodes: RepNode[], parentId: string | null): RepNode[] {
  return nodes.filter((n) => n.parent_id === parentId);
}

/** The SAN line from the root down to (and including) the given node. */
export function pathToNode(nodes: RepNode[], nodeId: string): RepNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: RepNode[] = [];
  let cur: RepNode | undefined = byId.get(nodeId);
  while (cur) {
    path.unshift(cur);
    cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
  }
  return path;
}
