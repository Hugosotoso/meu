/**
 * Super App Gov — Módulo SDGP / Ficha Financeira Anual com Filtros e IHC Correto
 * Ficheiro: src/app/sdgp/ficha.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 🛡️ Conexão direta com o Supabase
import { useSession } from '../../context/SessionContext';
import { DEMO_CONTRACHEQUES, isDemoCpf } from '../../lib/demoData';
import { escaparHtml, exportarHtml } from '../../lib/exportHtml';

const GOV_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F8F9FA', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', verde: '#10b981', vermelho: '#ef4444', cinzaBorda: '#E0E0E0' };

export default function FichaFinanceiraScreen() {
  const router = useRouter();
  const { servidor } = useSession();
  const { nome, matricula, cpf, cargo } = servidor || {};
  
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  
  // 🎛️ ESTADO DA BARRA DE FILTROS: Oculta meses conforme a escolha
  const [mesesFiltro, setMesesFiltro] = useState<number>(12);

  // 📡 BUSCA SEGURA DIRETO NO SUPABASE
  useEffect(() => {
    const buscarDados = async () => {
      if (isDemoCpf(cpf)) {
        setHistorico(DEMO_CONTRACHEQUES);
        setCarregando(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false }); // Garante o mais recente no topo!

        if (error) throw error;

        if (data) {
          setHistorico(data);
        }
      } catch (error) {
        console.error("Erro ao buscar no Supabase:", error);
        Alert.alert('Erro', 'Falha ao conectar com o banco de dados.');
      } finally {
        setCarregando(false);
      }
    };

    if (matricula) buscarDados();
    else setCarregando(false);
  }, [cpf, matricula]);

  const formatarMoeda = (valor: number) => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

  // ✂️ Aplica o filtro de tempo (Pega apenas os primeiros X meses do array ordenado)
  const historicoFiltrado = historico.slice(0, mesesFiltro);

  // 🧮 Refaz a matemática baseada APENAS no filtro escolhido
  const totalBruto = historicoFiltrado.reduce((acc, curr) => acc + Number(curr.bruto || 0), 0);
  const totalDescontos = historicoFiltrado.reduce((acc, curr) => acc + Number(curr.descontos || 0), 0);
  const totalLiquido = historicoFiltrado.reduce((acc, curr) => acc + Number(curr.liquido || 0), 0);

 // 📄 GERAÇÃO DO PDF DA FICHA FINANCEIRA (LINDO, COM NOME, CPF E CARGO)
  const gerarPDFFicha = async () => {
    if (historicoFiltrado.length === 0) {
      Alert.alert('Aviso', 'Não há dados para gerar o PDF.');
      return;
    }

    // Travas de segurança anti-branco
    const nomeSeguro = escaparHtml(nome || 'Servidor não identificado');
    const cpfSeguro = escaparHtml(cpf ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}` : '***.***.***-**');
    const cargoSeguro = escaparHtml(cargo || 'Cargo não informado');

    try {
      const htmlPDF = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 0; margin: 0; color: #1A1A1A; }
              .tarja-br { display: flex; height: 8px; width: 100%; }
              .verde { background-color: #00A859; flex: 1; }
              .amarelo { background-color: #FFCC29; flex: 1; }
              .azul { background-color: #3E4095; flex: 1; }
              .gov-header { background-color: #1351B4; color: white; padding: 25px 20px; text-align: center; }
              .gov-header h1 { margin: 0; font-size: 32px; font-weight: 900; letter-spacing: -1px; }
              .gov-header h2 { margin: 5px 0 0 0; font-size: 14px; font-weight: 400; text-transform: uppercase; letter-spacing: 1px; color: #E8EEFA; }
              .content { padding: 30px; }
              
              .title { text-align: center; border-bottom: 2px solid #1A1A1A; padding-bottom: 10px; margin-bottom: 25px; font-size: 18px; text-transform: uppercase; font-weight: bold; }
              
              /* CAIXA DE IDENTIFICAÇÃO OFICIAL ALINHADA */
              table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 25px; background-color: #F8F9FA; border: 1px solid #1A1A1A; font-size: 13px; }
              table.info-table td { border: 1px solid #1A1A1A; padding: 10px 15px; }
              .info-label { display: block; font-size: 10px; color: #555A60; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
              .info-valor { font-size: 14px; font-weight: 500; color: #1A1A1A; }

              table.valores { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
              table.valores th, table.valores td { border: 1px solid #1A1A1A; padding: 8px; text-align: center; }
              table.valores th { background-color: #F8F9FA; text-transform: uppercase; font-size: 11px; font-weight: bold; }
              
              .text-right { text-align: right; }
              .verde-text { color: #00A859; font-weight: bold; }
              .vermelho-text { color: #ef4444; font-weight: bold; }
              
              .total-box { border: 2px solid #1A1A1A; padding: 15px 20px; text-align: right; margin-top: 20px; background-color: #F8F9FA; }
              .total-box p { margin: 5px 0; font-size: 14px; }
              .total-liquido { font-size: 20px; font-weight: 900; color: #1351B4; border-top: 1px dashed #1A1A1A; padding-top: 15px; margin-top: 15px; }
              
              .rodape { margin-top: 40px; font-size: 10px; text-align: center; color: #555A60; border-top: 1px solid #E0E0E0; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="tarja-br">
              <div class="verde"></div><div class="amarelo"></div><div class="azul"></div>
            </div>
            <div class="gov-header">
              <h1>Portal Integrado N2</h1>
              <h2>Protótipo acadêmico — documento demonstrativo</h2>
            </div>
            
            <div class="content">
              <div class="title">Ficha Financeira - Consolidado de ${mesesFiltro} Meses</div>
              
              <table class="info-table">
                <tr>
                  <td style="width: 65%;">
                    <span class="info-label">Nome do Servidor</span>
                    <span class="info-valor">${nomeSeguro}</span>
                  </td>
                  <td style="width: 35%;">
                    <span class="info-label">CPF</span>
                    <span class="info-valor">${cpfSeguro}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span class="info-label">Cargo / Emprego</span>
                    <span class="info-valor">${cargoSeguro}</span>
                  </td>
                </tr>
              </table>

              <table class="valores">
                <thead>
                  <tr>
                    <th>Mês/Ano</th>
                    <th class="text-right">Rendimento Bruto (R$)</th>
                    <th class="text-right">Descontos (R$)</th>
                    <th class="text-right">Líquido Recebido (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  ${historicoFiltrado.map((item:any) => `
                    <tr>
                      <td><strong>${escaparHtml(item.mes_referencia)}</strong></td>
                      <td class="text-right">${formatarMoeda(item.bruto)}</td>
                      <td class="text-right vermelho-text">- ${formatarMoeda(item.descontos)}</td>
                      <td class="text-right verde-text">${formatarMoeda(item.liquido)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>

              <div class="total-box">
                <p>Acumulado Bruto do Período: <strong>${formatarMoeda(totalBruto)}</strong></p>
                <p>Acumulado de Descontos: <strong class="vermelho-text">- ${formatarMoeda(totalDescontos)}</strong></p>
                <div class="total-liquido">Total Líquido do Período: ${formatarMoeda(totalLiquido)}</div>
              </div>
              
              <div class="rodape">
                Documento fictício gerado pelo Portal Integrado N2. Não possui validade oficial.
              </div>
            </div>
          </body>
        </html>
      `;

      await exportarHtml(htmlPDF);
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF da Ficha Financeira.');
    }
  };

  const BotaoFiltro = ({ valor, texto }: { valor: number, texto: string }) => {
    const ativo = mesesFiltro === valor;
    return (
      <TouchableOpacity 
        style={[styles.btnFiltro, ativo && styles.btnFiltroAtivo]} 
        onPress={() => setMesesFiltro(valor)}
        activeOpacity={0.7}
      >
        <Text style={[styles.textoFiltro, ativo && styles.textoFiltroAtivo]}>{texto}</Text>
      </TouchableOpacity>
    );
  };

  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GOV_COLORS.azulPrincipal} />
        <Text style={{ marginTop: 10, color: GOV_COLORS.cinzaTexto }}>Consolidando Ficha Financeira...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ficha Financeira</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView style={{ flex: 1, padding: 16, marginBottom: 80 }}>
        
        <View style={styles.servidorInfo}>
          <MaterialIcons name="account-circle" size={40} color={GOV_COLORS.azulPrincipal} />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.nomeText}>{nome || 'Servidor não identificado'}</Text>
            <Text style={styles.matriculaText}>Matrícula: {matricula || 'Não informada'}</Text>
          </View>
        </View>

        {/* 🎛️ BARRA DE FILTROS */}
        <Text style={styles.tituloSecao}>Visualizar Período</Text>
        <View style={styles.barraFiltros}>
          <BotaoFiltro valor={3} texto="Últimos 3 Meses" />
          <BotaoFiltro valor={6} texto="6 Meses" />
          <BotaoFiltro valor={12} texto="1 Ano" />
        </View>

        <Text style={styles.tituloSecao}>Acumulado ({mesesFiltro} Meses)</Text>
        <View style={styles.resumoAnoCard}>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Total Bruto:</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.textoPreto }]}>{formatarMoeda(totalBruto)}</Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Total Descontos:</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.vermelho }]}>- {formatarMoeda(totalDescontos)}</Text>
          </View>
          <View style={[styles.linhaResumo, { borderTopWidth: 1, borderColor: GOV_COLORS.cinzaBorda, paddingTop: 10, marginTop: 5 }]}>
            <Text style={[styles.labelResumo, { fontWeight: 'bold' }]}>Líquido Recebido:</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.verde, fontSize: 18, fontWeight: 'bold' }]}>{formatarMoeda(totalLiquido)}</Text>
          </View>
        </View>

        <Text style={styles.tituloSecao}>Detalhamento Mensal</Text>
        <View style={styles.listaMeses}>
          {historicoFiltrado.length === 0 ? (
            <Text style={{ padding: 15, textAlign: 'center', color: GOV_COLORS.cinzaTexto }}>Nenhum dado encontrado no período.</Text>
          ) : (
            historicoFiltrado.map((item, index) => (
              <View key={index} style={styles.mesCard}>
                <View style={styles.mesHeader}>
                  <Text style={styles.mesTexto}>{item.mes_referencia}</Text>
                  <MaterialCommunityIcons name="calendar-check" size={18} color={GOV_COLORS.azulPrincipal} />
                </View>
                <View style={styles.mesValores}>
                  <View style={styles.colunaValor}>
                    <Text style={styles.minLabel}>Bruto</Text>
                    <Text style={styles.minValor}>{formatarMoeda(item.bruto)}</Text>
                  </View>
                  <View style={styles.colunaValor}>
                    <Text style={styles.minLabel}>Desc.</Text>
                    <Text style={[styles.minValor, { color: GOV_COLORS.vermelho }]}>- {formatarMoeda(item.descontos)}</Text>
                  </View>
                  <View style={styles.colunaValor}>
                    <Text style={[styles.minLabel, { color: GOV_COLORS.verde }]}>Líquido</Text>
                    <Text style={[styles.minValor, { color: GOV_COLORS.verde, fontWeight: 'bold' }]}>{formatarMoeda(item.liquido)}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* BOTÃO DE EXPORTAR */}
      <View style={styles.rodapeAcoes}>
        <TouchableOpacity style={styles.btnPrincipal} onPress={gerarPDFFicha}>
          <MaterialCommunityIcons name="download" size={22} color={GOV_COLORS.branco} />
          <Text style={styles.textoBtnPrincipal}>Exportar Relatório ({mesesFiltro} Meses)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo }, header: { backgroundColor: GOV_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: GOV_COLORS.branco }, servidorInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, padding: 15, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, marginBottom: 20 }, nomeText: { fontSize: 16, fontWeight: 'bold', color: GOV_COLORS.textoPreto }, matriculaText: { fontSize: 13, color: GOV_COLORS.cinzaTexto, marginTop: 2 }, tituloSecao: { fontSize: 16, fontWeight: 'bold', color: GOV_COLORS.azulEscuro, marginBottom: 10, marginLeft: 4 }, barraFiltros: { flexDirection: 'row', gap: 10, marginBottom: 20 }, btnFiltro: { flex: 1, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, paddingVertical: 10, borderRadius: 20, alignItems: 'center', elevation: 1 }, btnFiltroAtivo: { backgroundColor: GOV_COLORS.azulPrincipal, borderColor: GOV_COLORS.azulPrincipal }, textoFiltro: { color: GOV_COLORS.cinzaTexto, fontWeight: '600', fontSize: 12 }, textoFiltroAtivo: { color: GOV_COLORS.branco }, resumoAnoCard: { backgroundColor: GOV_COLORS.azulPrincipal + '15', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal + '40', marginBottom: 25 }, linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, labelResumo: { fontSize: 15, color: GOV_COLORS.textoPreto }, valorResumo: { fontSize: 15, fontWeight: '600' }, listaMeses: { paddingBottom: 30 }, mesCard: { backgroundColor: GOV_COLORS.branco, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, marginBottom: 12, overflow: 'hidden' }, mesHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: GOV_COLORS.cinzaFundo, padding: 10, borderBottomWidth: 1, borderColor: GOV_COLORS.cinzaBorda }, mesTexto: { fontSize: 14, fontWeight: 'bold', color: GOV_COLORS.textoPreto }, mesValores: { flexDirection: 'row', padding: 12 }, colunaValor: { flex: 1, alignItems: 'center' }, minLabel: { fontSize: 11, color: GOV_COLORS.cinzaTexto, marginBottom: 4 }, minValor: { fontSize: 13, fontWeight: '600', color: GOV_COLORS.textoPreto }, rodapeAcoes: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: GOV_COLORS.branco, borderTopWidth: 1, borderColor: GOV_COLORS.cinzaBorda }, btnPrincipal: { flexDirection: 'row', backgroundColor: GOV_COLORS.azulPrincipal, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 10 }, textoBtnPrincipal: { color: GOV_COLORS.branco, fontSize: 15, fontWeight: 'bold' } });
