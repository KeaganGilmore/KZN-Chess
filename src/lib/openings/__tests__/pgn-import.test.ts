import { describe, it, expect } from 'vitest';
import { buildImportTree, flattenImportTree, parseComment, type ImportNode } from '@/lib/openings/pgn-import';

/** All lines in the tree as SAN strings, e.g. ["e4 e5 Nf3", "e4 c5"]. */
function lines(children: ImportNode[], prefix: string[] = []): string[] {
  const out: string[] = [];
  for (const c of children) {
    const here = [...prefix, c.san];
    if (c.children.length === 0) out.push(here.join(' '));
    else out.push(...lines(c.children, here));
  }
  return out;
}

const find = (children: ImportNode[], ...sans: string[]): ImportNode => {
  let level = children;
  let node: ImportNode | undefined;
  for (const s of sans) {
    node = level.find((c) => c.san === s);
    if (!node) throw new Error(`no ${s}`);
    level = node.children;
  }
  return node!;
};

describe('buildImportTree', () => {
  it('imports a bare move list', () => {
    const t = buildImportTree('1. e4 e5 2. Nf3 Nc6 3. Bb5');
    expect(lines(t.children)).toEqual(['e4 e5 Nf3 Nc6 Bb5']);
    expect(t.games).toBe(1);
    expect(t.moveCount).toBe(5);
    expect(t.errors).toEqual([]);
  });

  it('keeps variations, including nested ones', () => {
    const t = buildImportTree('1. e4 e5 (1... c5 2. Nf3 (2. c3 d5) 2... d6) 2. Nf3 Nc6 *');
    expect(lines(t.children).sort()).toEqual(['e4 c5 Nf3 d6', 'e4 c5 c3 d5', 'e4 e5 Nf3 Nc6'].sort());
  });

  it('reads several games and merges shared moves', () => {
    const pgn = `[Event "Ch 1"]
[Site "?"]

1. e4 e5 2. Nf3 *

[Event "Ch 2"]

1. e4 c5 2. Nf3 d6 *

[Event "Ch 3"]
1. d4 d5 1-0`;
    const t = buildImportTree(pgn);
    expect(t.games).toBe(3);
    expect(t.importedGames).toBe(3);
    expect(lines(t.children).sort()).toEqual(['d4 d5', 'e4 c5 Nf3 d6', 'e4 e5 Nf3']);
    expect(t.children.filter((c) => c.san === 'e4')).toHaveLength(1);
    // e4, e5, Nf3, c5, Nf3 (after c5), d6, d4, d5
    expect(t.moveCount).toBe(8);
  });

  it('handles CRLF, glued move numbers, black move numbers and annotation marks', () => {
    const t = buildImportTree('[Event "x"]\r\n\r\n1.e4 1...c5!? 2.Nf3 $1 d6?! 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be2 e5 7.Nb3 Be7 8.0-0 0-0 *\r\n');
    expect(lines(t.children)).toEqual(['e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6 Be2 e5 Nb3 Be7 O-O O-O']);
    expect(t.errors).toEqual([]);
  });

  it('stores comments as notes and Lichess arrows on the move', () => {
    const t = buildImportTree('{Open game} 1. e4 { Best by test [%cal Ge7e5,Rc7c5] [%clk 0:05:00] } e5 ( { Sicilian } 1... c5 { Sharp } ) *');
    const e4 = find(t.children, 'e4');
    expect(e4.commentBefore).toBe('Open game');
    expect(e4.commentAfter).toBe('Best by test');
    expect(e4.arrows).toEqual([
      { color: 'green', from: 'e7', to: 'e5' },
      { color: 'red', from: 'c7', to: 'c5' },
    ]);
    const c5 = find(t.children, 'e4', 'c5');
    expect(c5.commentBefore).toBe('Sicilian');
    expect(c5.commentAfter).toBe('Sharp');
  });

  it('skips the rest of a line after an illegal move but keeps the other lines', () => {
    const t = buildImportTree('1. e4 e5 (1... Nf6 2. Qxe7 Nxe4) 2. Nf3 Nc6 3. Bb5 Qxh9 4. O-O *');
    expect(lines(t.children).sort()).toEqual(['e4 Nf6', 'e4 e5 Nf3 Nc6 Bb5']);
    expect(t.errors).toHaveLength(2);
    expect(t.errors[0]).toContain('Qxe7');
  });

  it('skips games from a set-up position or another variant', () => {
    const pgn = `[Event "Endgame"]
[SetUp "1"]
[FEN "8/8/8/4k3/8/8/4K3/4R3 w - - 0 1"]

1. Re2 *

[Event "960"]
[Variant "Chess960"]

1. e4 *

[Event "Normal"]
[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]

1. c4 *`;
    const t = buildImportTree(pgn);
    expect(t.games).toBe(3);
    expect(t.importedGames).toBe(1);
    expect(lines(t.children)).toEqual(['c4']);
    expect(t.skipped).toHaveLength(2);
  });

  it('ignores text that has no moves', () => {
    const t = buildImportTree('[Event "x"]\n\n*');
    expect(t.games).toBe(0);
    expect(t.moveCount).toBe(0);
  });

  it('stops at maxNodes and says so', () => {
    const t = buildImportTree('1. e4 e5 2. Nf3 Nc6 3. Bb5 a6', { maxNodes: 3 });
    expect(t.moveCount).toBe(3);
    expect(t.truncated).toBe(true);
  });
});

describe('flattenImportTree', () => {
  it('lists parents before children', () => {
    const t = buildImportTree('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    const flat = flattenImportTree(t.children);
    expect(flat).toHaveLength(5);
    flat.forEach((item, i) => {
      if (item.parent) expect(flat.findIndex((f) => f.node === item.parent)).toBeLessThan(i);
    });
  });
});

describe('parseComment', () => {
  it('strips engine/clock commands and keeps the words', () => {
    expect(parseComment(' [%eval 0.3] [%clk 0:01:00] Good  move ')).toEqual({ text: 'Good move', arrows: [] });
    expect(parseComment('[%csl Gd4]')).toEqual({ text: null, arrows: [] });
  });
});
