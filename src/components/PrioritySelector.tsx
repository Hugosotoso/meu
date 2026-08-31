import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CORES_PRIORIDADE, PRIORIDADES, Prioridade } from '../lib/workflow';

type Props = {
  value: Prioridade;
  onChange: (value: Prioridade) => void;
  compact?: boolean;
};

export default function PrioritySelector({ value, onChange, compact = false }: Props) {
  return (
    <View style={styles.container}>
      {PRIORIDADES.map((prioridade) => {
        const config = CORES_PRIORIDADE[prioridade];
        const ativo = value === prioridade;
        return (
          <TouchableOpacity
            key={prioridade}
            accessibilityRole="button"
            accessibilityState={{ selected: ativo }}
            onPress={() => onChange(prioridade)}
            style={[
              styles.item,
              compact && styles.itemCompacto,
              { borderColor: ativo ? config.texto : '#D9DDE8', backgroundColor: ativo ? config.fundo : '#FFFFFF' },
            ]}
          >
            <Text style={[styles.texto, { color: ativo ? config.texto : '#555A60' }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { flexGrow: 1, minWidth: 70, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  itemCompacto: { flexGrow: 0, paddingVertical: 7, paddingHorizontal: 10 },
  texto: { fontSize: 12, fontWeight: '700' },
});

