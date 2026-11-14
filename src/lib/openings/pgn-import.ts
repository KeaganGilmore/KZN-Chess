import { Chess } from 'chess.js';
import { START_FEN, type NodeArrow } from './tree';

/**
 * PGN → repertoire move tree.
 *
 * chess.js's loadPgn reads one game and drops every variation, which is
 * useless for repertoire files (a Lichess study export or a ChessBase file
 * is many games, each full of side lines). This parser reads any number of
 * games, keeps all variations, and merges them into one tree keyed by move,
 * so lines shared between games are stored once. `{comments}` become move
 * notes and Lichess `[%cal ...]` commands become board arrows.
 */

export interface ImportNode {
  san: string;
  uci: string;
  /** Position after this move. */
  fen: string;
  commentBefore: string | null;
  commentAfter: string | null;
  /** Arrows shown in the position after this move. */
  arrows: NodeArrow[];
  children: ImportNode[];
}

export interface ImportTree {
  /** First moves from the start position. */
  children: ImportNode[];
  /** Games found in the text. */
  games: number;
  /** Games that contributed at least one move. */
  importedGames: number;
  /** Unique moves (tree nodes) in the import. */
  moveCount: number;
  /** Whole games left out, with the reason. */
  skipped: string[];
  /** Lines cut short (illegal or unreadable move), with where. */
  errors: string[];
  /** True when maxNodes was reached and the rest was ignored. */
  truncated: boolean;
}

type Token =
  | { t: 'tag'; name: string; value: string }
  | { t: 'move'; text: string }
  | { t: 'comment'; text: string }
  | { t: 'open' }
  | { t: 'close' }
  | { t: 'result' };

const RESULT = /^(1-0|0-1|1\/2-1\/2|½-½|\*)$/;
const TAG = /\[\s*([A-Za-z0-9_]+)\s+"((?:[^"\\]|\\.)*)"\s*\]/y;
const WORD_END = /[\s{}()[\];$]/;

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const n = text.length;
  let i = 0;
  let lineStart = true;
  while (i < n) {
    const c = text[i];
    if (c === '\n' || c === '\r') {
      lineStart = true;
      i++;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\f' || c === '\v' || c === '﻿') {
      i++;
      continue;
    }
    const atLineStart = lineStart;
    lineStart = false;
    if (c === '%' && atLineStart) {
      // Escape line: ignored by the PGN standard.
      while (i < n && text[i] !== '\n') i++;
      continue;
    }
    if (c === '{') {
      const end = text.indexOf('}', i + 1);
      const stop = end === -1 ? n : end;
      out.push({ t: 'comment', text: text.slice(i + 1, stop) });
      i = stop + 1;
      continue;
    }
    if (c === ';') {
      let end = text.indexOf('\n', i + 1);
      if (end === -1) end = n;
      out.push({ t: 'comment', text: text.slice(i + 1, end) });
      i = end;
      continue;
    }
    if (c === '[') {
      TAG.lastIndex = i;
      const m = TAG.exec(text);
      if (m) {
        out.push({ t: 'tag', name: m[1], value: m[2].replace(/\\(.)/g, '$1') });
        i = TAG.lastIndex;
      } else {
        i++;
      }
      continue;
    }
    if (c === '(') {
      out.push({ t: 'open' });
      i++;
      continue;
    }
    if (c === ')') {
      out.push({ t: 'close' });
      i++;
      continue;
    }
    if (c === '$') {
      // NAG ($1, $14…): ignored.
      i++;
      while (i < n && /\d/.test(text[i])) i++;
      continue;
    }
    if (c === ']' || c === '}') {
      i++;
      continue;
    }
    let j = i;
    while (j < n && !WORD_END.test(text[j])) j++;
    const word = text.slice(i, j);
    i = j;
    if (RESULT.test(word)) {
      out.push({ t: 'result' });
      continue;
    }
    // Move numbers, alone ("12." / "12...") or glued to the move ("1.e4").
    const move = word.replace(/^\d+\.+/, '');
    if (move && !/^\d+$/.test(move)) out.push({ t: 'move', text: move });
  }
  return out;
}

/** Split a token stream into games: a tag after movetext, or a result, ends a game. */
function splitGames(tokens: Token[]): Token[][] {
  const games: Token[][] = [];
  let cur: Token[] = [];
  let hasMovetext = false;
  let depth = 0;
  const flush = () => {
    if (cur.some((t) => t.t === 'move')) games.push(cur);
    cur = [];
    hasMovetext = false;
    depth = 0;
  };
  for (const tok of tokens) {
    if (tok.t === 'tag' && hasMovetext) flush();
    if (tok.t === 'result') {
      if (depth === 0) {
        flush();
        continue;
      }
      // A result inside a variation: harmless, drop it.
      continue;
    }
    if (tok.t === 'open') depth++;
    if (tok.t === 'close') depth = Math.max(0, depth - 1);
    if (tok.t !== 'tag') hasMovetext = true;
    cur.push(tok);
  }
  flush();
  return games;
}

const CAL_COLORS: Record<string, string> = { G: 'green', R: 'red', Y: 'yellow', B: 'blue' };

/** Pull `[%cal Ge2e4,Rd7d5]` arrows out of a comment and strip every `[%…]` command. */
export function parseComment(raw: string): { text: string | null; arrows: NodeArrow[] } {
  const arrows: NodeArrow[] = [];
  for (const m of raw.matchAll(/\[%cal\s+([^\]]*)\]/g)) {
    for (const part of m[1].split(',')) {
      const a = /^\s*([GRYB])([a-h][1-8])([a-h][1-8])\s*$/.exec(part);
      if (a) arrows.push({ color: CAL_COLORS[a[1]], from: a[2], to: a[3] });
    }
  }
  const text = raw
    .replace(/\[%[^\]]*\]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();
  return { text: text || null, arrows };
}

