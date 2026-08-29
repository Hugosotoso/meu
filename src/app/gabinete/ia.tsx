/**
 * Super App Gov — Módulo Gabinete Inteligente (IA)
 * Ficheiro: src/app/gabinete/ia.tsx
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const GOV_COLORS = { 
  roxoIA: '#7E22CE', // Cor de IA / Inovação
  roxoClaro: '#F3E8FF',
  azulPrincipal: '#1351B4', 
  branco: '#FFFFFF', 
  cinzaFundo: '#F0F2F5', 
  textoPreto: '#1A1A1A', 
  cinzaTexto: '#64748B', 
  verde: '#059669',
  cinzaBorda: '#E2E8F0'
};

export default function GabineteIAScreen() {
  const router = useRouter();
  
  // Estados para simular a mágica da IA
  const [etapa, setEtapa] = useState<'upload' | 'analisando' | 'resultado'>('upload');

  const iniciarAnalise = () => {
    setEtapa('analisando');
    
    // Simula o tempo de leitura da IA (3 segundos) para dar um suspense na apresentação
    setTimeout(() => {
      setEtapa('resultado');
    }, 3000);
  };

  const exportarSEI = () => {
    Alert.alert('Demonstração', 'Exportação simulada. O protótipo não está conectado ao SEI.');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER DIFERENCIADO PARA IA */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <MaterialCommunityIcons name="robot-outline" size={20} color={GOV_COLORS.branco} style={{ marginRight: 8 }} />
          <Text style={styles.headerTitle}>Gabinete IA</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Análise Rápida de Processos</Text>
          <Text style={styles.heroSub}>Fluxo visual com conteúdo fictício. Nenhum arquivo é enviado e nenhuma IA real é executada.</Text>
        </View>

        {/* ETAPA 1: UPLOAD DO DOCUMENTO */}
        {etapa === 'upload' && (
          <TouchableOpacity style={styles.uploadBox} onPress={iniciarAnalise}>
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="cloud-upload-outline" size={40} color={GOV_COLORS.roxoIA} />
            </View>
            <Text style={styles.uploadTitle}>Iniciar demonstração</Text>
            <Text style={styles.uploadSub}>Usa um exemplo fictício já incluído no protótipo</Text>
          </TouchableOpacity>
        )}

        {/* ETAPA 2: ANIMAÇÃO DE ANÁLISE (SUSPENSE) */}
        {etapa === 'analisando' && (
          <View style={styles.analisandoBox}>
            <ActivityIndicator size="large" color={GOV_COLORS.roxoIA} />
            <Text style={styles.analisandoTitle}>Simulando análise...</Text>
            <Text style={styles.analisandoSub}>Esta animação demonstra a experiência planejada, sem consultar bases externas.</Text>
          </View>
        )}

        {/* ETAPA 3: O RESULTADO DA IA */}
        {etapa === 'resultado' && (
          <View style={styles.resultadoContainer}>
            <View style={styles.badgeIA}>
              <MaterialCommunityIcons name="check-decagram" size={16} color={GOV_COLORS.roxoIA} />
              <Text style={styles.badgeText}>Resultado fictício</Text>
            </View>

            {/* Resumo Executivo */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Resumo Executivo</Text>
              <Text style={styles.cardText}>
                Trata-se de solicitação de Averbação de Tempo de Serviço (ATS) do servidor João Silva. Os documentos comprovam 4 anos no INSS. Não constam pendências jurídicas.
              </Text>
            </View>

            {/* Conformidade Legal */}
            <View style={styles.cardInfo}>
              <Text style={styles.cardLabel}>Conformidade Legal</Text>
              <View style={styles.rowItem}>
                <MaterialIcons name="check-circle" size={18} color={GOV_COLORS.verde} />
                <Text style={styles.textVerde}>Atende ao Art. 100 da Lei 8.112/90</Text>
              </View>
              <View style={styles.rowItem}>
                <MaterialIcons name="check-circle" size={18} color={GOV_COLORS.verde} />
                <Text style={styles.textVerde}>Exemplo de conferência documental</Text>
              </View>
            </View>

            {/* Sugestão de Despacho */}
            <View style={[styles.cardInfo, { borderColor: GOV_COLORS.roxoIA, borderWidth: 1.5 }]}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={[styles.cardLabel, { color: GOV_COLORS.roxoIA }]}>Minuta de Despacho Sugerida</Text>
                <MaterialCommunityIcons name="content-copy" size={18} color={GOV_COLORS.roxoIA} />
              </View>
              <Text style={[styles.cardText, { fontStyle: 'italic', marginTop: 10 }]}>
                "Diante da documentação acostada aos autos e em conformidade com a Lei 8.112/90, manifesto-me pelo DEFERIMENTO do pedido de averbação de tempo de contribuição..."
              </Text>
            </View>

            <TouchableOpacity style={styles.btnAcao} onPress={exportarSEI}>
              <Text style={styles.btnAcaoTxt}>Simular exportação</Text>
              <MaterialCommunityIcons name="send" size={18} color={GOV_COLORS.branco} style={{marginLeft: 8}} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecundario} onPress={() => setEtapa('upload')}>
              <Text style={styles.btnSecundarioTxt}>Analisar Novo Documento</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { backgroundColor: GOV_COLORS.roxoIA, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitleContainer: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: GOV_COLORS.branco, fontWeight: '700', fontSize: 18 },
  scroll: { padding: 20 },
  
  heroSection: { marginBottom: 25 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: GOV_COLORS.textoPreto, marginBottom: 8 },
  heroSub: { fontSize: 14, color: GOV_COLORS.cinzaTexto, lineHeight: 20 },
  
  uploadBox: { backgroundColor: GOV_COLORS.branco, borderWidth: 2, borderColor: GOV_COLORS.roxoClaro, borderStyle: 'dashed', borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center' },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: GOV_COLORS.roxoClaro, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: GOV_COLORS.textoPreto, marginBottom: 5 },
  uploadSub: { fontSize: 13, color: GOV_COLORS.cinzaTexto },
  
  analisandoBox: { backgroundColor: GOV_COLORS.branco, borderRadius: 20, padding: 40, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  analisandoTitle: { fontSize: 18, fontWeight: '700', color: GOV_COLORS.roxoIA, marginTop: 20, marginBottom: 10 },
  analisandoSub: { fontSize: 13, color: GOV_COLORS.cinzaTexto, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  
  resultadoContainer: { flex: 1 },
  badgeIA: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.roxoClaro, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 15 },
  badgeText: { color: GOV_COLORS.roxoIA, fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  
  cardInfo: { backgroundColor: GOV_COLORS.branco, padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda },
  cardLabel: { fontSize: 13, fontWeight: '700', color: GOV_COLORS.cinzaTexto, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  cardText: { fontSize: 15, color: GOV_COLORS.textoPreto, lineHeight: 22 },
  rowItem: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  textVerde: { color: GOV_COLORS.verde, fontWeight: '600', marginLeft: 8, fontSize: 14 },
  
  btnAcao: { backgroundColor: GOV_COLORS.roxoIA, flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, elevation: 3 },
  btnAcaoTxt: { color: GOV_COLORS.branco, fontWeight: '700', fontSize: 16 },
  
  btnSecundario: { padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnSecundarioTxt: { color: GOV_COLORS.roxoIA, fontWeight: '700', fontSize: 15 }
});
