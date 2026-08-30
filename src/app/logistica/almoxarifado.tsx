/**
 * Super App Gov — Logística / Almoxarifado Virtual (CATÁLOGO EXPANDIDO)
 * Ficheiro: src/app/logistica/almoxarifado.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const C = { 
  azulGov: '#1351B4', azulEscuro: '#0B2D66', fundo: '#F4F6F9', branco: '#FFFFFF',
  textoDestaque: '#111827', textoSecundario: '#6B7280', 
  borda: '#E5E7EB', verde: '#10B981', vermelho: '#EF4444', ouro: '#F59E0B', 
  bgPill: '#F3F4F6' 
};

// 📦 CATÁLOGO EXPANDIDO E CORRIGIDO
const CATALOGO = [
  { id: '1', nome: 'Resma de Papel A4 (500 fls)', icone: 'description', categoria: 'Papelaria' },
  { id: '2', nome: 'Caneta Esferográfica Azul (Caixa)', icone: 'edit', categoria: 'Papelaria' },
  { id: '3', nome: 'Marca-texto Amarelo', icone: 'border-color', categoria: 'Papelaria' },
  { id: '4', nome: 'Pasta Suspensa Kraft (Kit 10)', icone: 'folder-open', categoria: 'Papelaria' },
  { id: '5', nome: 'Grampeador de Mesa', icone: 'post-add', categoria: 'Papelaria' },
  { id: '6', nome: 'Caixa de Grampos 26/6', icone: 'view-week', categoria: 'Papelaria' },
  { id: '7', nome: 'Clipes de Papel (Caixa)', icone: 'attach-file', categoria: 'Papelaria' },
  { id: '8', nome: 'Bloco de Notas (Pacote)', icone: 'sticky-note-2', categoria: 'Papelaria' },
  { id: '9', nome: 'Toner Impressora Padrão', icone: 'print', categoria: 'Informática' },
  { id: '10', nome: 'Mouse Óptico USB', icone: 'mouse', categoria: 'Informática' },
  { id: '11', nome: 'Teclado USB ABNT2', icone: 'keyboard', categoria: 'Informática' },
  { id: '12', nome: 'Pendrive 32GB Governamental', icone: 'usb', categoria: 'Informática' },
];

export default function AlmoxarifadoScreen() {
  const router = useRouter();
  const { nome, matricula, uorg } = useLocalSearchParams();

  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [carregando, setCarregando] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  useEffect(() => {
    buscarHistorico();
  }, []);

  const buscarHistorico = async () => {
    setCarregandoHistorico(true);
    try {
      const { data, error } = await supabase
        .from('solicitacoes_almoxarifado')
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

  const alterarQuantidade = (id: string, incremento: number) => {
    setCarrinho(prev => {
      const qtdAtual = prev[id] || 0;
      const novaQtd = Math.max(0, qtdAtual + incremento);
      const novoCarrinho = { ...prev };
      if (novaQtd === 0) delete novoCarrinho[id];
      else novoCarrinho[id] = novaQtd;
      return novoCarrinho;
    });
  };

  const totalItens = Object.values(carrinho).reduce((acc, curr) => acc + curr, 0);

  const handleFinalizarPedido = async () => {
    setCarregando(true);
    try {
      const itensFormatados = Object.entries(carrinho).map(([id, qtd]) => {
        const produto = CATALOGO.find(p => p.id === id);
        return { id, nome: produto?.nome, qtd };
      });

      const { error } = await supabase.from('solicitacoes_almoxarifado').insert([
        {
          matricula: matricula || 'N/D',
          nome_servidor: nome || 'Servidor',
          uorg: uorg || 'Unidade Central',
          itens: itensFormatados,
          status: 'A Separar'
        }
      ]);

      if (error) throw error;

      Alert.alert('Sucesso!', 'A tua requisição foi enviada para o Almoxarifado Central.');
      setCarrinho({});
      buscarHistorico();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gravar o pedido.');
    } finally {
      setCarregando(false);
    }
  };

  const getStatusCor = (status: string) => {
    if (status === 'Entregue') return C.verde;
    if (status === 'Em Trânsito') return C.azulGov;
    return C.ouro;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER GOV */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Almoxarifado</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* WIDGET DE QUOTA (PREMIUM) */}
        <View style={styles.quotaWidget}>
          <View style={styles.quotaRow}>
            <View>
              <Text style={styles.quotaLabel}>Quota Mensal (Lotação)</Text>
              <Text style={styles.quotaUorg}>{uorg || 'Não identificada'}</Text>
            </View>
            <View style={styles.badgeQuota}>
              <Text style={styles.badgeQuotaText}>75% Disp.</Text>
            </View>
          </View>
          <View style={styles.barraFundo}>
            <View style={[styles.barraPreenchida, { width: '25%' }]} />
          </View>
        </View>

        {/* CATÁLOGO DE PRODUTOS */}
        <Text style={styles.secaoTitulo}>Catálogo de Materiais</Text>
        <View style={styles.catalogoGrid}>
          {CATALOGO.map((item) => {
            const qtd = carrinho[item.id] || 0;
            const selecionado = qtd > 0;
            
            return (
              <View key={item.id} style={[styles.produtoCard, selecionado && styles.produtoCardAtivo]}>
                <View style={[styles.iconeFundo, selecionado && { backgroundColor: C.azulGov }]}>
                  <MaterialIcons name={item.icone as any} size={22} color={selecionado ? C.branco : C.azulGov} />
                </View>
                
                <View style={styles.produtoInfo}>
                  <Text style={styles.produtoNome}>{item.nome}</Text>
                  <Text style={styles.produtoCat}>{item.categoria}</Text>
                </View>

                {/* Stepper Moderno em Pílula */}
                <View style={styles.stepperPill}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => alterarQuantidade(item.id, -1)}>
                    <MaterialIcons name="remove" size={18} color={qtd > 0 ? C.textoDestaque : C.textoSecundario} />
                  </TouchableOpacity>
                  <Text style={styles.stepperValor}>{qtd}</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => alterarQuantidade(item.id, 1)}>
                    <MaterialIcons name="add" size={18} color={C.azulGov} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* HISTÓRICO DE PEDIDOS */}
        <Text style={styles.secaoTitulo}>Os Meus Pedidos</Text>
        {carregandoHistorico ? (
          <ActivityIndicator size="large" color={C.azulGov} style={{ marginVertical: 20 }} />
        ) : historico.length === 0 ? (
          <View style={styles.vazioState}>
            <MaterialCommunityIcons name="inbox-remove-outline" size={48} color={C.borda} />
            <Text style={styles.vazioTexto}>Nenhum pedido no histórico.</Text>
          </View>
        ) : (
          historico.map((pedido) => (
            <View key={pedido.id} style={styles.historicoCard}>
              <View style={styles.historicoCabecalho}>
                <Text style={styles.historicoId}>Pedido #{pedido.id}</Text>
                <View style={[styles.statusTag, { backgroundColor: getStatusCor(pedido.status) + '15' }]}>
                  <View style={[styles.statusBolinha, { backgroundColor: getStatusCor(pedido.status) }]} />
                  <Text style={[styles.statusTexto, { color: getStatusCor(pedido.status) }]}>{pedido.status}</Text>
                </View>
              </View>
              <View style={styles.historicoItens}>
                {pedido.itens && pedido.itens.map((i: any, idx: number) => (
                  <Text key={idx} style={styles.historicoItemTxt}>{i.qtd}x {i.nome}</Text>
                ))}
              </View>
            </View>
          ))
        )}

      </ScrollView>

      {/* RODAPÉ FLUTUANTE (CARRINHO) - SÓ APARECE SE TIVER ITENS */}
      {totalItens > 0 && (
        <View style={styles.footerFlutuante}>
          <View style={styles.footerResumo}>
            <Text style={styles.footerItensText}>{totalItens} {totalItens === 1 ? 'Item' : 'Itens'} no carrinho</Text>
            <Text style={styles.footerSubText}>Pronto para despachar</Text>
          </View>
          <TouchableOpacity style={styles.btnCheckout} onPress={handleFinalizarPedido} disabled={carregando}>
            {carregando ? (
              <ActivityIndicator size="small" color={C.branco} />
            ) : (
              <>
                <Text style={styles.btnCheckoutTexto}>Confirmar</Text>
                <MaterialIcons name="arrow-forward" size={18} color={C.branco} />
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fundo },
  header: { backgroundColor: C.azulGov, paddingTop: 10, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  btnVoltar: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', paddingLeft: 4 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: C.branco },
  
  scrollContent: { padding: 20, paddingBottom: 100 }, 
  
  quotaWidget: { backgroundColor: C.azulEscuro, borderRadius: 16, padding: 20, marginBottom: 25, elevation: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  quotaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  quotaLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: 0.5 },
  quotaUorg: { fontSize: 16, color: C.branco, fontWeight: 'bold', marginTop: 4 },
  badgeQuota: { backgroundColor: 'rgba(16, 185, 129, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.5)' },
  badgeQuotaText: { color: C.verde, fontWeight: '900', fontSize: 12 },
  barraFundo: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  barraPreenchida: { height: '100%', backgroundColor: C.verde, borderRadius: 3 },
  
  secaoTitulo: { fontSize: 18, fontWeight: '800', color: C.textoDestaque, marginBottom: 15 },
  
  catalogoGrid: { gap: 12, marginBottom: 30 },
  produtoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.branco, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.borda, elevation: 1 },
  produtoCardAtivo: { borderColor: C.azulGov, elevation: 3, shadowColor: C.azulGov, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  iconeFundo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  produtoInfo: { flex: 1 },
  produtoNome: { fontSize: 14, fontWeight: '700', color: C.textoDestaque, marginBottom: 2 },
  produtoCat: { fontSize: 12, color: C.textoSecundario },
  
  stepperPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bgPill, borderRadius: 20, paddingHorizontal: 4, paddingVertical: 4 },
  stepperBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.branco, justifyContent: 'center', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2 },
  stepperValor: { width: 24, textAlign: 'center', fontSize: 14, fontWeight: '800', color: C.textoDestaque },
  
  historicoCard: { backgroundColor: C.branco, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.borda },
  historicoCabecalho: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.fundo },
  historicoId: { fontSize: 15, fontWeight: '800', color: C.textoDestaque },
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusBolinha: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusTexto: { fontSize: 11, fontWeight: 'bold' },
  historicoItens: { paddingLeft: 4 },
  historicoItemTxt: { fontSize: 13, color: C.textoSecundario, marginBottom: 4, fontWeight: '500' },
  
  vazioState: { alignItems: 'center', padding: 40, backgroundColor: C.branco, borderRadius: 16, borderWidth: 1, borderColor: C.borda, borderStyle: 'dashed' },
  vazioTexto: { marginTop: 12, color: C.textoSecundario, fontSize: 14, fontWeight: '600' },

  footerFlutuante: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: C.branco, borderTopWidth: 1, borderTopColor: C.borda, paddingHorizontal: 20, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
  footerResumo: { flex: 1 },
  footerItensText: { fontSize: 16, fontWeight: '800', color: C.textoDestaque },
  footerSubText: { fontSize: 12, color: C.verde, fontWeight: '600', marginTop: 2 },
  btnCheckout: { flexDirection: 'row', backgroundColor: C.azulGov, paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', gap: 8 },
  btnCheckoutTexto: { color: C.branco, fontSize: 15, fontWeight: 'bold' }
});