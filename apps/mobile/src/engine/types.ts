export type Color = 'white' | 'black';

export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  // engine-facing flags (range bumps, new jumps, etc.)
  effects: Record<string, number | boolean | string>;
  cost: number;
}

export interface Piece {
  id: string;
  type: PieceType;
  color: Color;
  file: number;  // 0..7
  rank: number;  // 0..7
  upgrades: string[]; // upgrade ids applied in order
  upgradePoints: number;
}

export interface GameState {
  board: Piece[];
  turn: Color;
  selected?: string; // piece id
  legalMoves: { [pieceId: string]: { file: number; rank: number }[] };
  history: string[]; // simple SAN-ish for now
}
