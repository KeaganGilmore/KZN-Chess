import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { START_FEN } from '@/lib/openings/tree';
import { buildImportTree, flattenImportTree, type ImportNode } from '@/lib/openings/pgn-import';

/** Largest PGN text accepted (a big repertoire file is well under this). */
const MAX_PGN_CHARS = 5_000_000;
/** Most new moves one import may add. */
const MAX_IMPORT_NODES = 20_000;
/** Rows per INSERT (9 columns each, well inside Postgres' bind-parameter limit). */
const INSERT_CHUNK = 500;

/**
 * Import PGN text (any number of games, with variations and comments) into
 * the repertoire tree. Moves already in the tree are reused, so re-importing
 * the same file adds nothing; new moves are inserted parents-first in a few
 * multi-row INSERTs rather than one round trip per move.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  const supabase = createServerClient();

  const { data: rep } = await supabase
    .from('repertoires')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!rep) return NextResponse.json({ error: 'Repertoire not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const pgn = typeof body.pgn === 'string' ? body.pgn : '';
  if (!pgn.trim()) return NextResponse.json({ error: 'The PGN is empty.' }, { status: 400 });
  if (pgn.length > MAX_PGN_CHARS) {
    return NextResponse.json({ error: 'That PGN is too large (5 MB max). Split it into smaller files.' }, { status: 413 });
  }

  const tree = buildImportTree(pgn, { maxNodes: MAX_IMPORT_NODES });
  if (tree.moveCount === 0) {
    const why = tree.skipped[0] ?? tree.errors[0];
    return NextResponse.json(
      { error: why ? `No moves could be imported. ${why}` : 'No chess moves found in that text.', skipped: tree.skipped, errors: tree.errors },
      { status: 400 }
    );
  }

  // Existing tree, to reuse moves already there.
  const { data: existingRows, error: loadError } = await supabase
    .from('repertoire_nodes')
    .select('id, parent_id, move_uci')
    .eq('repertoire_id', params.id);
  if (loadError) {
    console.error('Repertoire import: loading nodes failed:', loadError.message);
    return NextResponse.json({ error: 'Could not load your repertoire. Please try again.' }, { status: 500 });
  }
  const rows = (existingRows ?? []) as { id: string; parent_id: string | null; move_uci: string | null }[];

  let rootId = rows.find((r) => r.parent_id === null)?.id ?? null;
  if (!rootId) {
    const { data: root, error } = await supabase
      .from('repertoire_nodes')
      .insert({ repertoire_id: params.id, parent_id: null, fen: START_FEN })
      .select('id')
      .single();
    if (error || !root) {
      console.error('Repertoire import: creating root failed:', error?.message);
      return NextResponse.json({ error: 'Could not start the repertoire tree. Please try again.' }, { status: 500 });
    }
    rootId = root.id as string;
  }

  const existing = new Map<string, string>();
  for (const r of rows) if (r.parent_id && r.move_uci) existing.set(`${r.parent_id}|${r.move_uci}`, r.id);

  // Map every imported move to a DB id: an existing node, or a new one.
  const dbId = new Map<ImportNode, string>();
  const newRows: Record<string, unknown>[] = [];
  let reused = 0;
  for (const { node, parent } of flattenImportTree(tree.children)) {
    const parentId = parent ? dbId.get(parent)! : rootId;
    const found = existing.get(`${parentId}|${node.uci}`);
    if (found) {
      dbId.set(node, found);
      reused++;
      continue;
    }
    const id = randomUUID();
    dbId.set(node, id);
    newRows.push({
      id,
      repertoire_id: params.id,
      parent_id: parentId,
      fen: node.fen,
      move_san: node.san,
      move_uci: node.uci,
      comment_before: node.commentBefore,
      comment_after: node.commentAfter,
      arrows: node.arrows,
    });
  }

  // Parents come before children in newRows, so each chunk's parents exist.
  let added = 0;
  for (let i = 0; i < newRows.length; i += INSERT_CHUNK) {
    const chunk = newRows.slice(i, i + INSERT_CHUNK);
    const { error } = await supabase.from('repertoire_nodes').insert(chunk);
    if (error) {
      console.error('Repertoire import: insert failed:', error.message);
      return NextResponse.json(
        {
          error:
            added > 0
              ? `Import stopped part-way: ${added} moves were added before an error. Importing the same file again will add the rest.`
              : 'Could not save the imported moves. Please try again.',
          added,
        },
        { status: 500 }
      );
    }
    added += chunk.length;
  }

  if (added > 0) {
    await supabase.from('repertoires').update({ updated_at: new Date().toISOString() }).eq('id', params.id);
  }

  return NextResponse.json({
    added,
    reused,
    games: tree.games,
    imported_games: tree.importedGames,
    skipped: tree.skipped,
    errors: tree.errors,
    truncated: tree.truncated,
  });
}
