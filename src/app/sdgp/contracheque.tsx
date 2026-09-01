/**
 * Super App Gov — Módulo SDGP / Contracheque
 * Arquivo: src/app/sdgp/contracheque.tsx
 */

import React, { useEffect, useState } from 'react';
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

type Lancamento = {
  rubrica?: string | number | null;
  desc?: string | null;
  valor?: number | string | null;
};

type Contracheque = {
  id: number | string;
  mes_referencia?: string | null;
  bruto?: number | string | null;
  descontos?: number | string | null;
  liquido?: number | string | null;
  rendimentos?: Lancamento[] | null;
  lista_descontos?: Lancamento[] | null;
};

type GovHeaderProps = {
  onBack: () => void;
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

function GovHeader({ onBack }: GovHeaderProps) {
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

function ListaLancamentos({
  itens,
  desconto = false,
}: {
  itens: Lancamento[];
  desconto?: boolean;
}) {
  if (itens.length === 0) {
    return (
      <View style={styles.listaVazia}>
        <MaterialIcons
          name="info-outline"
          size={19}
          color={GOV_COLORS.cinzaTexto}
        />
        <Text style={styles.listaVaziaTexto}>
          Nenhum lançamento registrado nesta categoria.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listaContainer}>
      {itens.map((item, index) => (
        <View
          key={`${String(item.rubrica ?? 'rubrica')}-${index}`}
          style={[
            styles.itemLinha,
            index === itens.length - 1 && styles.itemLinhaUltimo,
          ]}
        >
          <View style={styles.itemInformacao}>
            <Text style={styles.itemRubrica}>
              RUBRICA {String(item.rubrica ?? 'N/D')}
            </Text>
            <Text style={styles.itemDesc}>
              {item.desc || 'Descrição não informada'}
            </Text>
          </View>

          <Text
            style={[
              styles.itemValor,
              desconto && styles.itemValorDesconto,
            ]}
          >
            {desconto ? '- ' : ''}
            {formatarMoeda(item.valor)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export default function ContrachequeScreen() {
  const router = useRouter();
  const { nome, cargo, matricula, uorg, cpf } =
    useLocalSearchParams<{
      nome: string;
      cargo: string;
      matricula: string;
      uorg: string;
      cpf: string;
    }>();

  const [contracheques, setContracheques] = useState<Contracheque[]>([]);
  const [mesAtual, setMesAtual] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);

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

        if (!ativo) return;

        if (data && data.length > 0) {
          setContracheques(data as Contracheque[]);
        } else {
          Alert.alert(
            'Nenhum demonstrativo',
            'Não foi encontrado contracheque para esta matrícula.',
          );
        }
      } catch (error) {
        console.error('Erro ao consultar contracheques:', error);

        if (ativo) {
          Alert.alert(
            'Serviço indisponível',
            'Não foi possível consultar os contracheques neste momento.',
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

  const gerarPDF = async () => {
    const dados = contracheques[mesAtual];
    if (!dados || gerandoPdf) return;

    const nomeSeguro = escaparHtml(nome || 'Servidor não identificado');
    const cpfSeguro = escaparHtml(cpf || 'CPF não informado');
    const cargoSeguro = escaparHtml(cargo || 'Cargo não informado');
    const matriculaSegura = escaparHtml(
      matricula || 'Matrícula não informada',
    );
    const referenciaSegura = escaparHtml(
      dados.mes_referencia || 'Referência não informada',
    );

    try {
      setGerandoPdf(true);

      const rendimentos = Array.isArray(dados.rendimentos)
        ? dados.rendimentos
        : [];
      const descontos = Array.isArray(dados.lista_descontos)
        ? dados.lista_descontos
        : [];

      const linhasRendimentos = rendimentos.length
        ? rendimentos
            .map(
              (item) => `
                <tr>
                  <td class="center">${escaparHtml(String(item.rubrica ?? 'N/D'))}</td>
                  <td>${escaparHtml(item.desc || 'Descrição não informada')}</td>
                  <td class="right">${formatarMoeda(item.valor)}</td>
                </tr>
              `,
            )
            .join('')
        : '<tr><td colspan="3" class="center vazio">Sem rendimentos registrados</td></tr>';

      const linhasDescontos = descontos.length
        ? descontos
            .map(
              (item) => `
                <tr>
                  <td class="center">${escaparHtml(String(item.rubrica ?? 'N/D'))}</td>
                  <td>${escaparHtml(item.desc || 'Descrição não informada')}</td>
                  <td class="right desconto">- ${formatarMoeda(item.valor)}</td>
                </tr>
              `,
            )
            .join('')
        : '<tr><td colspan="3" class="center vazio">Sem descontos registrados</td></tr>';

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
              .referencia { color: #555A60; font-size: 12px; margin-bottom: 22px; }
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
              .section-title {
                color: #071D41;
                font-size: 13px;
                font-weight: 800;
                border-left: 4px solid #1351B4;
                padding-left: 8px;
                margin: 20px 0 10px;
              }
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
              .center { text-align: center; }
              .desconto { color: #B91C1C; font-weight: 700; }
              .vazio { color: #555A60; padding: 14px !important; }
              .totais {
                margin-top: 22px;
                margin-left: auto;
                width: 48%;
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
              .liquido {
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
              <div class="eyebrow">DEMONSTRATIVO FINANCEIRO</div>
              <h1>Contracheque mensal</h1>
              <div class="referencia">Referência: ${referenciaSegura}</div>

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

              <div class="section-title">Rendimentos</div>
              <table class="valores">
                <thead>
                  <tr>
                    <th style="width: 15%;">Rubrica</th>
                    <th style="width: 60%; text-align: left;">Descrição</th>
                    <th style="width: 25%;" class="right">Valor</th>
                  </tr>
                </thead>
                <tbody>${linhasRendimentos}</tbody>
              </table>

              <div class="section-title">Descontos</div>
              <table class="valores">
                <thead>
                  <tr>
                    <th style="width: 15%;">Rubrica</th>
                    <th style="width: 60%; text-align: left;">Descrição</th>
                    <th style="width: 25%;" class="right">Valor</th>
                  </tr>
                </thead>
                <tbody>${linhasDescontos}</tbody>
              </table>

              <div class="totais">
                <div class="total-row"><span>Rendimentos</span><strong>${formatarMoeda(dados.bruto)}</strong></div>
                <div class="total-row"><span>Descontos</span><strong class="desconto">- ${formatarMoeda(dados.descontos)}</strong></div>
                <div class="liquido"><span>Líquido</span><span>${formatarMoeda(dados.liquido)}</span></div>
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
      console.error('Erro ao gerar demonstrativo:', error);
      Alert.alert(
        'Erro ao gerar documento',
        'Não foi possível gerar o PDF do contracheque.',
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
          <Text style={styles.estadoTitulo}>Consultando contracheques</Text>
          <Text style={styles.estadoTexto}>Aguarde enquanto buscamos os demonstrativos disponíveis.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (contracheques.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.branco} />
        <GovHeader onBack={() => router.back()} />

        <View style={styles.estadoCentralizado}>
          <View style={styles.estadoIcone}>
            <MaterialCommunityIcons
              name="file-hidden"
              size={38}
              color={GOV_COLORS.cinzaTexto}
            />
          </View>
          <Text style={styles.estadoTitulo}>Nenhum contracheque encontrado</Text>
          <Text style={styles.estadoTexto}>Não há demonstrativos financeiros disponíveis para esta matrícula.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const dados = contracheques[mesAtual];
  const rendimentos = Array.isArray(dados.rendimentos) ? dados.rendimentos : [];
  const descontos = Array.isArray(dados.lista_descontos) ? dados.lista_descontos : [];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.branco} />
      <GovHeader onBack={() => router.back()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>SDGP</Text>
          <MaterialIcons name="chevron-right" size={14} color={GOV_COLORS.cinzaClaro} />
          <Text style={styles.breadcrumbAtual}>Contracheque</Text>
        </View>

        <View style={styles.pageHeading}>
          <Text style={styles.pageEyebrow}>INFORMAÇÕES FINANCEIRAS</Text>
          <Text style={styles.pageTitle}>Contracheque</Text>
          <Text style={styles.pageSubtitle}>Consulte rendimentos, descontos e demonstrativos mensais.</Text>
        </View>

        <View style={styles.identificacao}>
          <View style={styles.identificacaoIcone}>
            <MaterialIcons name="person" size={22} color={GOV_COLORS.azulPrincipal} />
          </View>
          <View style={styles.identificacaoTexto}>
            <Text style={styles.identificacaoNome}>{nome || 'Servidor público'}</Text>
            <Text style={styles.identificacaoMeta}>Matrícula {matricula || 'não informada'} • Unidade {uorg || 'não informada'}</Text>
          </View>
        </View>

        <View style={styles.seletorMes}>
          <TouchableOpacity
            onPress={() => setMesAtual((atual) => atual + 1)}
            disabled={mesAtual === contracheques.length - 1}
            style={[styles.mesBotao, mesAtual === contracheques.length - 1 && styles.mesBotaoDesativado]}
            accessibilityLabel="Contracheque anterior"
          >
            <MaterialIcons name="chevron-left" size={24} color={mesAtual === contracheques.length - 1 ? GOV_COLORS.cinzaClaro : GOV_COLORS.azulPrincipal} />
          </TouchableOpacity>

          <View style={styles.mesCentro}>
            <Text style={styles.mesLabel}>REFERÊNCIA</Text>
            <Text style={styles.mesTexto}>{dados.mes_referencia || 'Não informada'}</Text>
          </View>

          <TouchableOpacity
            onPress={() => setMesAtual((atual) => atual - 1)}
            disabled={mesAtual === 0}
            style={[styles.mesBotao, mesAtual === 0 && styles.mesBotaoDesativado]}
            accessibilityLabel="Contracheque seguinte"
          >
            <MaterialIcons name="chevron-right" size={24} color={mesAtual === 0 ? GOV_COLORS.cinzaClaro : GOV_COLORS.azulPrincipal} />
          </TouchableOpacity>
        </View>

        <View style={styles.resumoCard}>
          <View style={styles.resumoItem}>
            <MaterialIcons name="add-circle-outline" size={20} color={GOV_COLORS.azulPrincipal} />
            <Text style={styles.resumoLabel}>Rendimentos</Text>
            <Text style={styles.resumoValor}>{formatarMoeda(dados.bruto)}</Text>
          </View>

          <View style={styles.resumoItem}>
            <MaterialIcons name="remove-circle-outline" size={20} color={GOV_COLORS.vermelho} />
            <Text style={styles.resumoLabel}>Descontos</Text>
            <Text style={[styles.resumoValor, styles.resumoValorDesconto]}>- {formatarMoeda(dados.descontos)}</Text>
          </View>

          <View style={[styles.resumoItem, styles.resumoLiquido]}>
            <MaterialIcons name="payments" size={20} color={GOV_COLORS.verde} />
            <Text style={styles.resumoLabel}>Líquido a receber</Text>
            <Text style={[styles.resumoValor, styles.resumoValorLiquido]}>{formatarMoeda(dados.liquido)}</Text>
          </View>
        </View>

        <SectionHeader title="Rendimentos" description={`${rendimentos.length} lançamento${rendimentos.length === 1 ? '' : 's'} nesta referência`} />
        <ListaLancamentos itens={rendimentos} />

        <SectionHeader title="Descontos" description={`${descontos.length} lançamento${descontos.length === 1 ? '' : 's'} nesta referência`} />
        <ListaLancamentos itens={descontos} desconto />

        <View style={styles.infoBox}>
          <MaterialIcons name="info-outline" size={19} color={GOV_COLORS.azulPrincipal} />
          <Text style={styles.infoText}>Os valores exibidos possuem caráter demonstrativo. Confirme informações oficiais com a unidade de Gestão de Pessoas.</Text>
        </View>
      </ScrollView>

      <View style={styles.rodapeAcoes}>
        <View style={styles.rodapeAcoesConteudo}>
          <TouchableOpacity
            style={styles.btnSecundario}
            onPress={() =>
              router.push({
                pathname: '/sdgp/ficha',
                params: { nome, matricula, cpf, cargo },
              })
            }
          >
            <MaterialCommunityIcons name="file-chart" size={20} color={GOV_COLORS.azulPrincipal} />
            <Text style={styles.textoBtnSecundario}>Ficha financeira</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnPrincipal, gerandoPdf && styles.btnDesativado]}
            onPress={gerarPDF}
            disabled={gerandoPdf}
          >
            {gerandoPdf ? (
              <ActivityIndicator size="small" color={GOV_COLORS.branco} />
            ) : (
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={GOV_COLORS.branco} />
            )}
            <Text style={styles.textoBtnPrincipal}>{gerandoPdf ? 'Gerando...' : 'Gerar PDF'}</Text>
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
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  breadcrumbText: { color: GOV_COLORS.azulPrincipal, fontSize: 11, marginHorizontal: 3 },
  breadcrumbAtual: { color: GOV_COLORS.cinzaTexto, fontSize: 11, fontWeight: '700', marginHorizontal: 3 },
  pageHeading: { paddingBottom: 18, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  pageEyebrow: { color: GOV_COLORS.azulPrincipal, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  pageTitle: { color: GOV_COLORS.azulEscuro, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { color: GOV_COLORS.cinzaTexto, fontSize: 13, lineHeight: 20, marginTop: 7 },
  identificacao: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, borderRadius: 6, padding: 13, marginBottom: 14 },
  identificacaoIcone: { width: 40, height: 40, borderRadius: 20, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  identificacaoTexto: { flex: 1 },
  identificacaoNome: { color: GOV_COLORS.texto, fontSize: 14, fontWeight: '800' },
  identificacaoMeta: { color: GOV_COLORS.cinzaTexto, fontSize: 10, marginTop: 3 },
  seletorMes: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 10, marginBottom: 14 },
  mesBotao: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal, alignItems: 'center', justifyContent: 'center' },
  mesBotaoDesativado: { borderColor: GOV_COLORS.cinzaBorda, backgroundColor: GOV_COLORS.cinzaSuperficie },
  mesCentro: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  mesLabel: { color: GOV_COLORS.cinzaTexto, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  mesTexto: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800', marginTop: 3 },
  resumoCard: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 12 },
  resumoItem: { flex: 1, minWidth: 180, backgroundColor: GOV_COLORS.cinzaSuperficie, borderRadius: 4, padding: 13 },
  resumoLiquido: { backgroundColor: GOV_COLORS.verdeFundo },
  resumoLabel: { color: GOV_COLORS.cinzaTexto, fontSize: 10, fontWeight: '700', marginTop: 8 },
  resumoValor: { color: GOV_COLORS.texto, fontSize: 17, fontWeight: '800', marginTop: 3 },
  resumoValorDesconto: { color: GOV_COLORS.vermelho },
  resumoValorLiquido: { color: GOV_COLORS.verde, fontSize: 19 },
  sectionHeader: { flexDirection: 'row', alignItems: 'stretch', marginTop: 27, marginBottom: 11 },
  sectionBar: { width: 4, minHeight: 38, borderRadius: 2, backgroundColor: GOV_COLORS.azulPrincipal, marginRight: 10 },
  sectionHeaderText: { flex: 1, justifyContent: 'center' },
  sectionTitle: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800' },
  sectionDescription: { color: GOV_COLORS.cinzaTexto, fontSize: 11, marginTop: 2 },
  listaContainer: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, overflow: 'hidden' },
  itemLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  itemLinhaUltimo: { borderBottomWidth: 0 },
  itemInformacao: { flex: 1 },
  itemRubrica: { color: GOV_COLORS.azulPrincipal, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  itemDesc: { color: GOV_COLORS.texto, fontSize: 13, fontWeight: '600', marginTop: 3 },
  itemValor: { color: GOV_COLORS.texto, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  itemValorDesconto: { color: GOV_COLORS.vermelho },
  listaVazia: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 16 },
  listaVaziaTexto: { flex: 1, color: GOV_COLORS.cinzaTexto, fontSize: 12 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: GOV_COLORS.azulClaro, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, padding: 13, marginTop: 22 },
  infoText: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 11, lineHeight: 17 },
  rodapeAcoes: { backgroundColor: GOV_COLORS.branco, borderTopWidth: 1, borderTopColor: GOV_COLORS.cinzaBorda, paddingHorizontal: 16, paddingVertical: 12 },
  rodapeAcoesConteudo: { width: '100%', maxWidth: 900, alignSelf: 'center', flexDirection: 'row', gap: 10 },
  btnPrincipal: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: GOV_COLORS.azulPrincipal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  btnSecundario: { flex: 1, minHeight: 46, borderRadius: 23, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  btnDesativado: { opacity: 0.65 },
  textoBtnPrincipal: { color: GOV_COLORS.branco, fontSize: 12, fontWeight: '800' },
  textoBtnSecundario: { color: GOV_COLORS.azulPrincipal, fontSize: 12, fontWeight: '800' },
  estadoCentralizado: { flex: 1, maxWidth: 600, width: '100%', alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 28 },
  estadoIcone: { width: 76, height: 76, borderRadius: 38, backgroundColor: GOV_COLORS.cinzaSuperficie, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  estadoTitulo: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800', textAlign: 'center', marginTop: 13 },
  estadoTexto: { color: GOV_COLORS.cinzaTexto, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
});