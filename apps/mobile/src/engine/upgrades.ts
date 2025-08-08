export const UPGRADE_CATALOG = {
  pawn: [
    { id: 'pawn_diag2', name: 'Diagonal +2', description: 'Attack diagonally up to 2', effects: { pawnDiagRange: 2 }, cost: 1 },
    { id: 'pawn_forward2', name: 'Forward +2', description: 'Move forward up to 2', effects: { pawnForwardRange: 2 }, cost: 1 }
  ],
  knight: [
    { id: 'knight_2_2', name: '(2,2) jump', description: 'Add a (2,2) diagonal jump', effects: { knightDiag22: true }, cost: 1 }
  ],
  bishop: [
    { id: 'bishop_orth1', name: 'Orthogonal +1', description: 'Add 1-square orthogonal', effects: { bishopOrth1: true }, cost: 1 }
  ],
  rook: [
    { id: 'rook_diag1', name: 'Diagonal +1', description: 'Add 1-square diagonal', effects: { rookDiag1: true }, cost: 1 }
  ],
  queen: [
    { id: 'queen_knight1', name: 'Knight +1', description: 'Add 1-square knight jump', effects: { queenKnight1: true }, cost: 1 }
  ],
  king: [
    { id: 'king_step2', name: 'Step 2', description: 'Move 2 any direction once/turn', effects: { kingTwoStep: true }, cost: 1 }
  ]
} as const;

export type Catalog = typeof UPGRADE_CATALOG;
