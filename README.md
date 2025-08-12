# Chess 2.0

A modular, browser-based prototype with upgrades, royal mechanics, larger board, and an AI opponent.

## Overview
- Board: 10×10 with coordinates overlay.
- Win condition (prototype): capture the opposing King.
- Upgrades: pieces earn +1 Upgrade Point when they capture. Spend immediately or bank.
- Visuals: 3D tiles, glow by level, attack animation, last-move markers, hover affordance.

### Special rules and mechanics
- Royal Circle (King/Queen upgrade): opponents cannot move to squares adjacent to that royal piece.
- Royal Immunity (capture effect): after your King/Queen captures, select a friendly piece to shield from capture for one enemy turn.
- Pawn rules:
  - First-move double-step (path must be clear).
  - Reverse unlocked when a pawn reaches the far rank or captures (move back like a pawn and capture back diagonally).
  - Side-step (optional pawn upgrade).
  - Mimic Captured (pawn upgrade): after future captures, transform into the captured piece type and inherit its abilities.
  - Setup: 2 extra pawns per side, each placed adjacent to a rook on the back rank (outer edge side).
- Rook/Bishop: incremental-only diagonals/orthogonals (+1 per upgrade); Bishop Diagonal Jump (optional); Rook Charge (optional).
- Queen/King: optional Royal Circle, plus mobility upgrades (knight jumps, king 2-step).

## Quick start
1. Open `Chess2.o.html` in a modern browser (Chrome, Edge, Firefox).
2. On the landing screen, pick a mode:
   - Local PvP: both players on one device.
   - Play vs Computer: you play White, AI plays Black. Set difficulty 1–10.
3. Click Start Game.

Controls:
- New Game: reset the board.
- Undo: revert last move.
- Flip Board: toggle perspective.
- Quick Tips: in-app primer.

Interaction:
- Click a piece to see legal moves. White ring = move, pink ring = capture, yellow outline = selected.
- After a capture, choose an upgrade (or Bank to save the point). AI auto-banks.
- When a King/Queen captures, choose a friendly piece to shield for one enemy turn. AI auto-selects its shield.

## AI (Computer opponent)
- Side: AI plays Black.
- Difficulty: 1 (easiest) to 10 (hardest). Internally maps to deeper search and a larger time budget.
- Engine: minimax with alpha–beta pruning, simple capture-first move ordering, and a heuristic evaluation:
  - Material (K,Q,R,B,N,P) + level aura bonus
  - Shield presence bonus
  - Mobility bonus
- Mimic, reverse-pawn, Royal Circle, and shields are respected in simulation.

## Project structure
- `Chess2.o.html` – Main HTML, links CSS and modules, includes landing screen.
- `css/styles.css` – Board, pieces, modal, landing, and effects.
- `js/state.js` – Constants, helpers, initial board, base upgrades.
- `js/moves.js` – Legal move generation (BOARD_SIZE-aware; shields and Royal Circle rules baked in).
- `js/upgrades.js` – Upgrade options and application logic (incl. Pawn Side Step, Mimic Captured, Rook Charge, etc.).
- `js/ui.js` – Rendering, interactions, upgrade modal, shield selection, turn flow, mode/AI wiring.
- `js/engine.js` – AI engine: clone+simulate, evaluation, minimax/alpha–beta search.

## Development
- No build step required; ES modules loaded directly from the filesystem.
- If your browser blocks module imports on file URLs, serve locally (any static server works). Examples:

```bat
:: If you have Python
python -m http.server 5500
```

Then open http://localhost:5500/Chess2.o.html

Tips:
- Hard-refresh (Ctrl+F5) if styles/scripts look stale.
- OneDrive/Windows SmartScreen may prompt you to allow local scripts—allow once if prompted.

## Known limitations and ideas
- AI: solid baseline but not tuned for all upgrade combos; can be extended with transposition tables, iterative deepening, and better evaluation of upgrade potential.
- Side selection: currently AI plays Black; add a toggle if you want AI to play White or mirror sides.
- Persistence: upgrades and history reset on new game; add localStorage if you want resume.
- Tests: none yet; can add unit tests for move-gen and engine.

## License
Prototype for personal use/learning. No warranty.
