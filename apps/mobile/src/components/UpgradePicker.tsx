import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { UPGRADE_CATALOG } from '../engine/upgrades';
import { useGame } from '../store/gameStore';

export default function UpgradePicker({ visible, pieceType, pieceId }: { visible: boolean; pieceType: string; pieceId: string }) {
  const spendUpgrade = useGame(s => s.spendUpgrade);
  const list = (UPGRADE_CATALOG as any)[pieceType] ?? [];
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ backgroundColor: '#111', padding: 16, borderRadius: 12, width: '90%' }}>
          <Text style={{ color: 'white', fontSize: 18, marginBottom: 8 }}>Choose an upgrade</Text>
          {list.map((u: any) => (
            <Pressable key={u.id} onPress={() => spendUpgrade(pieceId, u.id)} style={{ padding: 12, backgroundColor: '#1f2937', borderRadius: 8, marginVertical: 6 }}>
              <Text style={{ color: 'white', fontWeight: '600' }}>{u.name}</Text>
              <Text style={{ color: '#9ca3af' }}>{u.description}</Text>
            </Pressable>
          ))}
          <Text style={{ color: '#9ca3af', marginTop: 8 }}>Cost: 1 point each (placeholder)</Text>
        </View>
      </View>
    </Modal>
  );
}