function appendText(existing: string | null, add: string | null): string | null {
  if (!add) return existing;
  if (!existing) return add;
  if (existing === add || existing.includes(add)) return existing;
  return `${existing}\n\n${add}`;
}

function addArrows(node: ImportNode, arrows: NodeArrow[]) {
  for (const a of arrows) {
    if (!node.arrows.some((b) => b.from === a.from && b.to === a.to && b.color === a.color)) {
      node.arrows.push(a);
    }
  }
}

/** Normalise SAN as written by humans and other programs to what chess.js accepts. */
function cleanSan(word: string): string {
  return word
    .replace(/[!?]+$/, '')
    .replace(/e\.p\.$/i, '')
    .replace(/^0-0-0/, 'O-O-O')
    .replace(/^0-0/, 'O-O')
    .replace(/^o-o-o/, 'O-O-O')
    .replace(/^o-o/, 'O-O');
}

/** Same position for repertoire purposes: placement, side to move, castling, en passant. */
function isStartPosition(fen: string): boolean {
  return fen.trim().split(/\s+/).slice(0, 4).join(' ') === START_FEN.split(' ').slice(0, 4).join(' ');
}

interface Root {
  fen: string;
  children: ImportNode[];
}

interface Frame {
  path: ImportNode[];
  movedInLine: boolean;
  pendingBefore: string | null;
  skipping: boolean;
}

export function buildImportTree(text: string, opts: { maxNodes?: number } = {}): ImportTree {
  const maxNodes = opts.maxNodes ?? Infinity;
  const root: Root = { fen: START_FEN, children: [] };
  const result: ImportTree = {
    children: root.children,
    games: 0,
    importedGames: 0,
    moveCount: 0,
    skipped: [],
    errors: [],
    truncated: false,
  };

  const games = splitGames(tokenize(text));
  result.games = games.length;

  games.forEach((tokens, gi) => {
    if (result.truncated) return;
    const tags = new Map<string, string>();
    for (const tok of tokens) if (tok.t === 'tag') tags.set(tok.name, tok.value);
    const label = `Game ${gi + 1}${tags.get('Event') && tags.get('Event') !== '?' ? ` (${tags.get('Event')})` : ''}`;

    const variant = tags.get('Variant');
    if (variant && !/^(standard|chess)$/i.test(variant)) {
      result.skipped.push(`${label}: ${variant} games can't be added to a repertoire`);
      return;
    }
    const fenTag = tags.get('FEN');
    if (fenTag && !isStartPosition(fenTag)) {
      result.skipped.push(`${label}: starts from a set-up position, not the normal start`);
      return;
    }

    let frame: Frame = { path: [], movedInLine: false, pendingBefore: null, skipping: false };
    const stack: Frame[] = [];
    let addedMove = false;

    const lineText = (path: ImportNode[]) => {
      const sans = path.map((n, k) => (k % 2 === 0 ? `${k / 2 + 1}. ${n.san}` : n.san));
      return sans.length ? sans.join(' ') : 'the start';
    };

    for (const tok of tokens) {
      if (result.truncated) break;
      switch (tok.t) {
        case 'tag':
        case 'result':
          break;
        case 'open': {
          stack.push(frame);
          const canBranch = frame.path.length > 0 && !frame.skipping;
          frame = {
            path: frame.path.slice(0, -1),
            movedInLine: false,
            pendingBefore: null,
            skipping: !canBranch,
          };
          break;
        }
        case 'close':
          frame = stack.pop() ?? frame;
          break;
        case 'comment': {
          if (frame.skipping) break;
          const { text: note, arrows } = parseComment(tok.text);
          const at = frame.path[frame.path.length - 1];
          if (at) addArrows(at, arrows);
          if (frame.movedInLine && at) at.commentAfter = appendText(at.commentAfter, note);
          else frame.pendingBefore = appendText(frame.pendingBefore, note);
          break;
        }
        case 'move': {
          if (frame.skipping) break;
          const parent: Root | ImportNode = frame.path[frame.path.length - 1] ?? root;
          const san = cleanSan(tok.text);
          const game = new Chess(parent.fen);
          let mv;
          try {
            mv = game.move(san);
          } catch {
            mv = null;
          }
          if (!mv) {
            result.errors.push(`${label}: couldn't play "${tok.text}" after ${lineText(frame.path)}; rest of that line skipped`);
            frame.skipping = true;
            break;
          }
          const uci = `${mv.from}${mv.to}${mv.promotion ?? ''}`;
          let child = parent.children.find((c) => c.uci === uci);
          if (!child) {
            if (result.moveCount >= maxNodes) {
              result.truncated = true;
              break;
            }
            child = {
              san: mv.san,
              uci,
              fen: game.fen(),
              commentBefore: null,
              commentAfter: null,
              arrows: [],
              children: [],
            };
            parent.children.push(child);
            result.moveCount++;
          }
          child.commentBefore = appendText(child.commentBefore, frame.pendingBefore);
          frame.pendingBefore = null;
          frame.path = [...frame.path, child];
          frame.movedInLine = true;
          addedMove = true;
          break;
        }
      }
    }
    if (addedMove) result.importedGames++;
  });

  return result;
}

/** Every node, parents before children (breadth-first). */
export function flattenImportTree(
  children: ImportNode[]
): { node: ImportNode; parent: ImportNode | null }[] {
  const out: { node: ImportNode; parent: ImportNode | null }[] = children.map((node) => ({ node, parent: null }));
  for (let i = 0; i < out.length; i++) {
    for (const c of out[i].node.children) out.push({ node: c, parent: out[i].node });
  }
  return out;
}
