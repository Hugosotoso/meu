/**
 * Super App Gov — Logística / Gestão de Frota
 * Ficheiro: src/app/logistica/frota.tsx
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { supabase } from '../../lib/supabase';
import FrotaMap from '../../components/FrotaMap';
import PrioritySelector from '../../components/PrioritySelector';

import {
  CORES_PRIORIDADE,
  prioridadeSegura,
  Prioridade,
} from '../../lib/workflow';

const G_COLORS = {
  azulPrincipal: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  cinzaFundo: '#F4F6F8',
  cinzaClaro: '#F8FAFC',
  textoPreto: '#1F2937',
  cinzaTexto: '#64748B',
  ouro: '#FFCD00',
  cinzaBorda: '#E2E8F0',
  verde: '#168821',
  laranja: '#F59E0B',
  vermelho: '#DC2626',
};

type AbaFrota = 'nova' | 'historico';

type FiltroStatus =
  | 'TODOS'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REJEITADO';

type FiltroPrioridade = 'TODAS' | Prioridade;

type ParametrosFrota = {
  nome?: string;
  matricula?: string;
  uorg?: string;
  cargo?: string;
  cpf?: string;
  aba?: string;
  filtroStatus?: string;
};

type LocalizacaoMapa = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

type SolicitacaoFrota = {
  id: number | string;
  protocolo?: string | null;
  matricula?: string | null;
  nome_servidor?: string | null;
  destino?: string | null;
  data_ida?: string | null;
  motivo?: string | null;
  status?: string | null;
  prioridade?: string | null;
  lat_partida?: number | null;
  lng_partida?: number | null;
};

const OPCOES_STATUS: Array<{
  value: FiltroStatus;
  label: string;
  cor: string;
}> = [
  {
    value: 'TODOS',
    label: 'Todos',
    cor: G_COLORS.azulPrincipal,
  },
  {
    value: 'EM_ANALISE',
    label: 'Em análise',
    cor: G_COLORS.laranja,
  },
  {
    value: 'APROVADO',
    label: 'Aprovados',
    cor: G_COLORS.verde,
  },
  {
    value: 'REJEITADO',
    label: 'Rejeitados',
    cor: G_COLORS.vermelho,
  },
];

function obterParametro(valor?: string | string[]): string {
  if (Array.isArray(valor)) {
    return valor[0] || '';
  }

  return valor || '';
}

function normalizarTexto(valor?: string | null): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function classificarStatus(status?: string | null): FiltroStatus {
  const valor = normalizarTexto(status);

  if (valor.includes('aprov')) {
    return 'APROVADO';
  }

  if (valor.includes('rejeit') || valor.includes('negad')) {
    return 'REJEITADO';
  }

  if (
    valor.includes('analise') ||
    valor.includes('pendente') ||
    valor.includes('aguard')
  ) {
    return 'EM_ANALISE';
  }

  return 'TODOS';
}

function normalizarFiltroStatus(valor: string): FiltroStatus {
  if (
    valor === 'EM_ANALISE' ||
    valor === 'APROVADO' ||
    valor === 'REJEITADO'
  ) {
    return valor;
  }

  return 'TODOS';
}

function obterVisualStatus(status?: string | null) {
  const classificacao = classificarStatus(status);

  if (classificacao === 'APROVADO') {
    return {
      texto: status || 'Aprovado',
      cor: G_COLORS.verde,
      fundo: '#EAF7EC',
    };
  }

  if (classificacao === 'REJEITADO') {
    return {
      texto: status || 'Rejeitado',
      cor: G_COLORS.vermelho,
      fundo: '#FDECEC',
    };
  }

  return {
    texto: status || 'Em análise',
    cor: G_COLORS.laranja,
    fundo: '#FFF7E6',
  };
}

function formatarEntradaData(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8);

  if (numeros.length <= 2) {
    return numeros;
  }

  if (numeros.length <= 4) {
    return `${numeros.slice(0, 2)}/${numeros.slice(2)}`;
  }

  return `${numeros.slice(0, 2)}/${numeros.slice(
    2,
    4,
  )}/${numeros.slice(4)}`;
}

function validarData(dataTexto: string): {
  dataIso?: string;
  erro?: string;
} {
  const resultado = dataTexto.match(
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
  );

  if (!resultado) {
    return {
      erro: 'Informe a data no formato DD/MM/AAAA.',
    };
  }

  const dia = Number(resultado[1]);
  const mes = Number(resultado[2]);
  const ano = Number(resultado[3]);

  const dataInformada = new Date(ano, mes - 1, dia, 12, 0, 0);

  const dataExiste =
    dataInformada.getFullYear() === ano &&
    dataInformada.getMonth() === mes - 1 &&
    dataInformada.getDate() === dia;

  if (!dataExiste) {
    return {
      erro: 'A data informada não existe.',
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataComparacao = new Date(ano, mes - 1, dia);
  dataComparacao.setHours(0, 0, 0, 0);

  if (dataComparacao < hoje) {
    return {
      erro: 'A data da viagem não pode estar no passado.',
    };
  }

  const mesIso = String(mes).padStart(2, '0');
  const diaIso = String(dia).padStart(2, '0');

  return {
    dataIso: `${ano}-${mesIso}-${diaIso}`,
  };
}

function formatarDataExibicao(data?: string | null): string {
  if (!data) {
    return 'Data não informada';
  }

  const valor = String(data).trim();

  const dataIso = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dataIso) {
    return `${dataIso[3]}/${dataIso[2]}/${dataIso[1]}`;
  }

  return valor;
}

export default function FrotaScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams<ParametrosFrota>();

  const nome = obterParametro(parametros.nome);
  const matricula = obterParametro(parametros.matricula);
  const uorg = obterParametro(parametros.uorg);

  const abaRecebida = obterParametro(parametros.aba);
  const filtroRecebido = obterParametro(parametros.filtroStatus);

  const [abaAtiva, setAbaAtiva] = useState<AbaFrota>(
    abaRecebida === 'historico' ? 'historico' : 'nova',
  );

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>(
    normalizarFiltroStatus(filtroRecebido),
  );

  const [filtroPrioridade, setFiltroPrioridade] =
    useState<FiltroPrioridade>('TODAS');

  const [busca, setBusca] = useState('');

  const [destino, setDestino] = useState('');
  const [dataIda, setDataIda] = useState('');
  const [motivo, setMotivo] = useState('');
  const [prioridade, setPrioridade] =
    useState<Prioridade>('NORMAL');

  const [enviando, setEnviando] = useState(false);

  const [localizacao, setLocalizacao] =
    useState<LocalizacaoMapa | null>(null);

  const [buscandoLocalizacao, setBuscandoLocalizacao] =
    useState(false);

  const [historico, setHistorico] = useState<
    SolicitacaoFrota[]
  >([]);

  const [carregandoHistorico, setCarregandoHistorico] =
    useState(true);

  const [atualizandoHistorico, setAtualizandoHistorico] =
    useState(false);

  const [erroHistorico, setErroHistorico] = useState('');

  useEffect(() => {
    if (abaRecebida === 'historico') {
      setAbaAtiva('historico');
    }

    if (abaRecebida === 'nova') {
      setAbaAtiva('nova');
    }

    setFiltroStatus(normalizarFiltroStatus(filtroRecebido));
  }, [abaRecebida, filtroRecebido]);

  const buscarHistorico = useCallback(
    async (atualizacaoManual = false) => {
      if (!matricula) {
        setErroHistorico(
          'Matrícula não informada. Abra a Frota pela tela de Logística.',
        );
        setCarregandoHistorico(false);
        setAtualizandoHistorico(false);
        return;
      }

      if (atualizacaoManual) {
        setAtualizandoHistorico(true);
      } else {
        setCarregandoHistorico(true);
      }

      setErroHistorico('');

      try {
        const { data, error } = await supabase
          .from('solicitacoes_frota')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false });

        if (error) {
          throw error;
        }

        setHistorico((data || []) as SolicitacaoFrota[]);
      } catch (error) {
        console.error('Erro ao buscar histórico:', error);

        setErroHistorico(
          'Não foi possível consultar as solicitações.',
        );
      } finally {
        setCarregandoHistorico(false);
        setAtualizandoHistorico(false);
      }
    },
    [matricula],
  );

  useEffect(() => {
    buscarHistorico();
  }, [buscarHistorico]);

  const prioridadesDisponiveis = useMemo(() => {
    const prioridades = new Set<Prioridade>();

    historico.forEach((item) => {
      prioridades.add(prioridadeSegura(item.prioridade));
    });

    return Array.from(prioridades);
  }, [historico]);

  const historicoFiltrado = useMemo(() => {
    const termoBusca = normalizarTexto(busca);

    return historico.filter((item) => {
      const statusItem = classificarStatus(item.status);
      const prioridadeItem = prioridadeSegura(item.prioridade);

      const correspondeStatus =
        filtroStatus === 'TODOS' ||
        statusItem === filtroStatus;

      const correspondePrioridade =
        filtroPrioridade === 'TODAS' ||
        prioridadeItem === filtroPrioridade;

      const textoPesquisavel = normalizarTexto(
        [
          item.protocolo,
          item.destino,
          item.motivo,
          item.status,
        ].join(' '),
      );

      const correspondeBusca =
        !termoBusca || textoPesquisavel.includes(termoBusca);

      return (
        correspondeStatus &&
        correspondePrioridade &&
        correspondeBusca
      );
    });
  }, [
    historico,
    filtroStatus,
    filtroPrioridade,
    busca,
  ]);

  const totalEmAnalise = useMemo(() => {
    return historico.filter(
      (item) => classificarStatus(item.status) === 'EM_ANALISE',
    ).length;
  }, [historico]);

  const solicitarLocalizacao = async () => {
    if (buscandoLocalizacao) {
      return;
    }

    setBuscandoLocalizacao(true);

    try {
      const permissao =
        await Location.requestForegroundPermissionsAsync();

      if (permissao.status !== 'granted') {
        Alert.alert(
          'Localização não autorizada',
          'Você pode continuar a solicitação sem informar o GPS.',
        );
        return;
      }

      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLocalizacao({
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    } catch (error) {
      console.error('Erro ao buscar GPS:', error);

      Alert.alert(
        'GPS indisponível',
        'Não foi possível obter sua localização. Você ainda pode registrar a solicitação.',
      );
    } finally {
      setBuscandoLocalizacao(false);
    }
  };

  const limparFormulario = () => {
    setDestino('');
    setDataIda('');
    setMotivo('');
    setPrioridade('NORMAL');
  };

  const handleSolicitar = async () => {
    if (enviando) {
      return;
    }

    const destinoFinal = destino.trim();
    const motivoFinal = motivo.trim();

    if (!destinoFinal || !dataIda || !motivoFinal) {
      Alert.alert(
        'Campos obrigatórios',
        'Preencha destino, data e justificativa.',
      );
      return;
    }

    if (destinoFinal.length < 3) {
      Alert.alert(
        'Destino inválido',
        'Informe um destino mais detalhado.',
      );
      return;
    }

    if (motivoFinal.length < 5) {
      Alert.alert(
        'Justificativa incompleta',
        'Explique brevemente a finalidade da viagem.',
      );
      return;
    }

    if (!matricula) {
      Alert.alert(
        'Identificação ausente',
        'Não foi possível identificar a matrícula do solicitante.',
      );
      return;
    }

    const validacaoData = validarData(dataIda);

    if (!validacaoData.dataIso) {
      Alert.alert(
        'Data inválida',
        validacaoData.erro || 'Verifique a data informada.',
      );
      return;
    }

    setEnviando(true);

    try {
      const { data, error } = await supabase
        .from('solicitacoes_frota')
        .insert([
          {
            matricula,
            nome_servidor: nome || 'Servidor',
            destino: destinoFinal,
            data_ida: validacaoData.dataIso,
            motivo: motivoFinal,
            status: 'Em Análise',
            lat_partida: localizacao?.latitude || null,
            lng_partida: localizacao?.longitude || null,
            prioridade,
            atualizado_por_matricula: matricula,
            atualizado_por_nome: nome || 'Servidor',
          },
        ])
        .select('id, protocolo')
        .single();

      if (error) {
        throw error;
      }

      const protocolo =
        data?.protocolo || `FRO-${data?.id || 'NOVO'}`;

      limparFormulario();

      await buscarHistorico(true);

      setFiltroStatus('TODOS');
      setFiltroPrioridade('TODAS');
      setBusca('');
      setAbaAtiva('historico');

      Alert.alert(
        'Solicitação protocolada',
        `Protocolo ${protocolo}. A Central de Gestão já pode analisar a viagem.`,
      );
    } catch (error) {
      console.error(
        'Erro ao salvar solicitação no Supabase:',
        error,
      );

      Alert.alert(
        'Solicitação não enviada',
        'Não foi possível registrar o pedido. Verifique sua conexão e tente novamente.',
      );
    } finally {
      setEnviando(false);
    }
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltroStatus('TODOS');
    setFiltroPrioridade('TODAS');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={G_COLORS.azulPrincipal}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={G_COLORS.branco}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>LOGÍSTICA</Text>
          <Text style={styles.headerTitle}>Gestão de Frota</Text>
        </View>

        <View style={styles.headerButton}>
          <MaterialIcons
            name="directions-car"
            size={25}
            color={G_COLORS.branco}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            abaAtiva === 'historico' ? (
              <RefreshControl
                refreshing={atualizandoHistorico}
                onRefresh={() => buscarHistorico(true)}
                colors={[G_COLORS.azulPrincipal]}
                tintColor={G_COLORS.azulPrincipal}
              />
            ) : undefined
          }
        >
          <View style={styles.contentWrapper}>
            <View style={styles.breadcrumb}>
              <MaterialIcons
                name="home"
                size={14}
                color={G_COLORS.cinzaTexto}
              />

              <Text style={styles.breadcrumbText}>
                Logística / Gestão de Frota
              </Text>
            </View>

            <View style={styles.identificacaoCard}>
              <View style={styles.identificacaoIcone}>
                <MaterialIcons
                  name="person"
                  size={23}
                  color={G_COLORS.azulPrincipal}
                />
              </View>

              <View style={styles.identificacaoTexto}>
                <Text style={styles.identificacaoLabel}>
                  SOLICITANTE VINCULADO
                </Text>

                <Text style={styles.identificacaoNome}>
                  {nome || 'Servidor Público'}
                </Text>

                <View style={styles.identificacaoDetalhes}>
                  <MaterialIcons
                    name="badge"
                    size={14}
                    color={G_COLORS.cinzaTexto}
                  />

                  <Text style={styles.identificacaoDetalheTexto}>
                    {matricula || 'Matrícula não informada'}
                  </Text>

                  <View style={styles.detalheSeparador} />

                  <MaterialIcons
                    name="business"
                    size={14}
                    color={G_COLORS.cinzaTexto}
                  />

                  <Text
                    style={styles.identificacaoUnidade}
                    numberOfLines={1}
                  >
                    {uorg || 'Unidade não informada'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.tabsContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  abaAtiva === 'nova' && styles.tabButtonAtivo,
                ]}
                onPress={() => setAbaAtiva('nova')}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name="add-circle-outline"
                  size={20}
                  color={
                    abaAtiva === 'nova'
                      ? G_COLORS.azulPrincipal
                      : G_COLORS.cinzaTexto
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    abaAtiva === 'nova' && styles.tabTextAtivo,
                  ]}
                >
                  Nova solicitação
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.tabButton,
                  abaAtiva === 'historico' &&
                    styles.tabButtonAtivo,
                ]}
                onPress={() => setAbaAtiva('historico')}
                activeOpacity={0.75}
              >
                <MaterialIcons
                  name="history"
                  size={20}
                  color={
                    abaAtiva === 'historico'
                      ? G_COLORS.azulPrincipal
                      : G_COLORS.cinzaTexto
                  }
                />

                <Text
                  style={[
                    styles.tabText,
                    abaAtiva === 'historico' &&
                      styles.tabTextAtivo,
                  ]}
                >
                  Acompanhamento
                </Text>

                {totalEmAnalise > 0 ? (
                  <View style={styles.tabContador}>
                    <Text style={styles.tabContadorTexto}>
                      {totalEmAnalise}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {abaAtiva === 'nova' ? (
              <>
                <View style={styles.orientacaoCard}>
                  <MaterialIcons
                    name="info-outline"
                    size={21}
                    color={G_COLORS.azulPrincipal}
                  />

                  <Text style={styles.orientacaoText}>
                    Informe os dados da viagem oficial. O pedido
                    receberá um protocolo para acompanhamento.
                  </Text>
                </View>

                <Text style={styles.sectionTitle}>
                  Ponto de embarque
                </Text>

                <View style={styles.mapaCard}>
                  <FrotaMap localizacao={localizacao} />

                  <View style={styles.localizacaoRodape}>
                    <View style={styles.localizacaoStatus}>
                      <MaterialIcons
                        name={
                          localizacao
                            ? 'my-location'
                            : 'location-off'
                        }
                        size={18}
                        color={
                          localizacao
                            ? G_COLORS.verde
                            : G_COLORS.cinzaTexto
                        }
                      />

                      <View style={styles.localizacaoTexto}>
                        <Text style={styles.localizacaoTitulo}>
                          {localizacao
                            ? 'Localização registrada'
                            : 'Localização não informada'}
                        </Text>

                        <Text style={styles.localizacaoDescricao}>
                          {localizacao
                            ? 'O ponto de partida será enviado com o pedido.'
                            : 'O GPS é opcional para registrar a solicitação.'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.localizacaoButton}
                      onPress={solicitarLocalizacao}
                      disabled={buscandoLocalizacao}
                    >
                      {buscandoLocalizacao ? (
                        <ActivityIndicator
                          size="small"
                          color={G_COLORS.azulPrincipal}
                        />
                      ) : (
                        <>
                          <MaterialIcons
                            name="gps-fixed"
                            size={17}
                            color={G_COLORS.azulPrincipal}
                          />

                          <Text
                            style={styles.localizacaoButtonText}
                          >
                            {localizacao
                              ? 'Atualizar'
                              : 'Usar GPS'}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.sectionTitle}>
                  Dados da solicitação
                </Text>

                <View style={styles.formCard}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Destino da viagem
                    </Text>

                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="place"
                        size={20}
                        color={G_COLORS.azulPrincipal}
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="Ex.: Cruzeiro do Sul - AC"
                        placeholderTextColor="#94A3B8"
                        value={destino}
                        onChangeText={setDestino}
                        maxLength={120}
                        returnKeyType="next"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Prioridade administrativa
                    </Text>

                    <PrioritySelector
                      value={prioridade}
                      onChange={setPrioridade}
                      compact
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Data da viagem
                    </Text>

                    <View style={styles.inputContainer}>
                      <MaterialIcons
                        name="event"
                        size={20}
                        color={G_COLORS.azulPrincipal}
                        style={styles.inputIcon}
                      />

                      <TextInput
                        style={styles.input}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor="#94A3B8"
                        value={dataIda}
                        onChangeText={(valor) =>
                          setDataIda(formatarEntradaData(valor))
                        }
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>

                    <Text style={styles.inputHint}>
                      Informe uma data de hoje em diante.
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>
                      Motivo ou justificativa
                    </Text>

                    <View
                      style={[
                        styles.inputContainer,
                        styles.textAreaContainer,
                      ]}
                    >
                      <MaterialIcons
                        name="edit-note"
                        size={21}
                        color={G_COLORS.azulPrincipal}
                        style={styles.textAreaIcon}
                      />

                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Descreva a finalidade oficial da viagem"
                        placeholderTextColor="#94A3B8"
                        value={motivo}
                        onChangeText={setMotivo}
                        multiline
                        textAlignVertical="top"
                        maxLength={500}
                      />
                    </View>

                    <Text style={styles.characterCounter}>
                      {motivo.length}/500
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.btnPrincipal,
                      enviando && styles.btnPrincipalDesabilitado,
                    ]}
                    onPress={handleSolicitar}
                    disabled={enviando}
                    activeOpacity={0.8}
                  >
                    {enviando ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={G_COLORS.branco}
                        />

                        <Text style={styles.textoBtnPrincipal}>
                          Protocolando...
                        </Text>
                      </>
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="car-connected"
                          size={22}
                          color={G_COLORS.branco}
                        />

                        <Text style={styles.textoBtnPrincipal}>
                          Protocolar solicitação
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.formSecurity}>
                    <MaterialIcons
                      name="verified-user"
                      size={15}
                      color={G_COLORS.cinzaTexto}
                    />

                    <Text style={styles.formSecurityText}>
                      A solicitação será vinculada à sua matrícula.
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.historySectionHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      Meus pedidos
                    </Text>

                    <Text style={styles.sectionSubtitle}>
                      {historicoFiltrado.length}{' '}
                      {historicoFiltrado.length === 1
                        ? 'solicitação encontrada'
                        : 'solicitações encontradas'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={() => buscarHistorico(true)}
                    disabled={
                      carregandoHistorico ||
                      atualizandoHistorico
                    }
                  >
                    {atualizandoHistorico ? (
                      <ActivityIndicator
                        size="small"
                        color={G_COLORS.azulPrincipal}
                      />
                    ) : (
                      <MaterialIcons
                        name="refresh"
                        size={21}
                        color={G_COLORS.azulPrincipal}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.filtrosCard}>
                  <View style={styles.searchContainer}>
                    <MaterialIcons
                      name="search"
                      size={20}
                      color={G_COLORS.cinzaTexto}
                    />

                    <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar destino ou protocolo"
                      placeholderTextColor="#94A3B8"
                      value={busca}
                      onChangeText={setBusca}
                      returnKeyType="search"
                    />

                    {busca ? (
                      <TouchableOpacity
                        onPress={() => setBusca('')}
                        style={styles.clearSearchButton}
                      >
                        <MaterialIcons
                          name="close"
                          size={19}
                          color={G_COLORS.cinzaTexto}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.filtroLabel}>
                    Situação
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtrosLinha}
                  >
                    {OPCOES_STATUS.map((opcao) => {
                      const selecionado =
                        filtroStatus === opcao.value;

                      return (
                        <TouchableOpacity
                          key={opcao.value}
                          style={[
                            styles.filtroChip,
                            selecionado && {
                              backgroundColor: `${opcao.cor}15`,
                              borderColor: opcao.cor,
                            },
                          ]}
                          onPress={() =>
                            setFiltroStatus(opcao.value)
                          }
                        >
                          <Text
                            style={[
                              styles.filtroChipText,
                              selecionado && {
                                color: opcao.cor,
                              },
                            ]}
                          >
                            {opcao.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {prioridadesDisponiveis.length > 0 ? (
                    <>
                      <Text style={styles.filtroLabel}>
                        Prioridade
                      </Text>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.filtrosLinha}
                      >
                        <TouchableOpacity
                          style={[
                            styles.filtroChip,
                            filtroPrioridade === 'TODAS' &&
                              styles.filtroChipSelecionado,
                          ]}
                          onPress={() =>
                            setFiltroPrioridade('TODAS')
                          }
                        >
                          <Text
                            style={[
                              styles.filtroChipText,
                              filtroPrioridade === 'TODAS' &&
                                styles.filtroChipTextSelecionado,
                            ]}
                          >
                            Todas
                          </Text>
                        </TouchableOpacity>

                        {prioridadesDisponiveis.map(
                          (prioridadeItem) => {
                            const visual =
                              CORES_PRIORIDADE[prioridadeItem];

                            const selecionado =
                              filtroPrioridade === prioridadeItem;

                            return (
                              <TouchableOpacity
                                key={prioridadeItem}
                                style={[
                                  styles.filtroChip,
                                  selecionado && {
                                    backgroundColor: visual.fundo,
                                    borderColor: visual.texto,
                                  },
                                ]}
                                onPress={() =>
                                  setFiltroPrioridade(
                                    prioridadeItem,
                                  )
                                }
                              >
                                <Text
                                  style={[
                                    styles.filtroChipText,
                                    selecionado && {
                                      color: visual.texto,
                                    },
                                  ]}
                                >
                                  {visual.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          },
                        )}
                      </ScrollView>
                    </>
                  ) : null}
                </View>

                {erroHistorico ? (
                  <View style={styles.errorCard}>
                    <MaterialIcons
                      name="error-outline"
                      size={22}
                      color={G_COLORS.vermelho}
                    />

                    <View style={styles.errorTextContainer}>
                      <Text style={styles.errorTitle}>
                        Histórico indisponível
                      </Text>

                      <Text style={styles.errorText}>
                        {erroHistorico}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => buscarHistorico(true)}
                    >
                      <Text style={styles.errorRetryText}>
                        Tentar novamente
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {carregandoHistorico ? (
                  <View style={styles.loadingCard}>
                    <ActivityIndicator
                      size="large"
                      color={G_COLORS.azulPrincipal}
                    />

                    <Text style={styles.loadingText}>
                      Consultando solicitações...
                    </Text>
                  </View>
                ) : historicoFiltrado.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View style={styles.emptyIcon}>
                      <MaterialIcons
                        name="inbox"
                        size={34}
                        color={G_COLORS.cinzaTexto}
                      />
                    </View>

                    <Text style={styles.emptyTitle}>
                      Nenhuma solicitação encontrada
                    </Text>

                    <Text style={styles.emptyText}>
                      Altere os filtros ou registre uma nova
                      solicitação.
                    </Text>

                    {(busca ||
                      filtroStatus !== 'TODOS' ||
                      filtroPrioridade !== 'TODAS') && (
                      <TouchableOpacity
                        style={styles.clearFiltersButton}
                        onPress={limparFiltros}
                      >
                        <Text style={styles.clearFiltersText}>
                          Limpar filtros
                        </Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.emptyActionButton}
                      onPress={() => setAbaAtiva('nova')}
                    >
                      <MaterialIcons
                        name="add"
                        size={18}
                        color={G_COLORS.branco}
                      />

                      <Text style={styles.emptyActionText}>
                        Nova solicitação
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.historyList}>
                    {historicoFiltrado.map((item, index) => {
                      const statusVisual = obterVisualStatus(
                        item.status,
                      );

                      const prioridadeItem = prioridadeSegura(
                        item.prioridade,
                      );

                      const prioridadeVisual =
                        CORES_PRIORIDADE[prioridadeItem];

                      return (
                        <View
                          key={String(
                            item.id ||
                              item.protocolo ||
                              index,
                          )}
                          style={styles.historyCard}
                        >
                          <View style={styles.historyHeader}>
                            <View style={styles.historyHeaderText}>
                              <Text
                                style={styles.historyProtocoloLabel}
                              >
                                PROTOCOLO
                              </Text>

                              <Text
                                style={styles.historyProtocolo}
                              >
                                {item.protocolo ||
                                  `FRO-${item.id}`}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.statusBadge,
                                {
                                  backgroundColor:
                                    statusVisual.fundo,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusBadgeText,
                                  {
                                    color: statusVisual.cor,
                                  },
                                ]}
                              >
                                {statusVisual.texto}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.destinoContainer}>
                            <View style={styles.destinoIcon}>
                              <MaterialIcons
                                name="place"
                                size={20}
                                color={G_COLORS.azulPrincipal}
                              />
                            </View>

                            <View style={styles.destinoTextContainer}>
                              <Text style={styles.destinoLabel}>
                                Destino
                              </Text>

                              <Text style={styles.historyDestino}>
                                {item.destino ||
                                  'Destino não informado'}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.historyDivider} />

                          <View style={styles.historyDetails}>
                            <View style={styles.historyDetail}>
                              <MaterialIcons
                                name="calendar-today"
                                size={15}
                                color={G_COLORS.cinzaTexto}
                              />

                              <Text style={styles.historyDetailText}>
                                {formatarDataExibicao(
                                  item.data_ida,
                                )}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.priorityBadge,
                                {
                                  backgroundColor:
                                    prioridadeVisual.fundo,
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.priorityBadgeText,
                                  {
                                    color:
                                      prioridadeVisual.texto,
                                  },
                                ]}
                              >
                                Prioridade{' '}
                                {prioridadeVisual.label}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.motivoContainer}>
                            <Text style={styles.motivoLabel}>
                              Justificativa
                            </Text>

                            <Text
                              style={styles.motivoText}
                              numberOfLines={3}
                            >
                              {item.motivo ||
                                'Justificativa não informada'}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            <View style={styles.institutionalFooter}>
              <MaterialIcons
                name="verified-user"
                size={17}
                color={G_COLORS.azulPrincipal}
              />

              <Text style={styles.institutionalFooterText}>
                Solicitações vinculadas à identificação funcional
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: G_COLORS.cinzaFundo,
  },

  keyboardView: {
    flex: 1,
  },

  header: {
    minHeight: 68,
    backgroundColor: G_COLORS.azulPrincipal,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },

  headerEyebrow: {
    color: '#FFFFFFB8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.3,
  },

  headerTitle: {
    color: G_COLORS.branco,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  breadcrumbText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },

  identificacaoCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    elevation: 1,
  },

  identificacaoIcone: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: G_COLORS.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  identificacaoTexto: {
    flex: 1,
  },

  identificacaoLabel: {
    color: G_COLORS.azulPrincipal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  identificacaoNome: {
    color: G_COLORS.textoPreto,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },

  identificacaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  identificacaoDetalheTexto: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  identificacaoUnidade: {
    flex: 1,
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  detalheSeparador: {
    width: 1,
    height: 13,
    backgroundColor: G_COLORS.cinzaBorda,
    marginHorizontal: 9,
  },

  tabsContainer: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 13,
    padding: 5,
    flexDirection: 'row',
    marginBottom: 17,
  },

  tabButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  tabButtonAtivo: {
    backgroundColor: G_COLORS.azulClaro,
  },

  tabText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },

  tabTextAtivo: {
    color: G_COLORS.azulPrincipal,
    fontWeight: '900',
  },

  tabContador: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: G_COLORS.laranja,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },

  tabContadorTexto: {
    color: G_COLORS.branco,
    fontSize: 9,
    fontWeight: '900',
  },

  orientacaoCard: {
    backgroundColor: G_COLORS.azulClaro,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  orientacaoText: {
    flex: 1,
    color: G_COLORS.azulEscuro,
    fontSize: 11,
    lineHeight: 17,
    marginLeft: 9,
  },

  sectionTitle: {
    color: G_COLORS.azulEscuro,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 11,
  },

  sectionSubtitle: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    marginTop: -7,
  },

  mapaCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 1,
  },

  localizacaoRodape: {
    padding: 13,
    borderTopWidth: 1,
    borderTopColor: G_COLORS.cinzaBorda,
    flexDirection: 'row',
    alignItems: 'center',
  },

  localizacaoStatus: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  localizacaoTexto: {
    flex: 1,
    marginLeft: 8,
  },

  localizacaoTitulo: {
    color: G_COLORS.textoPreto,
    fontSize: 11,
    fontWeight: '800',
  },

  localizacaoDescricao: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    lineHeight: 13,
    marginTop: 2,
  },

  localizacaoButton: {
    minWidth: 93,
    minHeight: 38,
    borderRadius: 19,
    backgroundColor: G_COLORS.azulClaro,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
  },

  localizacaoButtonText: {
    color: G_COLORS.azulPrincipal,
    fontSize: 10,
    fontWeight: '800',
    marginLeft: 5,
  },

  formCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 17,
    marginBottom: 22,
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  inputGroup: {
    marginBottom: 17,
  },

  label: {
    color: G_COLORS.textoPreto,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
  },

  inputContainer: {
    minHeight: 50,
    backgroundColor: G_COLORS.cinzaClaro,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputIcon: {
    marginHorizontal: 13,
  },

  input: {
    flex: 1,
    minHeight: 48,
    color: G_COLORS.textoPreto,
    fontSize: 14,
    paddingRight: 12,
  },

  inputHint: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    marginTop: 5,
  },

  textAreaContainer: {
    minHeight: 105,
    alignItems: 'flex-start',
  },

  textAreaIcon: {
    marginHorizontal: 13,
    marginTop: 13,
  },

  textArea: {
    minHeight: 100,
    paddingTop: 13,
    paddingBottom: 13,
  },

  characterCounter: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    textAlign: 'right',
    marginTop: 4,
  },

  btnPrincipal: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: G_COLORS.azulPrincipal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
    elevation: 2,
  },

  btnPrincipalDesabilitado: {
    opacity: 0.65,
  },

  textoBtnPrincipal: {
    color: G_COLORS.branco,
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  formSecurity: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 13,
  },

  formSecurityText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    marginLeft: 5,
  },

  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: G_COLORS.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filtrosCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 13,
    marginBottom: 14,
  },

  searchContainer: {
    minHeight: 45,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 10,
    backgroundColor: G_COLORS.cinzaClaro,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 13,
  },

  searchInput: {
    flex: 1,
    minHeight: 43,
    color: G_COLORS.textoPreto,
    fontSize: 13,
    marginLeft: 8,
  },

  clearSearchButton: {
    padding: 5,
  },

  filtroLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 7,
    marginTop: 2,
  },

  filtrosLinha: {
    paddingBottom: 10,
  },

  filtroChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    backgroundColor: G_COLORS.branco,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginRight: 7,
  },

  filtroChipSelecionado: {
    backgroundColor: G_COLORS.azulClaro,
    borderColor: G_COLORS.azulPrincipal,
  },

  filtroChipText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 10,
    fontWeight: '700',
  },

  filtroChipTextSelecionado: {
    color: G_COLORS.azulPrincipal,
    fontWeight: '900',
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  errorTextContainer: {
    flex: 1,
    marginLeft: 9,
  },

  errorTitle: {
    color: G_COLORS.vermelho,
    fontSize: 11,
    fontWeight: '800',
  },

  errorText: {
    color: '#7F1D1D',
    fontSize: 9,
    marginTop: 2,
  },

  errorRetryText: {
    color: G_COLORS.vermelho,
    fontSize: 9,
    fontWeight: '900',
  },

  loadingCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 12,
    marginTop: 10,
  },

  historyList: {
    paddingBottom: 5,
  },

  historyCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  historyHeaderText: {
    flex: 1,
    marginRight: 10,
  },

  historyProtocoloLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  historyProtocolo: {
    color: G_COLORS.azulPrincipal,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },

  destinoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },

  destinoIcon: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: G_COLORS.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  destinoTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  destinoLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    fontWeight: '700',
  },

  historyDestino: {
    color: G_COLORS.textoPreto,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },

  historyDivider: {
    height: 1,
    backgroundColor: G_COLORS.cinzaBorda,
    marginVertical: 13,
  },

  historyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  historyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  historyDetailText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },

  priorityBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  priorityBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  motivoContainer: {
    backgroundColor: G_COLORS.cinzaClaro,
    borderRadius: 9,
    padding: 11,
    marginTop: 13,
  },

  motivoLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  motivoText: {
    color: G_COLORS.textoPreto,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 4,
  },

  emptyState: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: G_COLORS.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTitle: {
    color: G_COLORS.textoPreto,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
  },

  emptyText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 4,
  },

  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
  },

  clearFiltersText: {
    color: G_COLORS.azulPrincipal,
    fontSize: 11,
    fontWeight: '800',
  },

  emptyActionButton: {
    minHeight: 41,
    borderRadius: 21,
    backgroundColor: G_COLORS.azulPrincipal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 8,
  },

  emptyActionText: {
    color: G_COLORS.branco,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 5,
  },

  institutionalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: G_COLORS.cinzaBorda,
  },

  institutionalFooterText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 6,
  },
});