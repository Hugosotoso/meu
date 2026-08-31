/**
 * Super App Gov — Logística / Patrimônio e Bens Cautelados (COM FOOTER BLINDADO)
 * Ficheiro: src/app/logistica/patrimonio.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import PrioritySelector from '../../components/PrioritySelector';
import { CORES_PRIORIDADE, prioridadeSegura, Prioridade } from '../../lib/workflow';

const C = { 
  azulGov: '#1351B4', azulEscuro: '#0B2D66', fundo: '#F4F6F9', branco: '#FFFFFF',
  textoDestaque: '#111827', textoSecundario: '#6B7280', 
  borda: '#E5E7EB', verde: '#10B981', vermelho: '#EF4444', ouro: '#F59E0B', 
  roxo: '#8B5CF6'
};

// 💻 MOCK DE BENS CAUTELADOS
const MEUS_BENS = [
  { id: '1', tombamento: 'BR-908122', nome: 'Notebook Dell Latitude 5420', tipo: 'laptop-mac' },
  { id: '2', tombamento: 'BR-445019', nome: 'Monitor Dell 24" P2419H', tipo: 'monitor' },
  { id: '3', tombamento: 'BR-112998', nome: 'Cadeira Ergonômica Cavaletti', tipo: 'chair-alt' },
];

export default function PatrimonioScreen() {
  const router = useRouter();
  const { nome, matricula, uorg } = useLocalSearchParams();

  // Estados do Formulário
  const [tombamento, setTombamento] = useState('');
  const [tipoChamado, setTipoChamado] = useState('Defeito/Manutenção');
  const [descricao, setDescricao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [prioridade, setPrioridade] = useState<Prioridade>('NORMAL');

  // Histórico
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  useEffect(() => {
    buscarHistorico();
  }, []);

  const buscarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const { data, error } = await supabase
        .from('chamados_patrimonio')
        .select('*')
        .eq('matricula', String(matricula))
        .order('id', { ascending: false });

      if (error) throw error;
      if (data) setHistorico(data);
    } catch (error) {
      console.log("Erro ao buscar histórico:", error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  const handleAbrirChamado = async () => {
    if (!tombamento || !descricao) {
      Alert.alert('Atenção', 'Preenche o número do tombamento e a descrição.');
      return;
    }

    setCarregando(true);

    try {
      const { data, error } = await supabase.from('chamados_patrimonio').insert([
        {
          matricula: matricula || 'N/D',
          nome_servidor: nome || 'Servidor',
          uorg: uorg || 'N/D',
          tombamento: tombamento,
          tipo_chamado: tipoChamado,
          descricao: descricao,
          status: 'Aguardando Análise',
          prioridade,
          atualizado_por_matricula: matricula || 'N/D',
          atualizado_por_nome: nome || 'Servidor'
        }
      ]).select('protocolo').single();

      if (error) throw error;

      Alert.alert('Chamado protocolado', `Protocolo ${data.protocolo}. O setor de Patrimônio já pode acompanhar a demanda.`);
      setTombamento(''); setDescricao('');
      setPrioridade('NORMAL');
      buscarHistorico();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gravar o chamado.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Patrimônio</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
        {/* 📦 MEUS BENS CAUTELADOS */}
        <View style={styles.secaoHeader}>
          <Text style={styles.secaoTitulo}>A Minha Carga Patrimonial</Text>
          <View style={styles.badgeTotal}>
            <Text style={styles.badgeTotalTxt}>{MEUS_BENS.length} Bens</Text>
          </View>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollHorizontal} contentContainerStyle={{ paddingRight: 20 }}>
          {MEUS_BENS.map((bem) => (
            <TouchableOpacity 
              key={bem.id} 
              style={styles.cardBem} 
              activeOpacity={0.8}
              onPress={() => setTombamento(bem.tombamento)}
            >
              <View style={styles.cardBemIcone}>
                <MaterialIcons name={bem.tipo as any} size={28} color={C.azulGov} />
              </View>
              <Text style={styles.cardBemNome} numberOfLines={2}>{bem.nome}</Text>
              <View style={styles.tagTombamento}>
                <MaterialCommunityIcons name="barcode-scan" size={12} color={C.textoSecundario} />
                <Text style={styles.tagTombamentoTxt}>{bem.tombamento}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* 📝 FORMULÁRIO DE CHAMADO */}
        <Text style={[styles.secaoTitulo, { marginTop: 20, marginBottom: 15 }]}>Abertura de Chamado</Text>
        <View style={styles.formCard}>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nº do Tombamento</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="barcode" size={20} color={C.azulGov} style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Ex: BR-123456" placeholderTextColor="#A0A0A0" value={tombamento} onChangeText={setTombamento} />
            </View>
          </View>

          <Text style={styles.label}>Tipo de Solicitação</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity 
              style={[styles.radioBtn, tipoChamado === 'Defeito/Manutenção' && styles.radioBtnAtivo]}
              onPress={() => setTipoChamado('Defeito/Manutenção')}
            >
              <MaterialIcons name="build" size={16} color={tipoChamado === 'Defeito/Manutenção' ? C.branco : C.textoSecundario} />
              <Text style={[styles.radioTxt, tipoChamado === 'Defeito/Manutenção' && styles.radioTxtAtivo]}>Manutenção</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.radioBtn, tipoChamado === 'Transferência' && styles.radioBtnAtivo]}
              onPress={() => setTipoChamado('Transferência')}
            >
              <MaterialIcons name="swap-horiz" size={18} color={tipoChamado === 'Transferência' ? C.branco : C.textoSecundario} />
              <Text style={[styles.radioTxt, tipoChamado === 'Transferência' && styles.radioTxtAtivo]}>Transferência</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descrição do Problema / Motivo</Text>
            <View style={[styles.inputContainer, { height: 80, alignItems: 'flex-start', paddingTop: 10 }]}>
              <MaterialIcons name="notes" size={20} color={C.azulGov} style={styles.inputIcon} />
              <TextInput 
                style={[styles.input, { height: 60, textAlignVertical: 'top' }]} 
                placeholder="Descreve o que aconteceu..." 
                placeholderTextColor="#A0A0A0" 
                value={descricao} 
                onChangeText={setDescricao} 
                multiline
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prioridade administrativa</Text>
            <PrioritySelector value={prioridade} onChange={setPrioridade} compact />
          </View>

          <TouchableOpacity style={styles.btnPrincipal} onPress={handleAbrirChamado} disabled={carregando}>
            {carregando ? (
              <ActivityIndicator size="small" color={C.branco} />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color={C.branco} />
                <Text style={styles.textoBtnPrincipal}>Enviar Chamado</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* 📋 HISTÓRICO DE CHAMADOS */}
        <Text style={[styles.secaoTitulo, { marginBottom: 15 }]}>Meus Chamados</Text>
        {carregandoHistorico ? (
          <ActivityIndicator size="large" color={C.azulGov} style={{ marginVertical: 20 }} />
        ) : historico.length === 0 ? (
          <View style={styles.vazioState}>
            <MaterialIcons name="assignment-turned-in" size={40} color={C.borda} />
            <Text style={styles.vazioTexto}>Nenhum chamado registado.</Text>
          </View>
        ) : (
          historico.map((chamado) => (
            <View key={chamado.id} style={styles.historicoCard}>
              <View style={styles.historicoCabecalho}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historicoProtocolo}>{chamado.protocolo || `PAT-${chamado.id}`}</Text>
                  <Text style={styles.historicoId}>{chamado.tombamento}</Text>
                </View>
                <View style={[styles.statusTag, { backgroundColor: C.ouro + '15' }]}>
                  <Text style={[styles.statusTexto, { color: C.ouro }]}>{chamado.status}</Text>
                </View>
              </View>
              <View style={styles.historicoRow}>
                <MaterialIcons name={chamado.tipo_chamado === 'Transferência' ? 'swap-horiz' : 'build'} size={14} color={C.textoSecundario} />
                <Text style={styles.historicoItemTxt}>{chamado.tipo_chamado}</Text>
              </View>
              <Text style={styles.historicoDesc} numberOfLines={2}>"{chamado.descricao}"</Text>
              <View style={[styles.priorityBadge, { backgroundColor: CORES_PRIORIDADE[prioridadeSegura(chamado.prioridade)].fundo }]}>
                <Text style={[styles.priorityBadgeText, { color: CORES_PRIORIDADE[prioridadeSegura(chamado.prioridade)].texto }]}>
                  Prioridade {CORES_PRIORIDADE[prioridadeSegura(chamado.prioridade)].label}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 🎧 O NOVO FOOTER DE SUPORTE */}
      <View style={styles.footerFlutuante}>
        <View style={styles.footerResumo}>
          <Text style={styles.footerItensText}>Suporte Técnico Gov</Text>
          <Text style={styles.footerSubText}>Atendimento 24h • Ramal 8080</Text>
        </View>
        <TouchableOpacity style={styles.btnContato} onPress={() => Alert.alert('Chamada', 'Iniciando ligação para o Setor de Suporte Patrimonial...')}>
          <MaterialIcons name="headset-mic" size={20} color={C.branco} />
          <Text style={styles.btnContatoTexto}>Ligar</Text>
        </TouchableOpacity>
      </View>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fundo },
  header: { backgroundColor: C.azulGov, paddingTop: 10, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 4 },
  btnVoltar: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.branco },
  
  scrollContent: { padding: 20, paddingBottom: 100 }, // Espaço para o footer não cobrir o final da página
  
  secaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  secaoTitulo: { fontSize: 18, fontWeight: '800', color: C.textoDestaque },
  badgeTotal: { backgroundColor: C.azulGov + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeTotalTxt: { color: C.azulGov, fontWeight: 'bold', fontSize: 12 },
  
  scrollHorizontal: { marginHorizontal: -20, paddingHorizontal: 20, marginBottom: 8 },
  cardBem: { backgroundColor: C.branco, width: 140, padding: 16, borderRadius: 16, marginRight: 12, borderWidth: 1, borderColor: C.borda, elevation: 1 },
  cardBemIcone: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  cardBemNome: { fontSize: 13, fontWeight: '700', color: C.textoDestaque, marginBottom: 8, height: 36 },
  tagTombamento: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.fundo, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  tagTombamentoTxt: { fontSize: 11, color: C.textoSecundario, fontWeight: 'bold', marginLeft: 4 },

  formCard: { backgroundColor: C.branco, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: C.borda, marginBottom: 25, elevation: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: C.textoDestaque, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.borda, borderRadius: 10, backgroundColor: C.fundo },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, height: 48, fontSize: 15, color: C.textoDestaque, fontWeight: '500' },
  
  radioGroup: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  radioBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.borda, backgroundColor: C.fundo, gap: 6 },
  radioBtnAtivo: { backgroundColor: C.azulGov, borderColor: C.azulGov },
  radioTxt: { fontSize: 13, fontWeight: '600', color: C.textoSecundario },
  radioTxtAtivo: { color: C.branco },

  btnPrincipal: { flexDirection: 'row', backgroundColor: C.azulGov, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10, elevation: 3 },
  textoBtnPrincipal: { color: C.branco, fontSize: 16, fontWeight: 'bold' },

  historicoCard: { backgroundColor: C.branco, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.borda },
  historicoCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  historicoProtocolo: { fontSize: 10, fontWeight: '900', color: C.azulGov, letterSpacing: 0.5, marginBottom: 3 },
  historicoId: { fontSize: 15, fontWeight: '800', color: C.textoDestaque },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusTexto: { fontSize: 11, fontWeight: 'bold' },
  historicoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  historicoItemTxt: { fontSize: 13, color: C.textoSecundario, fontWeight: '600' },
  historicoDesc: { fontSize: 13, color: C.textoSecundario, fontStyle: 'italic', backgroundColor: C.fundo, padding: 8, borderRadius: 8 },
  priorityBadge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, marginTop: 10 },
  priorityBadgeText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  
  vazioState: { alignItems: 'center', padding: 30, backgroundColor: C.branco, borderRadius: 16, borderWidth: 1, borderColor: C.borda, borderStyle: 'dashed' },
  vazioTexto: { marginTop: 10, color: C.textoSecundario, fontSize: 14, fontWeight: '500' },

  /* ESTILOS DO NOVO FOOTER */
  footerFlutuante: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.branco, borderTopWidth: 1, borderTopColor: C.borda, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  footerResumo: { flex: 1 },
  footerItensText: { fontSize: 15, fontWeight: '800', color: C.textoDestaque },
  footerSubText: { fontSize: 12, color: C.textoSecundario, fontWeight: '600', marginTop: 2 },
  btnContato: { flexDirection: 'row', backgroundColor: C.azulEscuro, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 8 },
  btnContatoTexto: { color: C.branco, fontSize: 14, fontWeight: 'bold' }
});
