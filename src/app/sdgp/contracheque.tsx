/**
 * Super App Gov — Módulo SDGP / Contracheque (Conectado à Nuvem Supabase)
 * Ficheiro: src/app/sdgp/contracheque.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase'; // 🛡️ Conexão direta com o Supabase
import { escaparHtml, exportarHtml } from '../../lib/exportHtml';
const GOV_COLORS = { azulPrincipal: '#1351B4', branco: '#FFFFFF', cinzaFundo: '#F8F9FA', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', verde: '#10b981', vermelho: '#ef4444', cinzaBorda: '#E0E0E0' };

export default function ContrachequeScreen() {
  const router = useRouter();
  const { nome, cargo, matricula, uorg, cpf } = useLocalSearchParams();
  
  const [contracheques, setContracheques] = useState<any[]>([]);
  const [mesAtual, setMesAtual] = useState(0);
  const [carregando, setCarregando] = useState(true);

  // 📡 BUSCA SEGURA DIRETO NO SUPABASE
  useEffect(() => {
    const buscarDados = async () => {
      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false });

        if (error) throw error;

        if (data && data.length > 0) {
          setContracheques(data);
        } else {
          Alert.alert('Aviso', 'Nenhum contracheque encontrado para esta matrícula no banco de dados.');
        }
      } catch (error) {
        console.error("Erro ao buscar no Supabase:", error);
        Alert.alert('Erro', 'Falha ao conectar com a Nuvem Governamental.');
      } finally {
        setCarregando(false);
      }
    };

    if (matricula) buscarDados();
    else setCarregando(false);
  }, [matricula]);

  const formatarMoeda = (valor: number) => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

  // 📄 GERAÇÃO DO PDF COMPLETO E BONITÃO
  // 📄 GERAÇÃO DO PDF OFICIAL GOV.BR
  // 📄 GERAÇÃO DO PDF DO CONTRACHEQUE MENSAL (PADRÃO OFICIAL GOV.BR)
 // 📄 GERAÇÃO DO PDF DO CONTRACHEQUE MENSAL (LINDO, COM NOME, CPF E CARGO)
  const gerarPDF = async () => {
    if (contracheques.length === 0) return;
    const dados = contracheques[mesAtual];

    // Travas de segurança: se a rota falhar, não passa vergonha na apresentação
    const nomeSeguro = escaparHtml(nome || 'Servidor não identificado');
    const cpfSeguro = escaparHtml(cpf || 'CPF não informado');
    const cargoSeguro = escaparHtml(cargo || 'Cargo não informado');

    try {
      const linhasRendimentos = Array.isArray(dados.rendimentos) 
        ? dados.rendimentos.map((r:any) => `<tr><td class="text-center">${escaparHtml(r.rubrica)}</td><td>${escaparHtml(r.desc)}</td><td class="text-right">${formatarMoeda(r.valor)}</td></tr>`).join('') 
        : '<tr><td colspan="3" class="text-center">Sem rendimentos registrados</td></tr>';

      const linhasDescontos = Array.isArray(dados.lista_descontos) 
        ? dados.lista_descontos.map((d:any) => `<tr><td class="text-center">${escaparHtml(d.rubrica)}</td><td>${escaparHtml(d.desc)}</td><td class="text-right vermelho-text">- ${formatarMoeda(d.valor)}</td></tr>`).join('') 
        : '<tr><td colspan="3" class="text-center">Sem descontos registrados</td></tr>';

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

              .section-title { font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #1A1A1A; padding-bottom: 4px; margin-top: 15px; margin-bottom: 10px; font-weight: bold; }
              
              table.valores { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
              table.valores th, table.valores td { border: 1px solid #1A1A1A; padding: 8px; }
              table.valores th { background-color: #F8F9FA; text-transform: uppercase; font-size: 11px; font-weight: bold; text-align: center; }
              
              .text-right { text-align: right; }
              .text-center { text-align: center; }
              .verde-text { color: #00A859; font-weight: bold; }
              .vermelho-text { color: #ef4444; font-weight: bold; }
              
              .total-box { border: 2px solid #1A1A1A; padding: 15px 20px; text-align: right; margin-top: 25px; background-color: #F8F9FA; }
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
              <h1>gov.br</h1>
              <h2>Ministério da Gestão e da Inovação em Serviços Públicos</h2>
            </div>
            
            <div class="content">
              <div class="title">Comprovante de Rendimentos - ${escaparHtml(dados.mes_referencia)}</div>
              
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

              <div class="section-title">Rendimentos</div>
              <table class="valores">
                <thead>
                  <tr>
                    <th style="width: 15%;">Rubrica</th>
                    <th style="width: 65%; text-align: left;">Descrição</th>
                    <th style="width: 20%;" class="text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasRendimentos}
                </tbody>
              </table>

              <div class="section-title">Descontos</div>
              <table class="valores">
                <thead>
                  <tr>
                    <th style="width: 15%;">Rubrica</th>
                    <th style="width: 65%; text-align: left;">Descrição</th>
                    <th style="width: 20%;" class="text-right">Valor (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  ${linhasDescontos}
                </tbody>
              </table>

              <div class="total-box">
                <p>Total de Rendimentos: <strong>${formatarMoeda(dados.bruto)}</strong></p>
                <p>Total de Descontos: <strong class="vermelho-text">- ${formatarMoeda(dados.descontos)}</strong></p>
                <div class="total-liquido">Líquido a Receber: ${formatarMoeda(dados.liquido)}</div>
              </div>
              
              <div class="rodape">
                Documento emitido eletronicamente pelo Super App Gov. Autenticação validada via banco de dados centralizado.
              </div>
            </div>
          </body>
        </html>
      `;

      await exportarHtml(htmlPDF);
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o PDF do Contracheque.');
    }
  };
  if (carregando) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={GOV_COLORS.azulPrincipal} />
        <Text style={{ marginTop: 10, color: GOV_COLORS.cinzaTexto }}>Buscando contracheque na nuvem...</Text>
      </SafeAreaView>
    );
  }

  if (contracheques.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}><MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} /></TouchableOpacity>
          <Text style={styles.headerTitle}>Contracheque</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <MaterialCommunityIcons name="file-hidden" size={60} color={GOV_COLORS.cinzaBorda} />
          <Text style={{ marginTop: 10, color: GOV_COLORS.cinzaTexto }}>Nenhum contracheque encontrado.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dados = contracheques[mesAtual];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contracheque</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.seletorMes}>
        <TouchableOpacity onPress={() => setMesAtual(mesAtual + 1)} disabled={mesAtual === contracheques.length - 1}>
          <MaterialIcons name="chevron-left" size={30} color={mesAtual === contracheques.length - 1 ? '#CCC' : GOV_COLORS.azulPrincipal} />
        </TouchableOpacity>
        
        <Text style={styles.mesTexto}>{dados.mes_referencia}</Text>
        
        <TouchableOpacity onPress={() => setMesAtual(mesAtual - 1)} disabled={mesAtual === 0}>
          <MaterialIcons name="chevron-right" size={30} color={mesAtual === 0 ? '#CCC' : GOV_COLORS.azulPrincipal} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }}>
        <View style={styles.resumoCard}>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Rendimento Bruto</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.textoPreto }]}>{formatarMoeda(dados.bruto)}</Text>
          </View>
          <View style={styles.linhaResumo}>
            <Text style={styles.labelResumo}>Descontos</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.vermelho }]}>- {formatarMoeda(dados.descontos)}</Text>
          </View>
          <View style={[styles.linhaResumo, { borderTopWidth: 1, borderColor: GOV_COLORS.cinzaBorda, paddingTop: 10, marginTop: 5 }]}>
            <Text style={[styles.labelResumo, { fontWeight: 'bold' }]}>Líquido a Receber</Text>
            <Text style={[styles.valorResumo, { color: GOV_COLORS.verde, fontSize: 18, fontWeight: 'bold' }]}>{formatarMoeda(dados.liquido)}</Text>
          </View>
        </View>

        <Text style={styles.tituloSecao}>Rendimentos</Text>
        <View style={styles.listaContainer}>
          {Array.isArray(dados.rendimentos) && dados.rendimentos.map((item:any, index:number) => (
            <View key={index} style={styles.itemLinha}>
              <View>
                <Text style={styles.itemRubrica}>{item.rubrica}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              <Text style={styles.itemValor}>{formatarMoeda(item.valor)}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.tituloSecao}>Descontos</Text>
        <View style={[styles.listaContainer, { marginBottom: 30 }]}>
          {Array.isArray(dados.lista_descontos) && dados.lista_descontos.map((item:any, index:number) => (
            <View key={index} style={styles.itemLinha}>
              <View>
                <Text style={styles.itemRubrica}>{item.rubrica}</Text>
                <Text style={styles.itemDesc}>{item.desc}</Text>
              </View>
              <Text style={[styles.itemValor, { color: GOV_COLORS.vermelho }]}>- {formatarMoeda(item.valor)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.rodapeAcoes}>
        
        <TouchableOpacity 
          style={styles.btnSecundario} 
          onPress={() => router.push({ 
            pathname: '/sdgp/ficha', 
            params: { nome, matricula, cpf, cargo } 
          })}
        >
          <MaterialCommunityIcons name="file-chart" size={20} color={GOV_COLORS.azulPrincipal} />
          <Text style={styles.textoBtnSecundario}>Ficha Financeira</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnPrincipal} onPress={gerarPDF}>
          <MaterialCommunityIcons name="file-pdf-box" size={20} color={GOV_COLORS.branco} />
          <Text style={styles.textoBtnPrincipal}>Baixar PDF</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo }, header: { backgroundColor: GOV_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15 }, headerTitle: { fontSize: 18, fontWeight: 'bold', color: GOV_COLORS.branco }, seletorMes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: GOV_COLORS.branco, padding: 15, borderBottomWidth: 1, borderColor: GOV_COLORS.cinzaBorda }, mesTexto: { fontSize: 18, fontWeight: 'bold', color: GOV_COLORS.azulPrincipal }, resumoCard: { backgroundColor: GOV_COLORS.branco, padding: 16, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, marginBottom: 20 }, linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }, labelResumo: { fontSize: 14, color: GOV_COLORS.cinzaTexto }, valorResumo: { fontSize: 14, fontWeight: '600' }, tituloSecao: { fontSize: 16, fontWeight: 'bold', color: GOV_COLORS.textoPreto, marginBottom: 10, marginLeft: 4 }, listaContainer: { backgroundColor: GOV_COLORS.branco, borderRadius: 8, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, overflow: 'hidden', marginBottom: 20 }, itemLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: GOV_COLORS.cinzaFundo }, itemRubrica: { fontSize: 10, color: GOV_COLORS.cinzaTexto, fontWeight: 'bold' }, itemDesc: { fontSize: 14, color: GOV_COLORS.textoPreto, marginTop: 2 }, itemValor: { fontSize: 14, fontWeight: '600', color: GOV_COLORS.textoPreto }, rodapeAcoes: { flexDirection: 'row', padding: 16, backgroundColor: GOV_COLORS.branco, borderTopWidth: 1, borderColor: GOV_COLORS.cinzaBorda, gap: 10 }, btnPrincipal: { flex: 1, flexDirection: 'row', backgroundColor: GOV_COLORS.azulPrincipal, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8 }, btnSecundario: { flex: 1, flexDirection: 'row', backgroundColor: GOV_COLORS.branco, height: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal }, textoBtnPrincipal: { color: GOV_COLORS.branco, fontSize: 14, fontWeight: 'bold' }, textoBtnSecundario: { color: GOV_COLORS.azulPrincipal, fontSize: 14, fontWeight: 'bold' } });
