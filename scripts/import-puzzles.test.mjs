import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePuzzleRow } from './import-puzzles.mjs';

// Real sample rows from the Lichess puzzle database (CSV format).
const ROW_NO_OPENING =
  '00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1859,74,94,5037,crushing hangingPiece long middlegame,https://lichess.org/787zsVup/black#48,';
const ROW_WITH_OPENING =
  '00sHx,q3k1nr/1pp1nQpp/3p4/1P2p3/4P3/B1PP1b2/B5PP/5K2 b k - 0 17,e8d7 a2e6 d7d8 f7f8,1760,80,83,72,mate mateIn2 middlegame short,https://lichess.org/yyznGmXs/black#34,Italian_Game Italian_Game_Classical_Variation';

test('parses a row with no opening tags', () => {
  const r = parsePuzzleRow(ROW_NO_OPENING);
  assert.equal(r.id, '00008');
  assert.equal(r.fen, 'r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24');
  assert.equal(r.moves.split(' ').length, 6);
  assert.equal(r.rating, 1859);
  assert.equal(r.rating_deviation, 74);
  assert.equal(r.popularity, 94);
  assert.equal(r.nb_plays, 5037);
  assert.deepEqual(r.themes, ['crushing', 'hangingPiece', 'long', 'middlegame']);
  assert.deepEqual(r.opening_tags, []);
  assert.equal(r.game_url, 'https://lichess.org/787zsVup/black#48');
});

test('parses opening tags into an array', () => {
  const r = parsePuzzleRow(ROW_WITH_OPENING);
  assert.equal(r.id, '00sHx');
  assert.deepEqual(r.themes, ['mate', 'mateIn2', 'middlegame', 'short']);
  assert.deepEqual(r.opening_tags, ['Italian_Game', 'Italian_Game_Classical_Variation']);
});

test('skips the header row and malformed lines', () => {
  assert.equal(
    parsePuzzleRow('PuzzleId,FEN,Moves,Rating,RatingDeviation,Popularity,NbPlays,Themes,GameUrl,OpeningTags'),
    null
  );
  assert.equal(parsePuzzleRow(''), null);
  assert.equal(parsePuzzleRow('too,few,columns'), null);
  assert.equal(parsePuzzleRow('id,fen,moves,NOT_A_NUMBER,1,1,1,theme,url,'), null);
});
