/**
 * Super App Gov — Módulo Assentamento Funcional Digital (AFD)
 * Ficheiro: src/app/sdgp/afd.tsx
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const GOV_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F0F2F5', cinzaTexto: '#64748B', borda: '#E2E8F0', destaque: '#EFF6FF' };

const HISTORICO_AFD = [
  { 
    data: '15/03/2026', 
    evento: 'Progressão Funcional', 
    doc: 'Base Legal (Lei 8.112)', 
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm' // Link do Planalto que NUNCA cai
  },
  { 
    data: '10/01/2025', 
    evento: 'Adicional de Qualificação', 
    doc: 'Portal do Servidor', 
    url: 'https://www.gov.br/servidor/pt-br' // Portal oficial do servidor
  },
  { 
    data: '05/02/2023', 
    evento: 'Nomeação (Cargo Efetivo)', 
    doc: 'Diário Oficial da União', 
    url: 'https://www.in.gov.br/' // Site principal do DOU
  }
];

export default function AfdScreen() {
  const router = useRouter();

  const abrirDocumento = (url: string) => {
    Linking.openURL(url).catch(() => Alert.alert('Erro', 'Não foi possível abrir o documento.'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assentamento Digital (AFD)</Text>
      </View>

      <ScrollView style={styles.scroll}>
        <View style={styles.cardInfo}>
          <Text style={styles.infoTxt}>Sua vida funcional consolidada conforme diretrizes do Governo Federal. Registros validados com base no histórico do SIAPE.</Text>
        </View>

        {HISTORICO_AFD.map((item, index) => (
          <View key={index} style={styles.itemEvento}>
            <View style={styles.linhaData}>
              <View style={styles.bolinha} />
              <Text style={styles.dataTxt}>{item.data}</Text>
            </View>
            <View style={styles.eventoConteudo}>
              <Text style={styles.eventoTitulo}>{item.evento}</Text>
              <Text style={styles.docTxt}>{item.doc}</Text>
              
              <TouchableOpacity 
                style={styles.btnVer} 
                onPress={() => abrirDocumento(item.url)}
              >
                <Text style={styles.btnVerTxt}>Visualizar Documento</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { backgroundColor: GOV_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  headerTitle: { color: GOV_COLORS.branco, fontWeight: '700', fontSize: 18, marginLeft: 20 },
  scroll: { padding: 20 },
  cardInfo: { backgroundColor: GOV_COLORS.destaque, padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#BFDBFE' },
  infoTxt: { fontSize: 13, color: GOV_COLORS.azulEscuro, lineHeight: 18 },
  itemEvento: { marginLeft: 10, borderLeftWidth: 2, borderColor: GOV_COLORS.borda, paddingLeft: 20, paddingBottom: 25 },
  linhaData: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  bolinha: { width: 10, height: 10, borderRadius: 5, backgroundColor: GOV_COLORS.azulPrincipal, position: 'absolute', left: -25 },
  dataTxt: { fontWeight: '700', color: GOV_COLORS.cinzaTexto },
  eventoConteudo: { backgroundColor: GOV_COLORS.branco, padding: 15, borderRadius: 12, borderWidth: 1, borderColor: GOV_COLORS.borda },
  eventoTitulo: { fontWeight: '700', marginBottom: 4 },
  docTxt: { fontSize: 12, color: GOV_COLORS.cinzaTexto, marginBottom: 10 },
  btnVer: { alignSelf: 'flex-start', padding: 8, backgroundColor: GOV_COLORS.destaque, borderRadius: 6 },
  btnVerTxt: { fontSize: 11, color: GOV_COLORS.azulPrincipal, fontWeight: 'bold' }
});
