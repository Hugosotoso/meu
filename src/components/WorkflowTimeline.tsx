import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuditoriaEvento, formatarDataHora, estiloStatus } from '../lib/workflow';

type Props = {
  eventos: AuditoriaEvento[];
  vazio?: string;
};

function descricao(evento: AuditoriaEvento) {
  if (evento.acao === 'CRIACAO') return 'Registro criado e protocolado';
  if (evento.acao === 'ALTERACAO_STATUS') {
    const novo = estiloStatus(evento.status_novo).label;
    return `Status alterado para ${novo}`;
  }
  return 'Dados do registro atualizados';
}

export default function WorkflowTimeline({ eventos, vazio = 'O histórico começará após a primeira movimentação.' }: Props) {
  if (!eventos.length) {
    return (
      <View style={styles.vazio}>
        <MaterialIcons name="history" size={24} color="#9EA3B0" />
        <Text style={styles.vazioTexto}>{vazio}</Text>
      </View>
    );
  }

  return (
    <View>
      {eventos.map((evento, index) => (
        <View key={String(evento.id)} style={styles.item}>
          <View style={styles.trilho}>
            <View style={[styles.ponto, index === 0 && styles.pontoAtual]} />
            {index < eventos.length - 1 ? <View style={styles.linha} /> : null}
          </View>
          <View style={styles.conteudo}>
            <Text style={styles.titulo}>{descricao(evento)}</Text>
            <Text style={styles.meta}>
              {evento.usuario_nome || 'Sistema Portal N2'}
              {evento.usuario_matricula ? ` • Matrícula ${evento.usuario_matricula}` : ''}
            </Text>
            <Text style={styles.data}>{formatarDataHora(evento.created_at)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  vazio: { alignItems: 'center', padding: 20, borderWidth: 1, borderStyle: 'dashed', borderColor: '#D9DDE8', borderRadius: 12 },
  vazioTexto: { color: '#6B7280', textAlign: 'center', marginTop: 8, fontSize: 12 },
  item: { flexDirection: 'row', minHeight: 74 },
  trilho: { width: 24, alignItems: 'center' },
  ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#9EA3B0', marginTop: 5, zIndex: 2 },
  pontoAtual: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1351B4' },
  linha: { position: 'absolute', top: 15, bottom: -4, width: 2, backgroundColor: '#D9DDE8' },
  conteudo: { flex: 1, paddingLeft: 8, paddingBottom: 18 },
  titulo: { color: '#1F2937', fontWeight: '700', fontSize: 13 },
  meta: { color: '#64748B', fontSize: 11, marginTop: 3 },
  data: { color: '#9EA3B0', fontSize: 11, marginTop: 3 },
});
