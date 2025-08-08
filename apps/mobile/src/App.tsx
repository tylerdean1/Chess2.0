import React, { useEffect } from 'react';
import { SafeAreaView, View, Text, Pressable, StatusBar } from 'react-native';
import { useGame } from './store/gameStore';
import ChessBoard from './components/ChessBoard';
import UpgradePicker from './components/UpgradePicker';

export default function App() {
  const { newGame, board, openUpgradeFor } = useGame();
  useEffect(() => { newGame(); }, [newGame]);

  const piece = board.find(p => p.id === openUpgradeFor);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1020' }}>
      <StatusBar barStyle="light-content" />
      <View style={{ flex: 1, alignItems: 'center', paddingTop: 16 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: '600', marginBottom: 8 }}>Chess 2.0 (Prototype)</Text>

        <ChessBoard />

        <Pressable onPress={() => newGame()} style={{ marginTop: 16, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#2563eb', borderRadius: 10 }}>
          <Text style={{ color: 'white', fontWeight: '700' }}>New Game</Text>
        </Pressable>

        {piece && (
          <UpgradePicker visible={true} pieceType={piece.type} pieceId={piece.id} />
        )}
      </View>
    </SafeAreaView>
  );
}
