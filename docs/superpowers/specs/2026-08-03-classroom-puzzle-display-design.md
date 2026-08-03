# Classroom puzzle display — design

**Date:** 2026-08-03
**Status:** Implemented (designed autonomously in a non-interactive session; decisions below are the chosen defaults)

## Goal

Tutors teach classes with puzzles projected on a classroom screen. Two requirements:

1. Show **many puzzles on one screen at once** for teachers.
2. Every board is oriented with the **side to move at the bottom**, with an
   **unmistakable side-to-move indicator** readable from the back of a classroom.

## Context / problems found

- `PuzzleBoard` already orients to the side to move of the FEN it receives, but
  three surfaces (`set-puzzle-list`, `puzzle-browser`, puzzles hub featured board)
  pass the **raw puzzle FEN** — the position *before* the Lichess setup move. They
  therefore show the wrong position (not the one students solve) and the wrong
  orientation (opponent at the bottom).
- The print view computes the correct diagram but duplicates the logic locally,
  includes solutions inline (spoils projection), and is paper-styled.
- No projection-friendly view exists.

## Design

### 1. Shared diagram lib — `src/lib/puzzles/diagram.ts`

- `puzzleDiagram(fen, moves)` → `{ fen, turn }`: applies the puzzle's setup move
  (first UCI move) so the result is the position the student actually solves.
- `puzzleSolutionSan(fen, moves)` → `string[]`: human-readable SAN solution,
  excluding the setup move.
- Print page's local helpers move here; all surfaces share it.

### 2. `TurnBanner` — `src/components/puzzles/turn-banner.tsx`

High-contrast "WHITE TO MOVE" / "BLACK TO MOVE" banner: white banner with black
text vs black banner with white text, plus a filled disc glyph, so it reads at a
glance even for non-readers. Sizes: `sm` (cards/print) and `lg` (projection).
Server-safe (no hooks).

### 3. Classroom display — `/learn/tutor/sets/[id]/display`

- Server page: tutor-gated (same as print), fetches the set + puzzles
  (including `moves`), renders the client `ClassroomDisplay`.
- Client component renders a **fixed fullscreen overlay** (covers site chrome —
  avoids the invalid nested `<html>` trick the print layout uses) with:
  - **Toolbar:** exit link, set name, boards-per-page selector (1 / 2 / 4 / 6),
    page prev/next with page indicator, Reveal-all/Hide-all solutions toggle,
    browser-fullscreen toggle.
  - **Grid of tiles**, paginated. Tile = puzzle number + rating, `TurnBanner lg`,
    board (diagram FEN via `PuzzleBoard`, side to move at bottom), and a
    per-tile "Show solution" reveal (hidden by default so projecting doesn't
    spoil the answer; teacher reveals after discussion).
  - Board size is computed from the measured grid height and the row count so a
    full page always fits the projector without scrolling.
  - Keyboard: ← / → change page, F toggles fullscreen.
- Set page gets a **Classroom** button next to Print / export.

### 4. Consistency fixes (side to move at the bottom everywhere)

- `set-puzzle-list` and `puzzle-browser`: render the diagram position with a
  `TurnBanner sm` (set page query and browser interface gain `moves`).
- Print page: use the shared lib and `TurnBanner sm` instead of small grey text.
- Puzzles hub featured board: diagram position + banner.

## Alternatives considered

- **Extend the print page with a "display" query param** — rejected: print is
  paper/light-themed, always shows solutions, and serves a different job.
- **Auto-cycling slideshow** — rejected (YAGNI): teachers page manually while
  discussing; arrow keys cover it.
- **Per-tile board flip control** — rejected: the requirement is that
  side-to-move is *always* at the bottom; a manual flip invites inconsistency.

## Testing

`npx next build` must pass; multi-dimension code review of the diff afterwards.
