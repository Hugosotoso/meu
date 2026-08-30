/**
 * Super App Gov — Módulo SDGP / Simulador de Aposentadoria (Com Dossiê Educativo)
 * Ficheiro: src/app/sdgp/aposentadoria.tsx
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const GOV_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F8F9FA', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', verde: '#10b981', alertaFundo: '#FFFBEB', alertaTexto: '#B45309', cinzaBorda: '#E0E0E0', roxo: '#6B21A8' };

export default function AposentadoriaScreen() {
  const router = useRouter();
  const { nome, matricula } = useLocalSearchParams();

  // ☁️ DADOS DO SERVIDOR LOGADO (O Novato Pós-Reforma)
  const dadosUsuario = {
    idade: 28,
    tempoContribuicaoAnos: 2,
    tempoContribuicaoMeses: 5,
    anosFaltantes: 37,
    mesesFaltantes: 0,
    regraAplicada: 'Regra Geral Permanente (EC 103/2019)',
    dataPrevista: 'Agosto / 2063',
    metaAnos: 39.4 // Total necessário para chegar aos 65 anos
  };

  const tempoAtual = dadosUsuario.tempoContribuicaoAnos + (dadosUsuario.tempoContribuicaoMeses / 12);
  const percentualConcluido = (tempoAtual / dadosUsuario.metaAnos) * 100;

  // Animação da barra de progresso principal
  const larguraBarra = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(larguraBarra, {
      toValue: percentualConcluido,
      duration: 1500,
      useNativeDriver: false,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simulação Oficial</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16, marginBottom: 20 }}>
        
        {/* PERFIL DO SERVIDOR */}
        <View style={styles.servidorInfo}>
          <MaterialIcons name="account-circle" size={40} color={GOV_COLORS.azulPrincipal} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.nomeText}>{nome}</Text>
            <Text style={styles.matriculaText}>Matrícula: {matricula}</Text>
          </View>
        </View>

        {/* ⏳ CARD PRINCIPAL: O SIMULADOR DO USUÁRIO */}
        <View style={styles.cardDestaque}>
          <View style={{ alignItems: 'center', marginBottom: 15 }}>
            <MaterialCommunityIcons name="timer-sand" size={36} color={GOV_COLORS.azulPrincipal} />
            <Text style={styles.destaqueLabel}>Tempo restante estimado</Text>
            <Text style={styles.destaqueValor}>
              {dadosUsuario.anosFaltantes} Anos
            </Text>
            <Text style={styles.destaqueSub}>Previsão: {dadosUsuario.dataPrevista}</Text>
          </View>

          {/* BARRA DE PROGRESSO ANIMADA */}
          <View style={styles.barraFundo}>
            <Animated.View style={[styles.barraPreenchida, { width: larguraBarra.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={styles.textoProgresso}>Progresso da Carreira</Text>
            <Text style={[styles.textoProgresso, { color: GOV_COLORS.verde, fontWeight: 'bold' }]}>{percentualConcluido.toFixed(1)}%</Text>
          </View>
        </View>

        {/* 📊 DADOS AUDITADOS DO USUÁRIO */}
        <View style={styles.cardInfoGeral}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcone}><MaterialCommunityIcons name="cake-variant-outline" size={20} color={GOV_COLORS.azulPrincipal} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Idade Validada</Text>
              <Text style={styles.infoValor}>{dadosUsuario.idade} anos</Text>
            </View>
          </View>
          <View style={styles.divisor} />
          <View style={styles.infoRow}>
            <View style={styles.infoIcone}><MaterialCommunityIcons name="calendar-clock-outline" size={20} color={GOV_COLORS.azulPrincipal} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Tempo de Contribuição</Text>
              <Text style={styles.infoValor}>{dadosUsuario.tempoContribuicaoAnos} anos e {dadosUsuario.tempoContribuicaoMeses} meses</Text>
            </View>
          </View>
        </View>

        {/* 📖 SESSÃO EDUCATIVA: COMO FUNCIONA A REGRA ATUAL */}
        <Text style={styles.tituloSecao}>Entenda a sua Regra</Text>
        <View style={styles.cardTexto}>
          <Text style={styles.paragrafo}>
            Você ingressou no serviço público após a <Text style={styles.textoBold}>Reforma da Previdência (EC 103/2019)</Text>. Por isso, você está enquadrado na Regra Geral Permanente do RPPS da União.
          </Text>
          <Text style={styles.paragrafo}>
            Para ter direito à aposentadoria, a lei exige que você cumpra <Text style={styles.textoBold}>todos</Text> os requisitos abaixo simultaneamente:
          </Text>
          <View style={styles.listaBullets}>
            <Text style={styles.bullet}>• Idade mínima de 65 anos (Homens) ou 62 anos (Mulheres);</Text>
            <Text style={styles.bullet}>• 25 anos de tempo de contribuição;</Text>
            <Text style={styles.bullet}>• 10 anos de efetivo exercício no serviço público;</Text>
            <Text style={styles.bullet}>• 5 anos no cargo em que se der a aposentadoria.</Text>
          </View>
        </View>

        {/* ⚖️ COMPARATIVO HISTÓRICO: SERVIDORES ANTIGOS */}
        <Text style={styles.tituloSecao}>Comparativo: Servidores Pré-2019</Text>
        <View style={styles.cardTexto}>
          <Text style={styles.paragrafo}>
            Servidores que ingressaram <Text style={styles.textoBold}>antes de 12/11/2019</Text> possuem direito às Regras de Transição, que permitem aposentadorias mais precoces.
          </Text>
          <Text style={styles.paragrafo}>
            A regra mais comum é a <Text style={styles.textoBold}>Regra dos Pontos</Text>, onde não há exigência de idade mínima fixa, bastando a soma da Idade com o Tempo de Contribuição atingir a pontuação exigida no ano (atualmente 101 pontos para homens).
          </Text>
        </View>

        {/* 📉 GRÁFICO COMPARATIVO ESTÁTICO (VETERANO) */}
        <View style={[styles.cardDestaque, { borderColor: GOV_COLORS.roxo + '40', backgroundColor: '#FAF5FF', marginBottom: 40 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <MaterialCommunityIcons name="history" size={24} color={GOV_COLORS.roxo} />
            <Text style={[styles.destaqueLabel, { color: GOV_COLORS.roxo, marginTop: 0, marginLeft: 8 }]}>Exemplo: Regra dos Pontos (Veterano)</Text>
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <View>
              <Text style={styles.infoLabel}>Idade</Text>
              <Text style={styles.infoValor}>58 anos</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Contribuição</Text>
              <Text style={styles.infoValor}>33 anos</Text>
            </View>
            <View>
              <Text style={styles.infoLabel}>Soma</Text>
              <Text style={[styles.infoValor, { color: GOV_COLORS.roxo }]}>91 Pontos</Text>
            </View>
          </View>

          <View style={styles.barraFundo}>
            <View style={[styles.barraPreenchida, { width: '85%', backgroundColor: GOV_COLORS.roxo }]} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={styles.textoProgresso}>Progresso da Regra</Text>
            <Text style={[styles.textoProgresso, { color: GOV_COLORS.roxo, fontWeight: 'bold' }]}>Perto da Concessão</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { backgroundColor: GOV_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: GOV_COLORS.branco },
  servidorInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, marginBottom: 20 },
  nomeText: { fontSize: 16, fontWeight: 'bold', color: GOV_COLORS.textoPreto },
  matriculaText: { fontSize: 13, color: GOV_COLORS.cinzaTexto, marginTop: 2 },
  
  // Card Destaque
  cardDestaque: { backgroundColor: GOV_COLORS.branco, padding: 20, borderRadius: 12, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal + '40', marginBottom: 20, elevation: 1 },
  destaqueLabel: { fontSize: 13, color: GOV_COLORS.cinzaTexto, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  destaqueValor: { fontSize: 26, fontWeight: '900', color: GOV_COLORS.azulPrincipal, marginVertical: 4, textAlign: 'center' },
  destaqueSub: { fontSize: 14, fontWeight: '600', color: GOV_COLORS.verde, marginTop: 4 },
  barraFundo: { height: 10, backgroundColor: GOV_COLORS.cinzaBorda, borderRadius: 5, marginTop: 15, overflow: 'hidden' },
  barraPreenchida: { height: '100%', backgroundColor: GOV_COLORS.verde, borderRadius: 5 },
  textoProgresso: { fontSize: 12, color: GOV_COLORS.cinzaTexto, marginTop: 2 },
  
  // Card Info Geral
  tituloSecao: { fontSize: 16, fontWeight: 'bold', color: GOV_COLORS.textoPreto, marginBottom: 10, marginLeft: 4, marginTop: 10 },
  cardInfoGeral: { backgroundColor: GOV_COLORS.branco, borderRadius: 12, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  infoIcone: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOV_COLORS.azulPrincipal + '15', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  infoLabel: { fontSize: 12, color: GOV_COLORS.cinzaTexto, marginBottom: 4 },
  infoValor: { fontSize: 15, fontWeight: '700', color: GOV_COLORS.textoPreto },
  divisor: { height: 1, backgroundColor: GOV_COLORS.cinzaFundo, marginVertical: 5 },

  // Textos Educativos
  cardTexto: { backgroundColor: GOV_COLORS.branco, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, marginBottom: 20 },
  paragrafo: { fontSize: 14, color: GOV_COLORS.cinzaTexto, lineHeight: 22, marginBottom: 10 },
  textoBold: { fontWeight: 'bold', color: GOV_COLORS.textoPreto },
  listaBullets: { paddingLeft: 10, marginTop: 5 },
  bullet: { fontSize: 14, color: GOV_COLORS.cinzaTexto, lineHeight: 24 }
});