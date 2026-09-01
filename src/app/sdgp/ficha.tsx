/**
 * Super App Gov — Módulo SDGP / Ficha Financeira
 * Arquivo: src/app/sdgp/ficha.tsx
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { escaparHtml, exportarHtml } from '../../lib/exportHtml';

const GOV_COLORS = {
  azulPrincipal: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  cinzaFundo: '#F8F8F8',
  cinzaSuperficie: '#F1F3F5',
  texto: '#1F2937',
  cinzaTexto: '#555A60',
  cinzaClaro: '#9CA3AF',
  cinzaBorda: '#D9DDE3',
  amarelo: '#FFCD00',
  verde: '#168821',
  verdeFundo: '#E7F4E8',
  vermelho: '#B91C1C',
  vermelhoFundo: '#FDECEC',
};

type PeriodoFiltro = 3 | 6 | 12;

type Contracheque = {
  id?: string | number;
  mes_referencia?: string | null;
  bruto?: number | string | null;
  descontos?: number | string | null;
  liquido?: number | string | null;
};

function formatarMoeda(valor: unknown) {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) return 'R$ 0,00';

  try {
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  } catch {
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  }
}

function GovHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <MaterialIcons
          name="arrow-back"
          size={22}
          color={GOV_COLORS.azulPrincipal}
        />
      </TouchableOpacity>

      <View style={styles.marcaGroup}>
        <Text style={styles.marca}>
          gov<Text style={styles.marcaPonto}>.</Text>br
        </Text>
        <View style={styles.marcaDivisor} />
        <Text style={styles.headerModulo}>Gestão de Pessoas</Text>
      </View>

      <MaterialIcons
        name="account-circle"
        size={29}
        color={GOV_COLORS.azulPrincipal}
      />
    </View>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );
}

function BotaoFiltro({
  valor,
  texto,
  ativo,
  onPress,
}: {
  valor: PeriodoFiltro;
  texto: string;
  ativo: boolean;
  onPress: (valor: PeriodoFiltro) => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.btnFiltro, ativo && styles.btnFiltroAtivo]}
      onPress={() => onPress(valor)}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityState={{ selected: ativo }}
    >
      <Text
        style={[
          styles.textoFiltro,
          ativo && styles.textoFiltroAtivo,
        ]}
      >
        {texto}
      </Text>
    </TouchableOpacity>
  );
}

export default function FichaFinanceiraScreen() {
  const router = useRouter();
  const { nome, matricula, cpf, cargo } =
    useLocalSearchParams<{
      nome: string;
      matricula: string;
      cpf: string;
      cargo: string;
    }>();

  const [historico, setHistorico] = useState<Contracheque[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [mesesFiltro, setMesesFiltro] = useState<PeriodoFiltro>(12);

  useEffect(() => {
    let ativo = true;

    const buscarDados = async () => {
      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false });

        if (error) throw error;
        if (ativo) setHistorico((data || []) as Contracheque[]);
      } catch (error) {
        console.error('Erro ao consultar ficha financeira:', error);

        if (ativo) {
          Alert.alert(
            'Serviço indisponível',
            'Não foi possível consultar a ficha financeira neste momento.',
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };

    if (matricula) {
      buscarDados();
    } else {
      setCarregando(false);
    }

    return () => {
      ativo = false;
    };
  }, [matricula]);

  const historicoFiltrado = useMemo(
    () => historico.slice(0, mesesFiltro),
    [historico, mesesFiltro],
  );

  const totais = useMemo(() => {
  let bruto = 0;
  let descontos = 0;
  let liquido = 0;

  historicoFiltrado.forEach((item) => {
    bruto += Number(item.bruto ?? 0);
    descontos += Number(item.descontos ?? 0);
    liquido += Number(item.liquido ?? 0);
  });

  return { bruto, descontos, liquido };
}, [historicoFiltrado]);
  const gerarPDFFicha = async () => {
    if (historicoFiltrado.length === 0 || gerandoPdf) {
      if (historicoFiltrado.length === 0) {
        Alert.alert(
          'Sem dados',
          'Não há demonstrativos para gerar a ficha financeira.',
        );
      }
      return;
    }

    const nomeSeguro = escaparHtml(nome || 'Servidor não identificado');
    const cpfSeguro = escaparHtml(cpf || 'CPF não informado');
    const cargoSeguro = escaparHtml(cargo || 'Cargo não informado');
    const matriculaSegura = escaparHtml(
      matricula || 'Matrícula não informada',
    );

    try {
      setGerandoPdf(true);

      const linhas = historicoFiltrado
        .map(
          (item) => `
            <tr>
              <td><strong>${escaparHtml(item.mes_referencia || 'Não informado')}</strong></td>
              <td class="right">${formatarMoeda(item.bruto)}</td>
              <td class="right desconto">- ${formatarMoeda(item.descontos)}</td>
              <td class="right liquido-celula">${formatarMoeda(item.liquido)}</td>
            </tr>
          `,
        )
        .join('');

      const htmlPDF = `
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />
            <style>
              * { box-sizing: border-box; }
              body {
                margin: 0;
                color: #1F2937;
                font-family: Rawline, Arial, Helvetica, sans-serif;
                background: #FFFFFF;
              }
              .top-line { height: 5px; background: #1351B4; }
              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 18px 28px;
                border-bottom: 1px solid #D9DDE3;
              }
              .marca { color: #071D41; font-size: 28px; font-weight: 900; }
              .ponto { color: #FFCD00; }
              .orgao { color: #555A60; font-size: 11px; text-align: right; }
              .content { padding: 28px; }
              .eyebrow {
                color: #1351B4;
                font-size: 10px;
                font-weight: 800;
                letter-spacing: 1px;
              }
              h1 { color: #071D41; font-size: 22px; margin: 6px 0 4px; }
              .periodo { color: #555A60; font-size: 12px; margin-bottom: 22px; }
              .info {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 24px;
                background: #F8F8F8;
              }
              .info td { border: 1px solid #D9DDE3; padding: 10px 12px; }
              .label {
                display: block;
                color: #555A60;
                font-size: 9px;
                font-weight: 800;
                text-transform: uppercase;
                margin-bottom: 3px;
              }
              .value { color: #1F2937; font-size: 12px; font-weight: 700; }
              .valores { width: 100%; border-collapse: collapse; font-size: 11px; }
              .valores th, .valores td {
                border: 1px solid #D9DDE3;
                padding: 8px;
              }
              .valores th {
                color: #071D41;
                background: #F1F3F5;
                font-size: 9px;
                text-transform: uppercase;
              }
              .right { text-align: right; }
              .desconto { color: #B91C1C; font-weight: 700; }
              .liquido-celula { color: #168821; font-weight: 700; }
              .totais {
                margin-top: 22px;
                margin-left: auto;
                width: 52%;
                border: 1px solid #D9DDE3;
                background: #F8F8F8;
                padding: 14px;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin-bottom: 7px;
              }
              .total-liquido {
                display: flex;
                justify-content: space-between;
                color: #071D41;
                font-size: 14px;
                font-weight: 900;
                border-top: 1px solid #D9DDE3;
                padding-top: 10px;
                margin-top: 10px;
              }
              .footer {
                color: #555A60;
                font-size: 9px;
                line-height: 1.5;
                text-align: center;
                border-top: 1px solid #D9DDE3;
                margin-top: 34px;
                padding-top: 12px;
              }
            </style>
          </head>
          <body>
            <div class="top-line"></div>
            <div class="header">
              <div class="marca">gov<span class="ponto">.</span>br</div>
              <div class="orgao">Portal Integrado de Gestão Pública<br />Gestão de Pessoas — SDGP</div>
            </div>

            <main class="content">
              <div class="eyebrow">HISTÓRICO FINANCEIRO</div>
              <h1>Ficha financeira</h1>
              <div class="periodo">
                ${historicoFiltrado.length} demonstrativo${historicoFiltrado.length === 1 ? '' : 's'} exibido${historicoFiltrado.length === 1 ? '' : 's'} • filtro de até ${mesesFiltro} meses
              </div>

              <table class="info">
                <tr>
                  <td colspan="2">
                    <span class="label">Servidor</span>
                    <span class="value">${nomeSeguro}</span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span class="label">Matrícula</span>
                    <span class="value">${matriculaSegura}</span>
                  </td>
                  <td>
                    <span class="label">CPF</span>
                    <span class="value">${cpfSeguro}</span>
                  </td>
                </tr>
                <tr>
                  <td colspan="2">
                    <span class="label">Cargo</span>
                    <span class="value">${cargoSeguro}</span>
                  </td>
                </tr>
              </table>

              <table class="valores">
                <thead>
                  <tr>
                    <th>Mês/Ano</th>
                    <th class="right">Rendimento bruto</th>
                    <th class="right">Descontos</th>
                    <th class="right">Líquido recebido</th>
                  </tr>
                </thead>
                <tbody>${linhas}</tbody>
              </table>

              <div class="totais">
                <div class="total-row"><span>Rendimentos</span><strong>${formatarMoeda(totais.bruto)}</strong></div>
                <div class="total-row"><span>Descontos</span><strong class="desconto">- ${formatarMoeda(totais.descontos)}</strong></div>
                <div class="total-liquido"><span>Líquido</span><span>${formatarMoeda(totais.liquido)}</span></div>
              </div>

              <div class="footer">
                Documento demonstrativo emitido pelo Portal Integrado de Gestão Pública.<br />
                Confirme as informações oficiais junto à unidade de Gestão de Pessoas.
              </div>
            </main>
          </body>
        </html>
      `;

      await exportarHtml(htmlPDF);
    } catch (error) {
      console.error('Erro ao gerar ficha financeira:', error);
      Alert.alert(
        'Erro ao gerar documento',
        'Não foi possível gerar o PDF da ficha financeira.',
      );
    } finally {
      setGerandoPdf(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.branco} />
        <GovHeader onBack={() => router.back()} />

        <View style={styles.estadoCentralizado}>
          <ActivityIndicator size="large" color={GOV_COLORS.azulPrincipal} />
          <Text style={styles.estadoTitulo}>Consolidando ficha financeira</Text>
          <Text style={styles.estadoTexto}>Aguarde enquanto consultamos os demonstrativos disponíveis.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.branco} />
      <GovHeader onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>SDGP</Text>
          <MaterialIcons name="chevron-right" size={14} color={GOV_COLORS.cinzaClaro} />
          <Text style={styles.breadcrumbText}>Contracheque</Text>
          <MaterialIcons name="chevron-right" size={14} color={GOV_COLORS.cinzaClaro} />
          <Text style={styles.breadcrumbAtual}>Ficha financeira</Text>
        </View>

        <View style={styles.pageHeading}>
          <Text style={styles.pageEyebrow}>HISTÓRICO FINANCEIRO</Text>
          <Text style={styles.pageTitle}>Ficha financeira</Text>
          <Text style={styles.pageSubtitle}>Consulte o consolidado de rendimentos, descontos e valores líquidos por período.</Text>
        </View>

        <View style={styles.servidorInfo}>
          <View style={styles.servidorIcone}>
            <MaterialIcons name="person" size={23} color={GOV_COLORS.azulPrincipal} />
          </View>
          <View style={styles.servidorTexto}>
            <Text style={styles.servidorLabel}>SERVIDOR</Text>
            <Text style={styles.nomeText}>{nome || 'Servidor público'}</Text>
            <Text style={styles.matriculaText}>Matrícula {matricula || 'não informada'}</Text>
          </View>
        </View>

        <SectionHeader title="Período de consulta" description="Selecione quantos demonstrativos recentes devem ser considerados" />

        <View style={styles.barraFiltros}>
          <BotaoFiltro valor={3} texto="3 meses" ativo={mesesFiltro === 3} onPress={setMesesFiltro} />
          <BotaoFiltro valor={6} texto="6 meses" ativo={mesesFiltro === 6} onPress={setMesesFiltro} />
          <BotaoFiltro valor={12} texto="12 meses" ativo={mesesFiltro === 12} onPress={setMesesFiltro} />
        </View>

        <View style={styles.resultadoFiltro}>
          <MaterialIcons name="filter-list" size={18} color={GOV_COLORS.azulPrincipal} />
          <Text style={styles.resultadoFiltroTexto}>
            {historicoFiltrado.length} demonstrativo{historicoFiltrado.length === 1 ? '' : 's'} encontrado{historicoFiltrado.length === 1 ? '' : 's'} no limite selecionado.
          </Text>
        </View>

        <SectionHeader title="Consolidado do período" description={`Totais dos últimos ${historicoFiltrado.length} demonstrativos disponíveis`} />

        <View style={styles.resumoAnoCard}>
          <View style={styles.resumoItem}>
            <MaterialIcons name="add-circle-outline" size={20} color={GOV_COLORS.azulPrincipal} />
            <Text style={styles.labelResumo}>Rendimentos</Text>
            <Text style={styles.valorResumo}>{formatarMoeda(totais.bruto)}</Text>
          </View>

          <View style={styles.resumoItem}>
            <MaterialIcons name="remove-circle-outline" size={20} color={GOV_COLORS.vermelho} />
            <Text style={styles.labelResumo}>Descontos</Text>
            <Text style={[styles.valorResumo, styles.valorDesconto]}>- {formatarMoeda(totais.descontos)}</Text>
          </View>

          <View style={[styles.resumoItem, styles.resumoLiquido]}>
            <MaterialIcons name="payments" size={20} color={GOV_COLORS.verde} />
            <Text style={styles.labelResumo}>Líquido recebido</Text>
            <Text style={[styles.valorResumo, styles.valorLiquido]}>{formatarMoeda(totais.liquido)}</Text>
          </View>
        </View>

        <SectionHeader title="Detalhamento mensal" description="Demonstrativos considerados no cálculo consolidado" />

        {historicoFiltrado.length === 0 ? (
          <View style={styles.vazio}>
            <MaterialCommunityIcons name="file-hidden" size={38} color={GOV_COLORS.cinzaClaro} />
            <Text style={styles.vazioTitulo}>Nenhum demonstrativo encontrado</Text>
            <Text style={styles.vazioTexto}>Não existem dados financeiros disponíveis para o período.</Text>
          </View>
        ) : (
          <View style={styles.listaMeses}>
            {historicoFiltrado.map((item, index) => (
              <View key={String(item.id ?? index)} style={[styles.mesCard, index === historicoFiltrado.length - 1 && styles.mesCardUltimo]}>
                <View style={styles.mesHeader}>
                  <View style={styles.mesIcone}>
                    <MaterialCommunityIcons name="calendar-check" size={19} color={GOV_COLORS.azulPrincipal} />
                  </View>
                  <Text style={styles.mesTexto}>{item.mes_referencia || 'Referência não informada'}</Text>
                </View>

                <View style={styles.mesValores}>
                  <View style={styles.colunaValor}>
                    <Text style={styles.minLabel}>BRUTO</Text>
                    <Text style={styles.minValor}>{formatarMoeda(item.bruto)}</Text>
                  </View>
                  <View style={styles.colunaValor}>
                    <Text style={styles.minLabel}>DESCONTOS</Text>
                    <Text style={[styles.minValor, styles.minValorDesconto]}>- {formatarMoeda(item.descontos)}</Text>
                  </View>
                  <View style={styles.colunaValor}>
                    <Text style={styles.minLabel}>LÍQUIDO</Text>
                    <Text style={[styles.minValor, styles.minValorLiquido]}>{formatarMoeda(item.liquido)}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={19} color={GOV_COLORS.azulPrincipal} />
          <Text style={styles.infoText}>Os valores apresentados são demonstrativos. Confirme dados oficiais com a unidade de Gestão de Pessoas.</Text>
        </View>
      </ScrollView>

      <View style={styles.rodapeAcoes}>
        <View style={styles.rodapeAcoesConteudo}>
          <TouchableOpacity
            style={[styles.btnPrincipal, (gerandoPdf || historicoFiltrado.length === 0) && styles.btnDesativado]}
            onPress={gerarPDFFicha}
            disabled={gerandoPdf || historicoFiltrado.length === 0}
          >
            {gerandoPdf ? (
              <ActivityIndicator size="small" color={GOV_COLORS.branco} />
            ) : (
              <MaterialCommunityIcons name="download" size={21} color={GOV_COLORS.branco} />
            )}
            <Text style={styles.textoBtnPrincipal}>{gerandoPdf ? 'Gerando relatório...' : `Exportar relatório • até ${mesesFiltro} meses`}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { minHeight: 66, backgroundColor: GOV_COLORS.branco, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  marcaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  marca: { color: GOV_COLORS.azulEscuro, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  marcaPonto: { color: GOV_COLORS.amarelo },
  marcaDivisor: { width: 1, height: 25, backgroundColor: GOV_COLORS.cinzaBorda, marginHorizontal: 12 },
  headerModulo: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 13, fontWeight: '700' },
  scrollContent: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 30 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 },
  breadcrumbText: { color: GOV_COLORS.azulPrincipal, fontSize: 11, marginHorizontal: 3 },
  breadcrumbAtual: { color: GOV_COLORS.cinzaTexto, fontSize: 11, fontWeight: '700', marginHorizontal: 3 },
  pageHeading: { paddingBottom: 18, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  pageEyebrow: { color: GOV_COLORS.azulPrincipal, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  pageTitle: { color: GOV_COLORS.azulEscuro, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { color: GOV_COLORS.cinzaTexto, fontSize: 13, lineHeight: 20, marginTop: 7 },
  servidorInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, borderRadius: 6, padding: 14 },
  servidorIcone: { width: 43, height: 43, borderRadius: 22, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  servidorTexto: { flex: 1 },
  servidorLabel: { color: GOV_COLORS.azulPrincipal, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  nomeText: { color: GOV_COLORS.texto, fontSize: 15, fontWeight: '800', marginTop: 2 },
  matriculaText: { color: GOV_COLORS.cinzaTexto, fontSize: 10, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'stretch', marginTop: 27, marginBottom: 11 },
  sectionBar: { width: 4, minHeight: 38, borderRadius: 2, backgroundColor: GOV_COLORS.azulPrincipal, marginRight: 10 },
  sectionHeaderText: { flex: 1, justifyContent: 'center' },
  sectionTitle: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800' },
  sectionDescription: { color: GOV_COLORS.cinzaTexto, fontSize: 11, marginTop: 2 },
  barraFiltros: { flexDirection: 'row', gap: 8 },
  btnFiltro: { flex: 1, minHeight: 42, borderRadius: 21, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal, backgroundColor: GOV_COLORS.branco, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  btnFiltroAtivo: { backgroundColor: GOV_COLORS.azulPrincipal },
  textoFiltro: { color: GOV_COLORS.azulPrincipal, fontSize: 11, fontWeight: '800' },
  textoFiltroAtivo: { color: GOV_COLORS.branco },
  resultadoFiltro: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: GOV_COLORS.azulClaro, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, padding: 11, marginTop: 11 },
  resultadoFiltroTexto: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 10, lineHeight: 15 },
  resumoAnoCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 12 },
  resumoItem: { flex: 1, minWidth: 180, backgroundColor: GOV_COLORS.cinzaSuperficie, borderRadius: 4, padding: 13 },
  resumoLiquido: { backgroundColor: GOV_COLORS.verdeFundo },
  labelResumo: { color: GOV_COLORS.cinzaTexto, fontSize: 10, fontWeight: '700', marginTop: 8 },
  valorResumo: { color: GOV_COLORS.texto, fontSize: 17, fontWeight: '800', marginTop: 3 },
  valorDesconto: { color: GOV_COLORS.vermelho },
  valorLiquido: { color: GOV_COLORS.verde, fontSize: 19 },
  listaMeses: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, overflow: 'hidden' },
  mesCard: { padding: 14, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  mesCardUltimo: { borderBottomWidth: 0 },
  mesHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mesIcone: { width: 34, height: 34, borderRadius: 5, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  mesTexto: { color: GOV_COLORS.azulEscuro, fontSize: 14, fontWeight: '800' },
  mesValores: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  colunaValor: { flex: 1, minWidth: 120, backgroundColor: GOV_COLORS.cinzaFundo, borderRadius: 4, padding: 10 },
  minLabel: { color: GOV_COLORS.cinzaTexto, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  minValor: { color: GOV_COLORS.texto, fontSize: 12, fontWeight: '700', marginTop: 4 },
  minValorDesconto: { color: GOV_COLORS.vermelho },
  minValorLiquido: { color: GOV_COLORS.verde, fontWeight: '800' },
  vazio: { alignItems: 'center', backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderStyle: 'dashed', borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 30 },
  vazioTitulo: { color: GOV_COLORS.azulEscuro, fontSize: 14, fontWeight: '800', marginTop: 10 },
  vazioTexto: { color: GOV_COLORS.cinzaTexto, fontSize: 11, textAlign: 'center', marginTop: 4 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: GOV_COLORS.azulClaro, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, padding: 13, marginTop: 20 },
  infoText: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 11, lineHeight: 17 },
  rodapeAcoes: { backgroundColor: GOV_COLORS.branco, borderTopWidth: 1, borderTopColor: GOV_COLORS.cinzaBorda, paddingHorizontal: 16, paddingVertical: 12 },
  rodapeAcoesConteudo: { width: '100%', maxWidth: 900, alignSelf: 'center' },
  btnPrincipal: { minHeight: 48, borderRadius: 24, backgroundColor: GOV_COLORS.azulPrincipal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16 },
  btnDesativado: { opacity: 0.55 },
  textoBtnPrincipal: { color: GOV_COLORS.branco, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  estadoCentralizado: { flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 28 },
  estadoTitulo: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 13 },
  estadoTexto: { color: GOV_COLORS.cinzaTexto, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});
