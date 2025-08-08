import React from 'react';
import { View, Text } from 'react-native';

export default function Piece({ type, color }: { type: string; color: 'white' | 'black' }) {
  const symbolMap: Record<string, string> = {
    pawn: '♙', knight: '♘', bishop: '♗', rook: '♖', queen: '♕', king: '♔'
  };
  const symbol = symbolMap[type] ?? '?';
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 28, color: color === 'white' ? '#f9fafb' : '#111827' }}>{symbol}</Text>
    </View>
  );
}
