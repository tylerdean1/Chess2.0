import React from 'react';
import { View, Pressable } from 'react-native';
import Piece from './Piece';
import { useGame } from '../store/gameStore';

const S = 44; // square size

export default function ChessBoard() {
  const { board, selected, legalMoves, selectPiece, moveSelected, openUpgradeFor } = useGame();

  const bySquare = new Map<string, any>();
  for (const p of board) bySquare.set(`${p.file}-${p.rank}`, p);

  function renderSquare(f: number, r: number) {
    const key = `${f}-${r}`;
    const p = bySquare.get(key);
    const isDark = (f + r) % 2 === 1;
    const isLegal = selected && (legalMoves[selected]?.some(m => m.file === f && m.rank === r));
    const bg = isLegal ? '#22c55e' : (isDark ? '#8b5cf6' : '#e5e7eb'); // temp colors

    return (
      <Pressable
        key={key}
        onPress={() => {
          if (p && (!selected || p.id !== selected)) selectPiece(p.id);
          else if (selected) moveSelected(f, r);
        }}
        style={{ width: S, height: S, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: '#0002' }}
      >
        {p ? <Piece type={p.type} color={p.color} /> : null}
      </Pressable>
    );
  }

  const selectedPiece = board.find(p => p.id === selected) ?? (openUpgradeFor ? board.find(p => p.id === openUpgradeFor) : undefined);

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: S * 8, height: S * 8, flexDirection: 'column-reverse' }}>
        {Array.from({ length: 8 }).map((_, r) => (
          <View key={r} style={{ flexDirection: 'row' }}>
            {Array.from({ length: 8 }).map((__, f) => renderSquare(f, r))}
          </View>
        ))}
      </View>
    </View>
  );
}
