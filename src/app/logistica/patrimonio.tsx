/**
 * Super App Gov — Logística / Patrimônio
 * Ficheiro: src/app/logistica/patrimonio.tsx
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import PrioritySelector from '../../components/PrioritySelector';
import {
  CORES_PRIORIDADE,
  estiloStatus,
  formatarDataHora,
  prioridadeSegura,
  Prioridade,
} from '../../lib/workflow';
import { supabase } from '../../lib/supabase';

const C = {
  azul: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  fundo: '#F4F6F8',
  superficie: '#F8FAFC',
  texto: '#1F2937',
  secundario: '#64748B',
  borda: '#E2E8F0',
  verde: '#168821',
  laranja: '#F59E0B',
  vermelho: '#DC2626',
  roxo: '#7C3AED',
};

type Icone = React.ComponentProps<typeof MaterialIcons>['name'];
type Aba = 'carga' | 'chamado' | 'historico';
type TipoChamado = 'Defeito/Manutenção' | 'Transferência';
type FiltroChamado = 'TODOS' | 'ABERTOS' | 'ENCERRADOS';

type Parametros = {
  nome?: string;
  matricula?: string;
  uorg?: string;
  cargo?: string;
  cpf?: string;
  aba?: string;
};

type Bem = {
  id: number | string;
  tombamento: string;
  nome: string;
  categoria?: string | null;
  icone?: string | null;
  marca_modelo?: string | null;
  numero_serie?: string | null;
  estado_conservacao?: string | null;
  situacao?: string | null;
  uorg?: string | null;
  localizacao?: string | null;
  data_aquisicao?: string | null;
  valor_aquisicao?: number | string | null;
};

type Chamado = {
  id: number | string;
  protocolo?: string | null;
  bem_id?: number | string | null;
  tombamento?: string | null;
  tipo_chamado?: string | null;
  descricao?: string | null;
  status?: string | null;
  prioridade?: string | null;
  uorg_destino?: string | null;
  created_at?: string | null;
  criado_em?: string | null;
};

type RespostaRpc = {
  id?: number | string;
  protocolo?: string;
  tombamento?: string;
};

const ABAS: Array<{ value: Aba; label: string; icone: Icone }> = [
  { value: 'carga', label: 'Minha carga', icone: 'inventory-2' },
  { value: 'chamado', label: 'Novo chamado', icone: 'add-task' },
  { value: 'historico', label: 'Histórico', icone: 'history' },
];

function parametro(valor?: string | string[]): string {
  return Array.isArray(valor) ? valor[0] || '' : valor || '';
}

function normalizar(valor?: string | null): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function numero(valor: unknown): number {
  const resultado = Number(valor);
  return Number.isFinite(resultado) ? resultado : 0;
}

function mensagemErro(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(
      (error as { message?: unknown }).message ||
        'Não foi possível concluir a operação.',
    );
  }
  return 'Não foi possível concluir a operação.';
}

function formatarMoeda(valor?: number | string | null): string {
  return numero(valor).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatarData(valor?: string | null): string {
  if (!valor) return 'Não informada';
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? valor
    : data.toLocaleDateString('pt-BR');
}

function chamadoEncerrado(status?: string | null): boolean {
  const valor = normalizar(status);
  return (
    valor.includes('concluid') ||
    valor.includes('finaliz') ||
    valor.includes('rejeit') ||
    valor.includes('cancelad') ||
    valor.includes('encerrad')
  );
}

function bemDisponivel(bem: Bem): boolean {
  const situacao = normalizar(bem.situacao);
  return !(
    situacao.includes('solicitad') ||
    situacao.includes('manutencao') ||
    situacao.includes('transferencia') ||
    situacao.includes('baixad') ||
    situacao.includes('inativ')
  );
}

function visualSituacao(situacao?: string | null) {
  const valor = normalizar(situacao);
  if (valor.includes('manutencao')) {
    return {
      texto: situacao || 'Manutenção solicitada',
      cor: C.laranja,
      fundo: '#FFF7ED',
      icone: 'build' as Icone,
    };
  }
  if (valor.includes('transferencia')) {
    return {
      texto: situacao || 'Transferência solicitada',
      cor: C.roxo,
      fundo: '#F5F3FF',
      icone: 'swap-horiz' as Icone,
    };
  }
  if (valor.includes('baixad') || valor.includes('inativ')) {
    return {
      texto: situacao || 'Indisponível',
      cor: C.vermelho,
      fundo: '#FEF2F2',
      icone: 'block' as Icone,
    };
  }
  return {
    texto: situacao || 'Em uso',
    cor: C.verde,
    fundo: '#ECFDF5',
    icone: 'verified' as Icone,
  };
}

function iconeBem(bem: Bem): Icone {
  if (bem.icone) return bem.icone as Icone;
  const texto = normalizar((bem.categoria || '') + ' ' + bem.nome);
  if (texto.includes('notebook') || texto.includes('informatica')) {
    return 'laptop-mac';
  }
  if (texto.includes('monitor')) return 'monitor';
  if (texto.includes('cadeira') || texto.includes('mobiliario')) {
    return 'chair-alt';
  }
  return 'inventory-2';
}

function respostaRpc(data: unknown): RespostaRpc {
  const valor = Array.isArray(data) ? data[0] : data;
  return typeof valor === 'object' && valor !== null
    ? (valor as RespostaRpc)
    : {};
}

function Resumo({
  titulo,
  valor,
  icone,
  cor,
}: {
  titulo: string;
  valor: number;
  icone: Icone;
  cor: string;
}) {
  return (
    <View style={styles.resumoCard}>
      <View style={[styles.resumoIcone, { backgroundColor: cor + '14' }]}>
        <MaterialIcons name={icone} size={20} color={cor} />
      </View>
      <Text style={styles.resumoValor}>{valor}</Text>
      <Text style={styles.resumoTitulo}>{titulo}</Text>
    </View>
  );
}

export default function PatrimonioScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<Parametros>();
  const nome = parametro(params.nome) || 'Servidor Público';
  const matricula = parametro(params.matricula);
  const uorg = parametro(params.uorg) || 'Unidade não informada';

  const [aba, setAba] = useState<Aba>(
    params.aba === 'chamado' || params.aba === 'historico'
      ? params.aba
      : 'carga',
  );
  const [bens, setBens] = useState<Bem[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [buscaBem, setBuscaBem] = useState('');
  const [categoria, setCategoria] = useState('Todas');
  const [bemId, setBemId] = useState('');
  const [tipo, setTipo] = useState<TipoChamado>('Defeito/Manutenção');
  const [descricao, setDescricao] = useState('');
  const [uorgDestino, setUorgDestino] = useState('');
  const [prioridade, setPrioridade] = useState<Prioridade>('NORMAL');
  const [enviando, setEnviando] = useState(false);
  const [buscaChamado, setBuscaChamado] = useState('');
  const [filtro, setFiltro] = useState<FiltroChamado>('TODOS');

  const carregar = useCallback(
    async (refresh = false) => {
      if (!matricula) {
        setCarregando(false);
        setAtualizando(false);
        return;
      }
      refresh ? setAtualizando(true) : setCarregando(true);
      try {
        const [carga, historico] = await Promise.all([
          supabase.rpc('obter_ou_criar_carga_patrimonial', {
            p_matricula: matricula,
            p_nome_responsavel: nome,
            p_uorg: uorg,
          }),
          supabase
            .from('chamados_patrimonio')
            .select('*')
            .eq('matricula', matricula)
            .order('id', { ascending: false }),
        ]);
        if (carga.error) throw carga.error;
        if (historico.error) throw historico.error;
        setBens(Array.isArray(carga.data) ? (carga.data as Bem[]) : []);
        setChamados(
          Array.isArray(historico.data) ? (historico.data as Chamado[]) : [],
        );
      } catch (error) {
        Alert.alert('Erro ao carregar o Patrimônio', mensagemErro(error));
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [matricula, nome, uorg],
  );

  useEffect(() => {
    carregar();
  }, [carregar]);

  const categorias = useMemo(
    () => [
      'Todas',
      ...Array.from(
        new Set(
          bens
            .map((bem) => String(bem.categoria || '').trim())
            .filter(Boolean),
        ),
      ).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    ],
    [bens],
  );

  const bensFiltrados = useMemo(() => {
    const termo = normalizar(buscaBem);
    return bens.filter((bem) => {
      const naCategoria = categoria === 'Todas' || bem.categoria === categoria;
      const conteudo = normalizar(
        bem.tombamento +
          ' ' +
          bem.nome +
          ' ' +
          (bem.marca_modelo || '') +
          ' ' +
          (bem.localizacao || ''),
      );
      return naCategoria && (!termo || conteudo.includes(termo));
    });
  }, [bens, buscaBem, categoria]);

  const chamadosFiltrados = useMemo(() => {
    const termo = normalizar(buscaChamado);
    return chamados.filter((chamado) => {
      const encerrado = chamadoEncerrado(chamado.status);
      const noFiltro =
        filtro === 'TODOS' ||
        (filtro === 'ABERTOS' && !encerrado) ||
        (filtro === 'ENCERRADOS' && encerrado);
      const conteudo = normalizar(
        (chamado.protocolo || '') +
          ' ' +
          (chamado.tombamento || '') +
          ' ' +
          (chamado.tipo_chamado || '') +
          ' ' +
          (chamado.descricao || ''),
      );
      return noFiltro && (!termo || conteudo.includes(termo));
    });
  }, [buscaChamado, chamados, filtro]);

  const selecionado = useMemo(
    () => bens.find((bem) => String(bem.id) === bemId) || null,
    [bemId, bens],
  );

  const disponiveis = bens.filter(bemDisponivel).length;
  const manutencoes = bens.filter((bem) =>
    normalizar(bem.situacao).includes('manutencao'),
  ).length;
  const transferencias = bens.filter((bem) =>
    normalizar(bem.situacao).includes('transferencia'),
  ).length;

  const escolherBem = (bem: Bem) => {
    if (!bemDisponivel(bem)) {
      Alert.alert(
        'Solicitação em andamento',
        'Este bem já possui uma movimentação aberta. Consulte o histórico.',
        [
          { text: 'Fechar', style: 'cancel' },
          { text: 'Ver histórico', onPress: () => setAba('historico') },
        ],
      );
      return;
    }
    setBemId(String(bem.id));
    setAba('chamado');
  };

  const limparFormulario = () => {
    setBemId('');
    setTipo('Defeito/Manutenção');
    setDescricao('');
    setUorgDestino('');
    setPrioridade('NORMAL');
  };

  const protocolar = async () => {
    if (!matricula) {
      Alert.alert('Sessão incompleta', 'Entre novamente para recuperar a matrícula.');
      return;
    }
    if (!selecionado) {
      Alert.alert('Selecione um bem', 'Escolha um item da sua carga.');
      return;
    }
    if (descricao.trim().length < 10) {
      Alert.alert('Descrição incompleta', 'Escreva pelo menos 10 caracteres.');
      return;
    }
    if (tipo === 'Transferência' && uorgDestino.trim().length < 3) {
      Alert.alert('Destino obrigatório', 'Informe a unidade que receberá o bem.');
      return;
    }

    setEnviando(true);
    try {
      const { data, error } = await supabase.rpc('abrir_chamado_patrimonio', {
        p_bem_id: numero(selecionado.id),
        p_matricula: matricula,
        p_nome_servidor: nome,
        p_uorg: uorg,
        p_tipo_chamado: tipo,
        p_descricao: descricao.trim(),
        p_prioridade: prioridade,
        p_uorg_destino:
          tipo === 'Transferência' ? uorgDestino.trim() : null,
      });
      if (error) throw error;
      const resposta = respostaRpc(data);
      Alert.alert(
        'Chamado protocolado',
        'Protocolo ' +
          (resposta.protocolo || 'gerado com sucesso') +
          '. A solicitação já está disponível para análise.',
      );
      limparFormulario();
      await carregar(true);
      setAba('historico');
    } catch (error) {
      Alert.alert('Erro ao abrir o chamado', mensagemErro(error));
    } finally {
      setEnviando(false);
    }
  };

  if (carregando) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={C.azul} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBotao} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back" size={23} color={C.branco} />
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>Patrimônio</Text>
          <View style={styles.headerBotao} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.loadingTexto}>Carregando a carga patrimonial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBotao} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={23} color={C.branco} />
        </TouchableOpacity>
        <View style={styles.headerCentro}>
          <Text style={styles.headerTitulo}>Patrimônio</Text>
          <Text style={styles.headerSubtitulo}>Carga e movimentações</Text>
        </View>
        <View style={styles.headerBotao}>
          <MaterialIcons name="account-balance" size={22} color={C.branco} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => carregar(true)}
            colors={[C.azul]}
            tintColor={C.azul}
          />
        }
      >
        <View style={[styles.conteudo, width >= 1040 && styles.conteudoDesktop]}>
          <View style={styles.perfil}>
            <View style={styles.perfilIcone}>
              <MaterialIcons name="badge" size={25} color={C.azul} />
            </View>
            <View style={styles.perfilTexto}>
              <Text style={styles.perfilNome}>{nome}</Text>
              <Text style={styles.perfilDetalhe}>
                Matrícula {matricula || 'não informada'} • {uorg}
              </Text>
            </View>
            <View style={styles.totalBadge}>
              <Text style={styles.totalValor}>{bens.length}</Text>
              <Text style={styles.totalTexto}>bens</Text>
            </View>
          </View>

          <View style={styles.resumos}>
            <Resumo titulo="Carga total" valor={bens.length} icone="inventory-2" cor={C.azul} />
            <Resumo titulo="Disponíveis" valor={disponiveis} icone="verified" cor={C.verde} />
            <Resumo titulo="Manutenção" valor={manutencoes} icone="build" cor={C.laranja} />
            <Resumo titulo="Transferência" valor={transferencias} icone="swap-horiz" cor={C.roxo} />
          </View>

          <View style={styles.abas}>
            {ABAS.map((item) => {
              const ativa = aba === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.aba, ativa && styles.abaAtiva]}
                  onPress={() => setAba(item.value)}
                >
                  <MaterialIcons
                    name={item.icone}
                    size={18}
                    color={ativa ? C.azul : C.secundario}
                  />
                  <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {aba === 'carga' && (
            <View>
              <View style={styles.secaoCabecalho}>
                <View style={styles.flex}>
                  <Text style={styles.secaoTitulo}>Minha carga patrimonial</Text>
                  <Text style={styles.secaoSubtitulo}>
                    Bens vinculados à sua matrícula no cadastro oficial.
                  </Text>
                </View>
                <TouchableOpacity style={styles.atualizar} onPress={() => carregar(true)}>
                  <MaterialIcons name="refresh" size={19} color={C.azul} />
                </TouchableOpacity>
              </View>

              <View style={styles.busca}>
                <MaterialIcons name="search" size={21} color={C.secundario} />
                <TextInput
                  style={styles.buscaInput}
                  value={buscaBem}
                  onChangeText={setBuscaBem}
                  placeholder="Buscar bem, tombamento ou localização"
                  placeholderTextColor="#94A3B8"
                />
                {!!buscaBem && (
                  <TouchableOpacity onPress={() => setBuscaBem('')}>
                    <MaterialIcons name="cancel" size={19} color={C.secundario} />
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chips}
              >
                {categorias.map((item) => {
                  const ativa = categoria === item;
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[styles.chip, ativa && styles.chipAtivo]}
                      onPress={() => setCategoria(item)}
                    >
                      <Text style={[styles.chipTexto, ativa && styles.chipTextoAtivo]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {bensFiltrados.length === 0 ? (
                <View style={styles.vazio}>
                  <MaterialIcons name="inventory-2" size={42} color={C.borda} />
                  <Text style={styles.vazioTitulo}>Nenhum bem encontrado</Text>
                  <Text style={styles.vazioTexto}>Ajuste os filtros ou atualize a carga.</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {bensFiltrados.map((bem) => {
                    const visual = visualSituacao(bem.situacao);
                    const disponivel = bemDisponivel(bem);
                    return (
                      <View
                        key={String(bem.id)}
                        style={[styles.bemCard, width >= 760 && styles.bemCardDesktop]}
                      >
                        <View style={styles.bemTopo}>
                          <View style={styles.bemIcone}>
                            <MaterialIcons name={iconeBem(bem)} size={27} color={C.azul} />
                          </View>
                          <View style={[styles.situacao, { backgroundColor: visual.fundo }]}>
                            <MaterialIcons name={visual.icone} size={13} color={visual.cor} />
                            <Text style={[styles.situacaoTexto, { color: visual.cor }]}>
                              {visual.texto}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.bemNome}>{bem.nome}</Text>
                        <Text style={styles.bemModelo}>
                          {bem.marca_modelo || bem.categoria || 'Bem patrimonial'}
                        </Text>
                        <View style={styles.tomLinha}>
                          <MaterialIcons name="qr-code-2" size={17} color={C.azul} />
                          <Text style={styles.tomTexto}>{bem.tombamento}</Text>
                        </View>
                        <View style={styles.detalhes}>
                          <LinhaDetalhe icone="location-on" texto={bem.localizacao || bem.uorg || uorg} />
                          <LinhaDetalhe
                            icone="health-and-safety"
                            texto={'Conservação: ' + (bem.estado_conservacao || 'Não informada')}
                          />
                          <LinhaDetalhe
                            icone="event"
                            texto={'Aquisição: ' + formatarData(bem.data_aquisicao)}
                          />
                          <LinhaDetalhe
                            icone="payments"
                            texto={'Valor: ' + formatarMoeda(bem.valor_aquisicao)}
                          />
                        </View>
                        <TouchableOpacity
                          style={[styles.botaoBem, !disponivel && styles.botaoBemInativo]}
                          onPress={() => escolherBem(bem)}
                        >
                          <MaterialIcons
                            name={disponivel ? 'add-task' : 'history'}
                            size={18}
                            color={disponivel ? C.branco : C.secundario}
                          />
                          <Text
                            style={[styles.botaoBemTexto, !disponivel && styles.botaoBemTextoInativo]}
                          >
                            {disponivel ? 'Abrir chamado' : 'Acompanhar solicitação'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {aba === 'chamado' && (
            <View>
              <Text style={styles.secaoTitulo}>Novo chamado patrimonial</Text>
              <Text style={[styles.secaoSubtitulo, styles.margemSecao]}>
                Solicite manutenção ou transferência de um bem sob sua guarda.
              </Text>
              {!selecionado ? (
                <View style={styles.vazio}>
                  <View style={styles.vazioIcone}>
                    <MaterialIcons name="touch-app" size={30} color={C.azul} />
                  </View>
                  <Text style={styles.vazioTitulo}>Selecione primeiro o bem</Text>
                  <Text style={styles.vazioTexto}>
                    A seleção pelo cadastro impede chamados para tombamentos inexistentes.
                  </Text>
                  <TouchableOpacity style={styles.secundario} onPress={() => setAba('carga')}>
                    <MaterialIcons name="inventory-2" size={18} color={C.azul} />
                    <Text style={styles.secundarioTexto}>Escolher na minha carga</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.formCard}>
                  <View style={styles.selecionado}>
                    <View style={styles.bemIcone}>
                      <MaterialIcons name={iconeBem(selecionado)} size={27} color={C.azul} />
                    </View>
                    <View style={styles.selecionadoTexto}>
                      <Text style={styles.rotulo}>BEM SELECIONADO</Text>
                      <Text style={styles.selecionadoNome}>{selecionado.nome}</Text>
                      <Text style={styles.selecionadoTombo}>
                        Tombamento {selecionado.tombamento}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.trocar} onPress={() => setAba('carga')}>
                      <Text style={styles.trocarTexto}>Trocar</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Tipo de solicitação</Text>
                  <View style={styles.tipos}>
                    {(['Defeito/Manutenção', 'Transferência'] as TipoChamado[]).map(
                      (item) => {
                        const ativo = tipo === item;
                        return (
                          <TouchableOpacity
                            key={item}
                            style={[styles.tipo, ativo && styles.tipoAtivo]}
                            onPress={() => setTipo(item)}
                          >
                            <MaterialIcons
                              name={item === 'Transferência' ? 'swap-horiz' : 'build'}
                              size={18}
                              color={ativo ? C.branco : C.secundario}
                            />
                            <Text style={[styles.tipoTexto, ativo && styles.tipoTextoAtivo]}>
                              {item === 'Transferência' ? 'Transferência' : 'Manutenção'}
                            </Text>
                          </TouchableOpacity>
                        );
                      },
                    )}
                  </View>

                  {tipo === 'Transferência' && (
                    <Campo
                      label="Unidade de destino"
                      icone="domain"
                      value={uorgDestino}
                      onChangeText={setUorgDestino}
                      placeholder="Ex.: Coordenação de Tecnologia"
                    />
                  )}

                  <View style={styles.campo}>
                    <Text style={styles.label}>
                      {tipo === 'Transferência'
                        ? 'Justificativa da transferência'
                        : 'Descrição do defeito'}
                    </Text>
                    <View style={[styles.inputCaixa, styles.textareaCaixa]}>
                      <MaterialIcons
                        name="notes"
                        size={20}
                        color={C.azul}
                        style={styles.textareaIcone}
                      />
                      <TextInput
                        style={[styles.input, styles.textarea]}
                        value={descricao}
                        onChangeText={setDescricao}
                        placeholder="Informe o motivo e os detalhes da solicitação..."
                        placeholderTextColor="#94A3B8"
                        multiline
                        maxLength={600}
                        textAlignVertical="top"
                      />
                    </View>
                    <Text style={styles.contador}>{descricao.trim().length}/600 caracteres</Text>
                  </View>

                  <View style={styles.campo}>
                    <Text style={styles.label}>Prioridade administrativa</Text>
                    <PrioritySelector value={prioridade} onChange={setPrioridade} compact />
                  </View>

                  <View style={styles.aviso}>
                    <MaterialIcons name="info-outline" size={19} color={C.azul} />
                    <Text style={styles.avisoTexto}>
                      O bem ficará bloqueado para novos chamados até a conclusão desta solicitação.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.principal, enviando && styles.principalInativo]}
                    onPress={protocolar}
                    disabled={enviando}
                  >
                    {enviando ? (
                      <ActivityIndicator size="small" color={C.branco} />
                    ) : (
                      <>
                        <MaterialIcons name="send" size={19} color={C.branco} />
                        <Text style={styles.principalTexto}>Protocolar chamado</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {aba === 'historico' && (
            <View>
              <Text style={styles.secaoTitulo}>Histórico de chamados</Text>
              <Text style={[styles.secaoSubtitulo, styles.margemSecao]}>
                Acompanhe protocolos e decisões do setor de Patrimônio.
              </Text>
              <View style={styles.busca}>
                <MaterialIcons name="search" size={21} color={C.secundario} />
                <TextInput
                  style={styles.buscaInput}
                  value={buscaChamado}
                  onChangeText={setBuscaChamado}
                  placeholder="Buscar protocolo, tombamento ou descrição"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.filtros}>
                {(
                  [
                    ['TODOS', 'Todos'],
                    ['ABERTOS', 'Em andamento'],
                    ['ENCERRADOS', 'Encerrados'],
                  ] as Array<[FiltroChamado, string]>
                ).map(([value, label]) => {
                  const ativo = filtro === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      style={[styles.filtro, ativo && styles.filtroAtivo]}
                      onPress={() => setFiltro(value)}
                    >
                      <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {chamadosFiltrados.length === 0 ? (
                <View style={styles.vazio}>
                  <MaterialIcons name="history" size={42} color={C.borda} />
                  <Text style={styles.vazioTitulo}>Nenhum chamado encontrado</Text>
                  <Text style={styles.vazioTexto}>
                    Os protocolos abertos por você aparecerão aqui.
                  </Text>
                </View>
              ) : (
                chamadosFiltrados.map((chamado) => {
                  const status = estiloStatus(chamado.status);
                  const prioridadeVisual =
                    CORES_PRIORIDADE[prioridadeSegura(chamado.prioridade)];
                  return (
                    <View key={String(chamado.id)} style={styles.historico}>
                      <View style={styles.historicoTopo}>
                        <View style={styles.flex}>
                          <Text style={styles.protocolo}>
                            {chamado.protocolo || 'PAT-' + chamado.id}
                          </Text>
                          <Text style={styles.historicoTombo}>
                            Tombamento {chamado.tombamento || 'não informado'}
                          </Text>
                        </View>
                        <View style={[styles.status, { backgroundColor: status.fundo }]}>
                          <Text style={[styles.statusTexto, { color: status.texto }]}>
                            {chamado.status || status.label}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.historicoTipo}>
                        <MaterialIcons
                          name={
                            chamado.tipo_chamado === 'Transferência'
                              ? 'swap-horiz'
                              : 'build'
                          }
                          size={17}
                          color={C.azul}
                        />
                        <Text style={styles.historicoTipoTexto}>
                          {chamado.tipo_chamado || 'Solicitação patrimonial'}
                        </Text>
                      </View>
                      <Text style={styles.historicoDescricao}>
                        {chamado.descricao || 'Descrição não informada.'}
                      </Text>
                      {!!chamado.uorg_destino && (
                        <LinhaDetalhe
                          icone="domain"
                          texto={'Destino: ' + chamado.uorg_destino}
                        />
                      )}
                      <View style={styles.historicoRodape}>
                        <View
                          style={[
                            styles.prioridade,
                            { backgroundColor: prioridadeVisual.fundo },
                          ]}
                        >
                          <Text
                            style={[
                              styles.prioridadeTexto,
                              { color: prioridadeVisual.texto },
                            ]}
                          >
                            {prioridadeVisual.label}
                          </Text>
                        </View>
                        <Text style={styles.data}>
                          {formatarDataHora(chamado.criado_em || chamado.created_at)}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaDetalhe({ icone, texto }: { icone: Icone; texto: string }) {
  return (
    <View style={styles.detalheLinha}>
      <MaterialIcons name={icone} size={16} color={C.secundario} />
      <Text style={styles.detalheTexto} numberOfLines={1}>
        {texto}
      </Text>
    </View>
  );
}

function Campo({
  label,
  icone,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  icone: Icone;
  value: string;
  onChangeText: (texto: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.campo}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputCaixa}>
        <MaterialIcons name={icone} size={20} color={C.azul} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.fundo },
  flex: { flex: 1 },
  header: { minHeight: 66, backgroundColor: C.azul, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 4 },
  headerBotao: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCentro: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerTitulo: { color: C.branco, fontSize: 18, fontWeight: '800' },
  headerSubtitulo: { color: 'rgba(255,255,255,0.78)', fontSize: 11, marginTop: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingTexto: { color: C.secundario, marginTop: 14, fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 40 },
  conteudo: { width: '100%' },
  conteudoDesktop: { maxWidth: 1040, alignSelf: 'center' },
  perfil: { backgroundColor: C.azulEscuro, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  perfilIcone: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.branco, alignItems: 'center', justifyContent: 'center' },
  perfilTexto: { flex: 1, marginHorizontal: 12 },
  perfilNome: { color: C.branco, fontSize: 16, fontWeight: '800' },
  perfilDetalhe: { color: 'rgba(255,255,255,0.72)', fontSize: 11, marginTop: 4 },
  totalBadge: { minWidth: 50, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center' },
  totalValor: { color: C.branco, fontSize: 18, fontWeight: '900' },
  totalTexto: { color: 'rgba(255,255,255,0.72)', fontSize: 10 },
  resumos: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  resumoCard: { flex: 1, minWidth: 0, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 12, paddingHorizontal: 6, paddingVertical: 11, alignItems: 'center' },
  resumoIcone: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  resumoValor: { color: C.texto, fontSize: 18, fontWeight: '900' },
  resumoTitulo: { color: C.secundario, fontSize: 9, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  abas: { backgroundColor: C.branco, borderRadius: 12, borderWidth: 1, borderColor: C.borda, padding: 4, flexDirection: 'row', marginBottom: 22 },
  aba: { flex: 1, minHeight: 46, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, paddingHorizontal: 3 },
  abaAtiva: { backgroundColor: C.azulClaro },
  abaTexto: { color: C.secundario, fontSize: 11, fontWeight: '700' },
  abaTextoAtiva: { color: C.azul },
  secaoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  secaoTitulo: { color: C.azulEscuro, fontSize: 18, fontWeight: '800' },
  secaoSubtitulo: { color: C.secundario, fontSize: 12, lineHeight: 17, marginTop: 3 },
  margemSecao: { marginBottom: 14 },
  atualizar: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.azulClaro, alignItems: 'center', justifyContent: 'center' },
  busca: { height: 48, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 10, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  buscaInput: { flex: 1, height: 46, color: C.texto, fontSize: 14 },
  chips: { gap: 8, paddingBottom: 14 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda },
  chipAtivo: { backgroundColor: C.azul, borderColor: C.azul },
  chipTexto: { color: C.secundario, fontSize: 12, fontWeight: '700' },
  chipTextoAtivo: { color: C.branco },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bemCard: { width: '100%', backgroundColor: C.branco, borderRadius: 14, borderWidth: 1, borderColor: C.borda, padding: 16 },
  bemCardDesktop: { width: '49%' },
  bemTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  bemIcone: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.azulClaro, alignItems: 'center', justifyContent: 'center' },
  situacao: { maxWidth: '70%', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 4 },
  situacaoTexto: { flexShrink: 1, fontSize: 10, fontWeight: '800' },
  bemNome: { color: C.texto, fontSize: 16, fontWeight: '800' },
  bemModelo: { color: C.secundario, fontSize: 12, marginTop: 3, marginBottom: 12 },
  tomLinha: { alignSelf: 'flex-start', backgroundColor: C.azulClaro, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 13 },
  tomTexto: { color: C.azul, fontSize: 12, fontWeight: '900' },
  detalhes: { borderTopWidth: 1, borderTopColor: C.borda, paddingTop: 11, gap: 8 },
  detalheLinha: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 },
  detalheTexto: { flex: 1, color: C.secundario, fontSize: 11 },
  botaoBem: { minHeight: 44, borderRadius: 9, backgroundColor: C.azul, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 15, paddingHorizontal: 10 },
  botaoBemInativo: { backgroundColor: C.superficie, borderWidth: 1, borderColor: C.borda },
  botaoBemTexto: { color: C.branco, fontSize: 13, fontWeight: '800' },
  botaoBemTextoInativo: { color: C.secundario },
  vazio: { backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderStyle: 'dashed', borderRadius: 14, alignItems: 'center', padding: 30 },
  vazioIcone: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.azulClaro, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  vazioTitulo: { color: C.texto, fontSize: 15, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  vazioTexto: { color: C.secundario, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: 5 },
  secundario: { minHeight: 44, borderRadius: 9, borderWidth: 1, borderColor: C.azul, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18 },
  secundarioTexto: { color: C.azul, fontSize: 13, fontWeight: '800' },
  formCard: { backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 14, padding: 16 },
  selecionado: { backgroundColor: C.superficie, borderRadius: 11, borderWidth: 1, borderColor: C.borda, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  selecionadoTexto: { flex: 1, marginHorizontal: 11 },
  rotulo: { color: C.azul, fontSize: 9, fontWeight: '900', letterSpacing: 0.6 },
  selecionadoNome: { color: C.texto, fontSize: 14, fontWeight: '800', marginTop: 2 },
  selecionadoTombo: { color: C.secundario, fontSize: 11, marginTop: 3 },
  trocar: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: C.azulClaro },
  trocarTexto: { color: C.azul, fontSize: 11, fontWeight: '800' },
  label: { color: C.texto, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  tipos: { flexDirection: 'row', gap: 9, marginBottom: 18 },
  tipo: { flex: 1, minHeight: 46, borderRadius: 9, borderWidth: 1, borderColor: C.borda, backgroundColor: C.superficie, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  tipoAtivo: { backgroundColor: C.azul, borderColor: C.azul },
  tipoTexto: { color: C.secundario, fontSize: 12, fontWeight: '700' },
  tipoTextoAtivo: { color: C.branco },
  campo: { marginBottom: 17 },
  inputCaixa: { minHeight: 48, borderRadius: 9, borderWidth: 1, borderColor: C.borda, backgroundColor: C.superficie, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  input: { flex: 1, minHeight: 46, color: C.texto, fontSize: 14 },
  textareaCaixa: { minHeight: 112, alignItems: 'flex-start' },
  textareaIcone: { marginTop: 13 },
  textarea: { minHeight: 108, paddingTop: 12, paddingBottom: 12 },
  contador: { color: C.secundario, fontSize: 10, textAlign: 'right', marginTop: 4 },
  aviso: { backgroundColor: C.azulClaro, borderRadius: 9, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 17 },
  avisoTexto: { flex: 1, color: C.azulEscuro, fontSize: 11, lineHeight: 16 },
  principal: { minHeight: 50, borderRadius: 10, backgroundColor: C.azul, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  principalInativo: { opacity: 0.65 },
  principalTexto: { color: C.branco, fontSize: 14, fontWeight: '800' },
  filtros: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filtro: { flex: 1, minHeight: 38, borderRadius: 19, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filtroAtivo: { backgroundColor: C.azul, borderColor: C.azul },
  filtroTexto: { color: C.secundario, fontSize: 11, fontWeight: '700', textAlign: 'center' },
  filtroTextoAtivo: { color: C.branco },
  historico: { backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 13, padding: 15, marginBottom: 11 },
  historicoTopo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 },
  protocolo: { color: C.azul, fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  historicoTombo: { color: C.texto, fontSize: 13, fontWeight: '800', marginTop: 3 },
  status: { maxWidth: '48%', borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  statusTexto: { fontSize: 10, fontWeight: '800', textAlign: 'center' },
  historicoTipo: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  historicoTipoTexto: { color: C.texto, fontSize: 13, fontWeight: '700' },
  historicoDescricao: { color: C.secundario, fontSize: 12, lineHeight: 17, backgroundColor: C.superficie, borderRadius: 8, padding: 10 },
  historicoRodape: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  prioridade: { borderRadius: 16, paddingHorizontal: 9, paddingVertical: 5 },
  prioridadeTexto: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  data: { color: C.secundario, fontSize: 10 },
});
