/**
 * Super App Gov — Módulo SDGP / Férias
 * Arquivo: src/app/sdgp/ferias.tsx
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import {
  CORES_PRIORIDADE,
  estiloStatus,
  prioridadeSegura,
  Prioridade,
} from '../../lib/workflow';
import PrioritySelector from '../../components/PrioritySelector';

const C = {
  azul: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  fundo: '#F8F8F8',
  superficie: '#F1F3F5',
  texto: '#1F2937',
  secundario: '#555A60',
  claro: '#9CA3AF',
  borda: '#D9DDE3',
  ouro: '#FFCD00',
  verde: '#168821',
  verdeFundo: '#E7F4E8',
  vermelho: '#B91C1C',
  vermelhoFundo: '#FDECEC',
};

const DIAS_ANUAIS = 30;
const OPCOES_DIAS = [10, 15, 20];

type Ferias = {
  id: string | number;
  protocolo?: string | null;
  data_inicio: string;
  data_fim: string;
  data_retorno: string;
  quantidade_dias: number;
  status: string;
  prioridade?: string | null;
  justificativa_gestor?: string | null;
  created_at?: string | null;
};

function calcularPeriodo(inicio: string, dias: number) {
  const [dia, mes, ano] = inicio.split('/').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataValida =
    Boolean(dia && mes && ano) &&
    !Number.isNaN(data.getTime()) &&
    data.getDate() === dia &&
    data.getMonth() === mes - 1 &&
    data.getFullYear() === ano;

  if (!dataValida) {
    return { erro: 'Informe uma data válida.', fim: '', retorno: '' };
  }

  if (data < hoje) {
    return {
      erro: 'Não é possível solicitar férias no passado.',
      fim: '',
      retorno: '',
    };
  }

  const fim = new Date(data);
  fim.setDate(data.getDate() + dias - 1);

  const retorno = new Date(fim);
  retorno.setDate(fim.getDate() + 1);

  return {
    erro: '',
    fim: fim.toLocaleDateString('pt-BR'),
    retorno: retorno.toLocaleDateString('pt-BR'),
  };
}

function normalizarStatus(valor: string) {
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function reservaSaldo(status: string) {
  const normalizado = normalizarStatus(status);
  return (
    !normalizado.includes('REJEIT') &&
    !normalizado.includes('CANCEL')
  );
}

export default function FeriasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const nome = String(params.nome || 'Servidor');
  const matricula = String(params.matricula || 'N/D');
  const uorg = String(params.uorg || 'Unidade não informada');
  const exercicioAtual = new Date().getFullYear();

  const [dataInicio, setDataInicio] = useState('');
  const [dias, setDias] = useState(15);
  const [isChefia, setIsChefia] = useState(false);
  const [prioridade, setPrioridade] =
    useState<Prioridade>('NORMAL');
  const [historico, setHistorico] = useState<Ferias[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const info = useMemo(
    () => calcularPeriodo(dataInicio, dias),
    [dataInicio, dias],
  );

  const saldoDisponivel = useMemo(() => {
    const comprometidos = historico
      .filter((item) => {
        const ano = Number(item.data_inicio?.split('/')[2]);
        return ano === exercicioAtual && reservaSaldo(item.status);
      })
      .reduce(
        (total, item) => total + Number(item.quantidade_dias || 0),
        0,
      );

    return Math.max(DIAS_ANUAIS - comprometidos, 0);
  }, [historico, exercicioAtual]);

  const saldoInsuficiente = dias > saldoDisponivel;
  const formularioValido =
    Boolean(dataInicio && info.fim) &&
    !info.erro &&
    !saldoInsuficiente &&
    !carregando;

  const carregar = useCallback(async () => {
    setCarregando(true);

    try {
      const { data, error } = await supabase
        .from('solicitacoes_ferias')
        .select('*')
        .eq('matricula', matricula)
        .order('id', { ascending: false });

      if (error) throw error;
      setHistorico((data || []) as Ferias[]);
    } catch (error) {
      console.error('Erro ao consultar férias:', error);
      Alert.alert(
        'Serviço indisponível',
        'Não foi possível consultar as solicitações de férias.',
      );
    } finally {
      setCarregando(false);
    }
  }, [matricula]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const mascararData = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 8);
    const partes = [
      numeros.slice(0, 2),
      numeros.slice(2, 4),
      numeros.slice(4, 8),
    ].filter(Boolean);

    setDataInicio(partes.join('/'));
  };

  const enviar = async () => {
    if (!formularioValido) {
      Alert.alert(
        'Revise a solicitação',
        saldoInsuficiente
          ? `O saldo estimado é de ${saldoDisponivel} dias.`
          : info.erro || 'Informe a data inicial.',
      );
      return;
    }

    try {
      setEnviando(true);

      const { data, error } = await supabase
        .from('solicitacoes_ferias')
        .insert([
          {
            matricula,
            nome_servidor: nome,
            uorg,
            data_inicio: dataInicio,
            data_fim: info.fim,
            data_retorno: info.retorno,
            quantidade_dias: dias,
            funcao_chefia: isChefia,
            prioridade,
            status: 'EM_ANALISE',
            atualizado_por_matricula: matricula,
            atualizado_por_nome: nome,
          },
        ])
        .select('protocolo')
        .single();

      if (error) throw error;

      setDataInicio('');
      setDias(15);
      setIsChefia(false);
      setPrioridade('NORMAL');
      await carregar();

      Alert.alert(
        'Solicitação protocolada',
        `Protocolo ${data?.protocolo || 'gerado'}. A unidade responsável poderá acompanhar a solicitação pela Central de Gestão.`,
      );
    } catch (error) {
      const mensagem =
        error instanceof Error
          ? error.message
          : 'Não foi possível protocolar a solicitação.';
      Alert.alert('Erro ao enviar', mensagem);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.branco} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.voltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons name="arrow-back" size={22} color={C.azul} />
        </TouchableOpacity>

        <View style={styles.marcaGroup}>
          <Text style={styles.marca}>
            gov<Text style={styles.marcaPonto}>.</Text>br
          </Text>
          <View style={styles.marcaDivisor} />
          <Text style={styles.headerModulo}>Gestão de Pessoas</Text>
        </View>

        <MaterialIcons name="account-circle" size={29} color={C.azul} />
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbLink}>SDGP</Text>
          <MaterialIcons name="chevron-right" size={14} color={C.claro} />
          <Text style={styles.breadcrumbAtual}>Férias e recessos</Text>
        </View>

        <View style={styles.pageHeading}>
          <Text style={styles.pageEyebrow}>VIDA FUNCIONAL</Text>
          <Text style={styles.pageTitle}>Gestão de férias</Text>
          <Text style={styles.pageSubtitle}>
            Programe períodos, protocole solicitações e acompanhe as decisões.
          </Text>
        </View>

        <View style={styles.saldo}>
          <View style={styles.saldoIcone}>
            <MaterialIcons name="event-available" size={25} color={C.azul} />
          </View>

          <View style={styles.saldoConteudo}>
            <Text style={styles.saldoLabel}>SALDO ESTIMADO</Text>
            <Text style={styles.saldoValor}>
              {carregando ? '—' : saldoDisponivel}{' '}
              <Text style={styles.saldoUnidade}>dias</Text>
            </Text>
            <Text style={styles.saldoMeta}>
              Exercício {exercicioAtual} • solicitações em análise reservam saldo
            </Text>
          </View>

          <View style={styles.saldoTag}>
            <Text style={styles.saldoTagTexto}>30 dias anuais</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <View>
            <Text style={styles.sectionTitle}>Nova programação</Text>
            <Text style={styles.sectionDescription}>
              Informe o período desejado para análise
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Data de início</Text>
          <TextInput
            style={[
              styles.input,
              Boolean(dataInicio && info.erro) && styles.inputErro,
            ]}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={C.claro}
            keyboardType="number-pad"
            maxLength={10}
            value={dataInicio}
            onChangeText={mascararData}
            accessibilityLabel="Data de início das férias"
          />

          {dataInicio && info.erro ? (
            <Text style={styles.erro}>{info.erro}</Text>
          ) : null}

          <Text style={styles.label}>Quantidade de dias</Text>
          <View style={styles.diasLinha}>
            {OPCOES_DIAS.map((valor) => {
              const indisponivel = valor > saldoDisponivel || carregando;
              const ativo = dias === valor;

              return (
                <TouchableOpacity
                  key={valor}
                  onPress={() => setDias(valor)}
                  disabled={indisponivel}
                  style={[
                    styles.dia,
                    ativo && styles.diaAtivo,
                    indisponivel && styles.diaIndisponivel,
                  ]}
                >
                  <Text
                    style={[
                      styles.diaTexto,
                      ativo && styles.diaTextoAtivo,
                      indisponivel && styles.diaTextoIndisponivel,
                    ]}
                  >
                    {valor} dias
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {saldoInsuficiente && !carregando ? (
            <View style={styles.avisoSaldo}>
              <MaterialIcons name="warning-amber" size={17} color={C.vermelho} />
              <Text style={styles.avisoSaldoTexto}>
                O período escolhido ultrapassa o saldo estimado.
              </Text>
            </View>
          ) : null}

          <Text style={styles.label}>Prioridade administrativa</Text>
          <PrioritySelector
            value={prioridade}
            onChange={setPrioridade}
            compact
          />

          {info.fim ? (
            <View style={styles.resumo}>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Início</Text>
                <Text style={styles.resumoValor}>{dataInicio}</Text>
              </View>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Último dia</Text>
                <Text style={styles.resumoValor}>{info.fim}</Text>
              </View>
              <View style={styles.resumoLinha}>
                <Text style={styles.resumoLabel}>Retorno previsto</Text>
                <Text style={[styles.resumoValor, styles.retornoValor]}>
                  {info.retorno}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.switchLinha}>
            <View style={styles.switchTexto}>
              <Text style={styles.switchTitulo}>Exerce função de chefia</Text>
              <Text style={styles.switchSub}>
                A unidade verificará a necessidade de substituição temporária.
              </Text>
            </View>
            <Switch
              value={isChefia}
              onValueChange={setIsChefia}
              trackColor={{ false: C.borda, true: C.azul }}
              thumbColor={C.branco}
            />
          </View>

          <View style={styles.legal}>
            <MaterialIcons name="gavel" size={18} color={C.azul} />
            <Text style={styles.legalTexto}>
              A solicitação está sujeita à conveniência administrativa,
              disponibilidade da unidade e decisão da chefia competente.
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.enviar,
              (!formularioValido || enviando) && styles.enviarDesativado,
            ]}
            onPress={enviar}
            disabled={!formularioValido || enviando}
          >
            {enviando ? (
              <ActivityIndicator color={C.branco} />
            ) : (
              <>
                <MaterialIcons name="send" size={18} color={C.branco} />
                <Text style={styles.enviarTexto}>Protocolar solicitação</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />
          <View>
            <Text style={styles.sectionTitle}>Minhas solicitações</Text>
            <Text style={styles.sectionDescription}>
              Histórico de protocolos e decisões
            </Text>
          </View>
        </View>

        {carregando ? (
          <View style={styles.carregandoHistorico}>
            <ActivityIndicator color={C.azul} />
            <Text style={styles.carregandoTexto}>Consultando solicitações...</Text>
          </View>
        ) : historico.length === 0 ? (
          <View style={styles.vazio}>
            <MaterialIcons name="inbox" size={38} color={C.claro} />
            <Text style={styles.vazioTitulo}>Nenhuma solicitação registrada</Text>
            <Text style={styles.vazioTexto}>
              Os protocolos enviados aparecerão nesta área.
            </Text>
          </View>
        ) : (
          historico.map((item) => {
            const status = estiloStatus(item.status);
            const pri =
              CORES_PRIORIDADE[prioridadeSegura(item.prioridade)];

            return (
              <View key={String(item.id)} style={styles.historico}>
                <View style={styles.historicoTopo}>
                  <View>
                    <Text style={styles.protocoloLabel}>PROTOCOLO</Text>
                    <Text style={styles.protocolo}>
                      {item.protocolo || `FER-${item.id}`}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: status.fundo },
                    ]}
                  >
                    <Text style={[styles.tagTexto, { color: status.texto }]}>
                      {status.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.periodoLinha}>
                  <MaterialIcons name="date-range" size={19} color={C.azul} />
                  <View style={styles.periodoTexto}>
                    <Text style={styles.periodo}>
                      {item.data_inicio} a {item.data_fim}
                    </Text>
                    <Text style={styles.historicoMeta}>
                      {item.quantidade_dias} dias • retorno {item.data_retorno}
                    </Text>
                  </View>
                </View>

                <View style={styles.historicoRodape}>
                  <Text style={styles.prioridadeLabel}>Prioridade</Text>
                  <View
                    style={[
                      styles.tag,
                      { backgroundColor: pri.fundo },
                    ]}
                  >
                    <Text style={[styles.tagTexto, { color: pri.texto }]}>
                      {pri.label}
                    </Text>
                  </View>
                </View>

                {item.justificativa_gestor ? (
                  <View style={styles.despacho}>
                    <MaterialIcons name="assignment" size={17} color={C.azul} />
                    <View style={styles.despachoTexto}>
                      <Text style={styles.despachoLabel}>DESPACHO</Text>
                      <Text style={styles.despachoConteudo}>
                        {item.justificativa_gestor}
                      </Text>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <View style={styles.infoFinal}>
          <MaterialIcons name="info-outline" size={19} color={C.azul} />
          <Text style={styles.infoFinalTexto}>
            O saldo é uma estimativa calculada a partir dos protocolos deste
            exercício. Confirme o saldo oficial com a Gestão de Pessoas.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo },
  header: { minHeight: 66, backgroundColor: C.branco, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.borda, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  voltar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  marcaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  marca: { color: C.azulEscuro, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  marcaPonto: { color: C.ouro },
  marcaDivisor: { width: 1, height: 25, backgroundColor: C.borda, marginHorizontal: 12 },
  headerModulo: { flex: 1, color: C.azulEscuro, fontSize: 13, fontWeight: '700' },
  conteudo: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  breadcrumbLink: { color: C.azul, fontSize: 11, marginHorizontal: 3 },
  breadcrumbAtual: { color: C.secundario, fontSize: 11, fontWeight: '700', marginHorizontal: 3 },
  pageHeading: { paddingBottom: 18, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: C.borda },
  pageEyebrow: { color: C.azul, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  pageTitle: { color: C.azulEscuro, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { color: C.secundario, fontSize: 13, lineHeight: 20, marginTop: 7 },
  saldo: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderLeftWidth: 4, borderLeftColor: C.azul, borderRadius: 6, padding: 15, marginBottom: 4 },
  saldoIcone: { width: 45, height: 45, borderRadius: 23, backgroundColor: C.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  saldoConteudo: { flex: 1 },
  saldoLabel: { color: C.azul, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  saldoValor: { color: C.azulEscuro, fontSize: 25, fontWeight: '900', marginTop: 2 },
  saldoUnidade: { fontSize: 14, fontWeight: '700' },
  saldoMeta: { color: C.secundario, fontSize: 9, lineHeight: 14, marginTop: 2 },
  saldoTag: { backgroundColor: C.superficie, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8 },
  saldoTagTexto: { color: C.secundario, fontSize: 9, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', alignItems: 'stretch', marginTop: 27, marginBottom: 11 },
  sectionBar: { width: 4, minHeight: 38, borderRadius: 2, backgroundColor: C.azul, marginRight: 10 },
  sectionTitle: { color: C.azulEscuro, fontSize: 17, fontWeight: '800' },
  sectionDescription: { color: C.secundario, fontSize: 11, marginTop: 2 },
  card: { backgroundColor: C.branco, borderRadius: 6, borderWidth: 1, borderColor: C.borda, padding: 16 },
  label: { color: C.texto, fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  input: { height: 48, borderWidth: 1, borderColor: C.borda, borderRadius: 6, paddingHorizontal: 12, color: C.texto, fontSize: 14, marginBottom: 15, backgroundColor: C.branco },
  inputErro: { borderColor: C.vermelho },
  erro: { color: C.vermelho, fontSize: 10, marginTop: -10, marginBottom: 13 },
  diasLinha: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  dia: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.azul, borderRadius: 21, paddingHorizontal: 8 },
  diaAtivo: { backgroundColor: C.azul },
  diaIndisponivel: { borderColor: C.borda, backgroundColor: C.superficie },
  diaTexto: { color: C.azul, fontSize: 11, fontWeight: '800' },
  diaTextoAtivo: { color: C.branco },
  diaTextoIndisponivel: { color: C.claro },
  avisoSaldo: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: C.vermelhoFundo, borderLeftWidth: 3, borderLeftColor: C.vermelho, padding: 10, marginBottom: 14 },
  avisoSaldoTexto: { flex: 1, color: C.vermelho, fontSize: 10, lineHeight: 15 },
  resumo: { backgroundColor: C.azulClaro, borderLeftWidth: 4, borderLeftColor: C.azul, padding: 13, marginTop: 16 },
  resumoLinha: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginVertical: 4 },
  resumoLabel: { color: C.secundario, fontSize: 11 },
  resumoValor: { color: C.azulEscuro, fontSize: 11, fontWeight: '900' },
  retornoValor: { color: C.verde },
  switchLinha: { flexDirection: 'row', alignItems: 'center', marginTop: 17, paddingVertical: 4 },
  switchTexto: { flex: 1, paddingRight: 12 },
  switchTitulo: { color: C.texto, fontSize: 12, fontWeight: '800' },
  switchSub: { color: C.secundario, fontSize: 10, lineHeight: 15, marginTop: 2 },
  legal: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.superficie, borderLeftWidth: 4, borderLeftColor: C.azul, padding: 12, marginTop: 15 },
  legalTexto: { flex: 1, color: C.secundario, fontSize: 10, lineHeight: 16 },
  enviar: { minHeight: 48, borderRadius: 24, backgroundColor: C.azul, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 17, paddingHorizontal: 18 },
  enviarDesativado: { opacity: 0.5 },
  enviarTexto: { color: C.branco, fontSize: 13, fontWeight: '800' },
  carregandoHistorico: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 6, padding: 24 },
  carregandoTexto: { color: C.secundario, fontSize: 11 },
  vazio: { alignItems: 'center', backgroundColor: C.branco, borderWidth: 1, borderStyle: 'dashed', borderColor: C.borda, borderRadius: 6, padding: 28 },
  vazioTitulo: { color: C.azulEscuro, fontSize: 14, fontWeight: '800', marginTop: 10 },
  vazioTexto: { color: C.secundario, fontSize: 11, marginTop: 4, textAlign: 'center' },
  historico: { backgroundColor: C.branco, borderRadius: 6, borderWidth: 1, borderColor: C.borda, padding: 15, marginBottom: 10 },
  historicoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  protocoloLabel: { color: C.secundario, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  protocolo: { color: C.azul, fontSize: 11, fontWeight: '900', marginTop: 2 },
  tag: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12 },
  tagTexto: { fontSize: 9, fontWeight: '900' },
  periodoLinha: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 13, marginTop: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.borda },
  periodoTexto: { flex: 1 },
  periodo: { color: C.texto, fontSize: 14, fontWeight: '800' },
  historicoMeta: { color: C.secundario, fontSize: 10, marginTop: 3 },
  historicoRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 11 },
  prioridadeLabel: { color: C.secundario, fontSize: 10, fontWeight: '700' },
  despacho: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.azulClaro, borderLeftWidth: 3, borderLeftColor: C.azul, padding: 10, marginTop: 12 },
  despachoTexto: { flex: 1 },
  despachoLabel: { color: C.azul, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  despachoConteudo: { color: C.azulEscuro, fontSize: 10, lineHeight: 15, marginTop: 3 },
  infoFinal: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: C.azulClaro, borderLeftWidth: 4, borderLeftColor: C.azul, padding: 13, marginTop: 12 },
  infoFinalTexto: { flex: 1, color: C.azulEscuro, fontSize: 11, lineHeight: 17 },
});
