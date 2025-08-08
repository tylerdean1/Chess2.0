import { GameState, Piece } from './types';

export function initialPosition(): GameState {
  const board: Piece[] = [];
  const add = (type: Piece['type'], color: Piece['color'], file: number, rank: number) => {
    board.push({ id: `${type}-${color}-${file}-${rank}-${Math.random().toString(36).slice(2)}`, type, color, file, rank, upgrades: [], upgradePoints: 0 });
  };

  // Pawns
  for (let f = 0; f < 8; f++) { add('pawn', 'white', f, 1); add('pawn', 'black', f, 6); }
  // Rooks
  add('rook', 'white', 0, 0); add('rook', 'white', 7, 0);
  add('rook', 'black', 0, 7); add('rook', 'black', 7, 7);
  // Knights
  add('knight', 'white', 1, 0); add('knight', 'white', 6, 0);
  add('knight', 'black', 1, 7); add('knight', 'black', 6, 7);
  // Bishops
  add('bishop', 'white', 2, 0); add('bishop', 'white', 5, 0);
  add('bishop', 'black', 2, 7); add('bishop', 'black', 5, 7);
  // Queens
  add('queen', 'white', 3, 0); add('queen', 'black', 3, 7);
  // Kings
  add('king', 'white', 4, 0); add('king', 'black', 4, 7);

  return { board, turn: 'white', history: [], legalMoves: {} };
}

export function isOccupied(state: GameState, f: number, r: number) {
  return state.board.find(p => p.file === f && p.rank === r);
}

export function generateLegalMoves(state: GameState) {
  const moves: GameState['legalMoves'] = {};
  const dir = { white: 1, black: -1 } as const;

  for (const p of state.board) {
    if (p.color !== state.turn) continue;
    const list: { file: number; rank: number }[] = [];

    if (p.type === 'pawn') {
      const step = dir[p.color];
      if (!isOccupied(state, p.file, p.rank + step)) list.push({ file: p.file, rank: p.rank + step });
      for (const df of [-1, 1]) {
        const t = isOccupied(state, p.file + df, p.rank + step);
        if (t && t.color !== p.color) list.push({ file: p.file + df, rank: p.rank + step });
      }
    }
    // TODO: knights/bishops/rooks/queen/king standard moves
    moves[p.id] = list.filter(m => m.file >= 0 && m.file < 8 && m.rank >= 0 && m.rank < 8);
  }
  return moves;
}

export function applyMove(state: GameState, pieceId: string, toFile: number, toRank: number): GameState {
  const next: GameState = { ...state, board: state.board.map(p => ({ ...p })), history: [...state.history] };
  const moving = next.board.find(p => p.id === pieceId);
  if (!moving) return state;

  // capture
  const targetIdx = next.board.findIndex(p => p.file === toFile && p.rank === toRank);
  const captured = targetIdx >= 0 ? next.board[targetIdx] : undefined;
  if (captured) {
    next.board.splice(targetIdx, 1);
    moving.upgradePoints += 1; // award point on capture
  }

  moving.file = toFile;
  moving.rank = toRank;
  next.turn = next.turn === 'white' ? 'black' : 'white';
  return next;
}
