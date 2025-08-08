import { create } from 'zustand';
import { GameState } from '../engine/types';
import { initialPosition, generateLegalMoves, applyMove } from '../engine/baseChess';

type GameActions = {
  newGame: () => void;
  selectPiece: (id: string | undefined) => void;
  moveSelected: (file: number, rank: number) => void;
  openUpgradeFor?: string;
  spendUpgrade: (pieceId: string, upgradeId: string) => void;
};

export const useGame = create<GameState & GameActions>((set, get) => ({
  ...initialPosition(),
  legalMoves: {},
  newGame: () => set(() => {
    const s = initialPosition();
    return { ...s, legalMoves: generateLegalMoves(s) };
  }),
  selectPiece: (id) => set((state) => {
    if (!id) return { selected: undefined };
    if (!state.legalMoves[id]) return { selected: undefined };
    return { selected: id };
  }),
  moveSelected: (file, rank) => set((state) => {
    const { selected } = state;
    if (!selected) return {};
    const legal = state.legalMoves[selected] ?? [];
    if (!legal.some(m => m.file === file && m.rank === rank)) return {};
    const next = applyMove(state, selected, file, rank);
    next.legalMoves = generateLegalMoves(next);
    const openUpgradeFor = state.board.find(p => p.id === selected)?.upgradePoints ? selected : undefined;
    return { ...next, selected: undefined, ...(openUpgradeFor ? { openUpgradeFor } : {}) };
  }),
  spendUpgrade: (pieceId, upgradeId) => set((state) => {
    const piece = state.board.find(p => p.id === pieceId);
    if (!piece || piece.upgradePoints <= 0) return {};
    piece.upgradePoints -= 1;
    piece.upgrades.push(upgradeId);
    state.legalMoves = generateLegalMoves(state);
    return { ...state, openUpgradeFor: undefined };
  })
}));
