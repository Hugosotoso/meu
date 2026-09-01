/**
 * Super App Gov — Logística / Almoxarifado
 * Ficheiro: src/app/logistica/almoxarifado.tsx
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
  Modal,
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

import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

import PrioritySelector from '../../components/PrioritySelector';

import {
  CORES_PRIORIDADE,
  prioridadeSegura,
  Prioridade,
} from '../../lib/workflow';

const C = {
  azulGov: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  fundo: '#F4F6F8',
  branco: '#FFFFFF',
  texto: '#1F2937',
  textoSecundario: '#64748B',
  borda: '#E2E8F0',
  verde: '#168821',
  vermelho: '#DC2626',
  laranja: '#F59E0B',
  roxo: '#7C3AED',
  cinzaClaro: '#F8FAFC',
};

type IconeMaterial = React.ComponentProps<
  typeof MaterialIcons
>['name'];

type AbaAlmoxarifado = 'catalogo' | 'pedidos';

type FiltroStatus =
  | 'TODOS'
  | 'A_SEPARAR'
  | 'EM_TRANSITO'
  | 'ENTREGUE'
  | 'REJEITADO';

type ParametrosUsuario = {
  nome?: string;
  matricula?: string;
  uorg?: string;
  cargo?: string;
  cpf?: string;
};

type MaterialAlmoxarifado = {
  id: number | string;
  codigo: string;
  nome: string;
  categoria: string;
  icone?: string | null;
  unidade: string;
  estoque_atual: number | string;
  estoque_reservado: number | string;
  estoque_minimo: number | string;
  limite_por_requisicao: number | string;
  ativo: boolean;
};

type ItemPedido = {
  material_id?: number | string;
  id?: number | string;
  codigo?: string;
  nome?: string;
  unidade?: string;
  qtd: number | string;
};

type PedidoAlmoxarifado = {
  id: number | string;
  protocolo?: string | null;
  status?: string | null;
  prioridade?: string | null;
  itens?: ItemPedido[] | string | null;
};

type Carrinho = Record<string, number>;

const OPCOES_STATUS: Array<{
  value: FiltroStatus;
  label: string;
  cor: string;
}> = [
  {
    value: 'TODOS',
    label: 'Todos',
    cor: C.azulGov,
  },
  {
    value: 'A_SEPARAR',
    label: 'A separar',
    cor: C.laranja,
  },
  {
    value: 'EM_TRANSITO',
    label: 'Em trânsito',
    cor: C.azulGov,
  },
  {
    value: 'ENTREGUE',
    label: 'Entregues',
    cor: C.verde,
  },
  {
    value: 'REJEITADO',
    label: 'Rejeitados',
    cor: C.vermelho,
  },
];

function obterParametro(valor?: string | string[]): string {
  if (Array.isArray(valor)) {
    return valor[0] || '';
  }

  return valor || '';
}

function numeroSeguro(valor: unknown): number {
  const numero = Number(valor);

  return Number.isFinite(numero) ? numero : 0;
}

function normalizarTexto(valor?: string | null): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function obterMensagemErro(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error
  ) {
    return String(
      (error as { message?: unknown }).message ||
        'Erro desconhecido.',
    );
  }

  return 'Não foi possível concluir a operação.';
}

function estoqueDisponivel(
  material: MaterialAlmoxarifado,
): number {
  return Math.max(
    0,
    numeroSeguro(material.estoque_atual) -
      numeroSeguro(material.estoque_reservado),
  );
}

function limiteMaterial(
  material: MaterialAlmoxarifado,
): number {
  return Math.max(
    0,
    Math.min(
      estoqueDisponivel(material),
      numeroSeguro(material.limite_por_requisicao),
    ),
  );
}

function normalizarItensPedido(
  itens?: ItemPedido[] | string | null,
): ItemPedido[] {
  if (Array.isArray(itens)) {
    return itens;
  }

  if (typeof itens === 'string') {
    try {
      const resultado = JSON.parse(itens);

      return Array.isArray(resultado) ? resultado : [];
    } catch {
      return [];
    }
  }

  return [];
}

function classificarStatus(status?: string | null): FiltroStatus {
  const valor = normalizarTexto(status);

  if (valor.includes('entregue')) {
    return 'ENTREGUE';
  }

  if (
    valor.includes('transito') ||
    valor.includes('despachado')
  ) {
    return 'EM_TRANSITO';
  }

  if (
    valor.includes('rejeitado') ||
    valor.includes('cancelado') ||
    valor.includes('negado')
  ) {
    return 'REJEITADO';
  }

  if (
    valor.includes('separar') ||
    valor.includes('analise') ||
    valor.includes('pendente')
  ) {
    return 'A_SEPARAR';
  }

  return 'TODOS';
}

function obterVisualStatus(status?: string | null) {
  const classificacao = classificarStatus(status);

  if (classificacao === 'ENTREGUE') {
    return {
      texto: status || 'Entregue',
      cor: C.verde,
      fundo: '#EAF7EC',
      icone: 'check-circle' as IconeMaterial,
    };
  }

  if (classificacao === 'EM_TRANSITO') {
    return {
      texto: status || 'Em trânsito',
      cor: C.azulGov,
      fundo: C.azulClaro,
      icone: 'local-shipping' as IconeMaterial,
    };
  }

  if (classificacao === 'REJEITADO') {
    return {
      texto: status || 'Rejeitado',
      cor: C.vermelho,
      fundo: '#FDECEC',
      icone: 'cancel' as IconeMaterial,
    };
  }

  return {
    texto: status || 'A separar',
    cor: C.laranja,
    fundo: '#FFF7E6',
    icone: 'inventory' as IconeMaterial,
  };
}

export default function AlmoxarifadoScreen() {
  const router = useRouter();
  const parametros = useLocalSearchParams<ParametrosUsuario>();

  const nome = obterParametro(parametros.nome);
  const matricula = obterParametro(parametros.matricula);
  const uorg = obterParametro(parametros.uorg);

  const [abaAtiva, setAbaAtiva] =
    useState<AbaAlmoxarifado>('catalogo');

  const [materiais, setMateriais] = useState<
    MaterialAlmoxarifado[]
  >([]);

  const [carregandoCatalogo, setCarregandoCatalogo] =
    useState(true);

  const [atualizandoCatalogo, setAtualizandoCatalogo] =
    useState(false);

  const [erroCatalogo, setErroCatalogo] = useState('');

  const [buscaMaterial, setBuscaMaterial] = useState('');
  const [categoria, setCategoria] = useState('Todos');

  const [carrinho, setCarrinho] = useState<Carrinho>({});
  const [modalCarrinho, setModalCarrinho] = useState(false);
  const [prioridade, setPrioridade] =
    useState<Prioridade>('NORMAL');
  const [enviando, setEnviando] = useState(false);

  const [historico, setHistorico] = useState<
    PedidoAlmoxarifado[]
  >([]);

  const [carregandoHistorico, setCarregandoHistorico] =
    useState(true);

  const [atualizandoHistorico, setAtualizandoHistorico] =
    useState(false);

  const [erroHistorico, setErroHistorico] = useState('');
  const [buscaPedido, setBuscaPedido] = useState('');
  const [filtroStatus, setFiltroStatus] =
    useState<FiltroStatus>('TODOS');

  const buscarCatalogo = useCallback(
    async (atualizacaoManual = false) => {
      if (atualizacaoManual) {
        setAtualizandoCatalogo(true);
      } else {
        setCarregandoCatalogo(true);
      }

      setErroCatalogo('');

      try {
        const { data, error } = await supabase
          .from('materiais_almoxarifado')
          .select(
            `
              id,
              codigo,
              nome,
              categoria,
              icone,
              unidade,
              estoque_atual,
              estoque_reservado,
              estoque_minimo,
              limite_por_requisicao,
              ativo
            `,
          )
          .eq('ativo', true)
          .order('categoria', { ascending: true })
          .order('nome', { ascending: true });

        if (error) {
          throw error;
        }

        const materiaisRecebidos =
          (data || []) as MaterialAlmoxarifado[];

        setMateriais(materiaisRecebidos);

        setCarrinho((carrinhoAtual) => {
          const carrinhoAjustado: Carrinho = {};

          Object.entries(carrinhoAtual).forEach(
            ([materialId, quantidade]) => {
              const material = materiaisRecebidos.find(
                (item) => String(item.id) === materialId,
              );

              if (!material) {
                return;
              }

              const quantidadePermitida = Math.min(
                quantidade,
                limiteMaterial(material),
              );

              if (quantidadePermitida > 0) {
                carrinhoAjustado[materialId] =
                  quantidadePermitida;
              }
            },
          );

          return carrinhoAjustado;
        });
      } catch (error) {
        console.error('Erro ao buscar catálogo:', error);

        setErroCatalogo(
          'Não foi possível carregar o estoque do Almoxarifado.',
        );
      } finally {
        setCarregandoCatalogo(false);
        setAtualizandoCatalogo(false);
      }
    },
    [],
  );

  const buscarHistorico = useCallback(
    async (atualizacaoManual = false) => {
      if (!matricula) {
        setErroHistorico(
          'Matrícula não informada. Abra o módulo pela tela de Logística.',
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
          .from('solicitacoes_almoxarifado')
          .select('*')
          .eq('matricula', matricula)
          .order('id', { ascending: false });

        if (error) {
          throw error;
        }

        setHistorico((data || []) as PedidoAlmoxarifado[]);
      } catch (error) {
        console.error(
          'Erro ao buscar pedidos do Almoxarifado:',
          error,
        );

        setErroHistorico(
          'Não foi possível consultar seus pedidos.',
        );
      } finally {
        setCarregandoHistorico(false);
        setAtualizandoHistorico(false);
      }
    },
    [matricula],
  );

  useEffect(() => {
    buscarCatalogo();
    buscarHistorico();
  }, [buscarCatalogo, buscarHistorico]);

  const categorias = useMemo(() => {
    const valores = Array.from(
      new Set(materiais.map((item) => item.categoria)),
    ).sort((a, b) => a.localeCompare(b));

    return ['Todos', ...valores];
  }, [materiais]);

  const materiaisFiltrados = useMemo(() => {
    const termo = normalizarTexto(buscaMaterial);

    return materiais.filter((material) => {
      const correspondeCategoria =
        categoria === 'Todos' ||
        material.categoria === categoria;

      const textoPesquisavel = normalizarTexto(
        `${material.codigo} ${material.nome} ${material.categoria}`,
      );

      const correspondeBusca =
        !termo || textoPesquisavel.includes(termo);

      return correspondeCategoria && correspondeBusca;
    });
  }, [materiais, categoria, buscaMaterial]);

  const itensCarrinho = useMemo(() => {
    return Object.entries(carrinho)
      .map(([materialId, quantidade]) => {
        const material = materiais.find(
          (item) => String(item.id) === materialId,
        );

        if (!material) {
          return null;
        }

        return {
          material,
          quantidade,
        };
      })
      .filter(
        (
          item,
        ): item is {
          material: MaterialAlmoxarifado;
          quantidade: number;
        } => item !== null,
      );
  }, [carrinho, materiais]);

  const totalUnidadesCarrinho = useMemo(() => {
    return itensCarrinho.reduce(
      (total, item) => total + item.quantidade,
      0,
    );
  }, [itensCarrinho]);

  const resumoEstoque = useMemo(() => {
    return materiais.reduce(
      (resultado, material) => {
        const disponivel = estoqueDisponivel(material);
        const minimo = numeroSeguro(material.estoque_minimo);

        resultado.unidadesDisponiveis += disponivel;

        if (disponivel <= minimo) {
          resultado.estoqueBaixo += 1;
        }

        if (disponivel === 0) {
          resultado.indisponiveis += 1;
        }

        return resultado;
      },
      {
        unidadesDisponiveis: 0,
        estoqueBaixo: 0,
        indisponiveis: 0,
      },
    );
  }, [materiais]);

  const historicoFiltrado = useMemo(() => {
    const termo = normalizarTexto(buscaPedido);

    return historico.filter((pedido) => {
      const correspondeStatus =
        filtroStatus === 'TODOS' ||
        classificarStatus(pedido.status) === filtroStatus;

      const itens = normalizarItensPedido(pedido.itens);

      const textoPesquisavel = normalizarTexto(
        [
          pedido.protocolo,
          pedido.status,
          ...itens.map((item) => item.nome),
        ].join(' '),
      );

      const correspondeBusca =
        !termo || textoPesquisavel.includes(termo);

      return correspondeStatus && correspondeBusca;
    });
  }, [historico, buscaPedido, filtroStatus]);

  const alterarQuantidade = (
    material: MaterialAlmoxarifado,
    incremento: number,
  ) => {
    const materialId = String(material.id);

    setCarrinho((carrinhoAtual) => {
      const quantidadeAtual = carrinhoAtual[materialId] || 0;
      const maximoPermitido = limiteMaterial(material);

      const novaQuantidade = Math.max(
        0,
        Math.min(
          maximoPermitido,
          quantidadeAtual + incremento,
        ),
      );

      const novoCarrinho = {
        ...carrinhoAtual,
      };

      if (novaQuantidade === 0) {
        delete novoCarrinho[materialId];
      } else {
        novoCarrinho[materialId] = novaQuantidade;
      }

      return novoCarrinho;
    });
  };

  const removerDoCarrinho = (materialId: number | string) => {
    setCarrinho((carrinhoAtual) => {
      const novoCarrinho = {
        ...carrinhoAtual,
      };

      delete novoCarrinho[String(materialId)];

      return novoCarrinho;
    });
  };

  const finalizarPedido = async () => {
    if (enviando) {
      return;
    }

    if (!matricula) {
      Alert.alert(
        'Identificação ausente',
        'Não foi possível identificar sua matrícula.',
      );
      return;
    }

    if (itensCarrinho.length === 0) {
      Alert.alert(
        'Carrinho vazio',
        'Selecione pelo menos um material.',
      );
      return;
    }

    const itemInvalido = itensCarrinho.find(
      ({ material, quantidade }) =>
        quantidade <= 0 ||
        quantidade > estoqueDisponivel(material) ||
        quantidade >
          numeroSeguro(material.limite_por_requisicao),
    );

    if (itemInvalido) {
      Alert.alert(
        'Estoque atualizado',
        `A quantidade de ${itemInvalido.material.nome} não está mais disponível. Atualize o catálogo.`,
      );

      await buscarCatalogo(true);
      return;
    }

    setEnviando(true);

    try {
      const itensRpc = itensCarrinho.map(
        ({ material, quantidade }) => ({
          material_id: Number(material.id),
          qtd: quantidade,
        }),
      );

      const { data, error } = await supabase.rpc(
        'criar_requisicao_almoxarifado',
        {
          p_matricula: matricula,
          p_nome_servidor: nome || 'Servidor',
          p_uorg: uorg || 'Unidade não informada',
          p_prioridade: prioridade,
          p_itens: itensRpc,
        },
      );

      if (error) {
        throw error;
      }

      const resultado = Array.isArray(data) ? data[0] : data;

      const protocolo =
        resultado?.protocolo || 'gerado pelo sistema';

      setCarrinho({});
      setPrioridade('NORMAL');
      setModalCarrinho(false);

      await Promise.all([
        buscarCatalogo(true),
        buscarHistorico(true),
      ]);

      setAbaAtiva('pedidos');

      Alert.alert(
        'Requisição protocolada',
        `Protocolo ${protocolo}. Os materiais foram reservados no estoque.`,
      );
    } catch (error) {
      console.error(
        'Erro ao criar requisição de Almoxarifado:',
        error,
      );

      Alert.alert(
        'Não foi possível protocolar',
        obterMensagemErro(error),
      );

      await buscarCatalogo(true);
    } finally {
      setEnviando(false);
    }
  };

  const atualizarAba = () => {
    if (abaAtiva === 'catalogo') {
      buscarCatalogo(true);
    } else {
      buscarHistorico(true);
    }
  };

  const atualizandoAba =
    abaAtiva === 'catalogo'
      ? atualizandoCatalogo
      : atualizandoHistorico;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={C.azulGov}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={C.branco}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerEyebrow}>LOGÍSTICA</Text>
          <Text style={styles.headerTitle}>Almoxarifado</Text>
        </View>

        <View style={styles.headerButton}>
          <MaterialIcons
            name="inventory"
            size={25}
            color={C.branco}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          totalUnidadesCarrinho > 0 &&
            styles.scrollContentComCarrinho,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={atualizandoAba}
            onRefresh={atualizarAba}
            colors={[C.azulGov]}
            tintColor={C.azulGov}
          />
        }
      >
        <View style={styles.contentWrapper}>
          <View style={styles.breadcrumb}>
            <MaterialIcons
              name="home"
              size={14}
              color={C.textoSecundario}
            />

            <Text style={styles.breadcrumbText}>
              Logística / Almoxarifado
            </Text>
          </View>

          <View style={styles.identificacaoCard}>
            <View style={styles.identificacaoIcone}>
              <MaterialIcons
                name="person"
                size={23}
                color={C.azulGov}
              />
            </View>

            <View style={styles.identificacaoTexto}>
              <Text style={styles.identificacaoLabel}>
                REQUISITANTE
              </Text>

              <Text style={styles.identificacaoNome}>
                {nome || 'Servidor Público'}
              </Text>

              <View style={styles.identificacaoDetalhes}>
                <MaterialIcons
                  name="badge"
                  size={14}
                  color={C.textoSecundario}
                />

                <Text style={styles.identificacaoDetalhe}>
                  {matricula || 'Matrícula não informada'}
                </Text>

                <View style={styles.separador} />

                <MaterialIcons
                  name="business"
                  size={14}
                  color={C.textoSecundario}
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
                abaAtiva === 'catalogo' &&
                  styles.tabButtonAtivo,
              ]}
              onPress={() => setAbaAtiva('catalogo')}
            >
              <MaterialIcons
                name="storefront"
                size={20}
                color={
                  abaAtiva === 'catalogo'
                    ? C.azulGov
                    : C.textoSecundario
                }
              />

              <Text
                style={[
                  styles.tabText,
                  abaAtiva === 'catalogo' &&
                    styles.tabTextAtivo,
                ]}
              >
                Catálogo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                abaAtiva === 'pedidos' &&
                  styles.tabButtonAtivo,
              ]}
              onPress={() => setAbaAtiva('pedidos')}
            >
              <MaterialIcons
                name="receipt-long"
                size={20}
                color={
                  abaAtiva === 'pedidos'
                    ? C.azulGov
                    : C.textoSecundario
                }
              />

              <Text
                style={[
                  styles.tabText,
                  abaAtiva === 'pedidos' &&
                    styles.tabTextAtivo,
                ]}
              >
                Meus pedidos
              </Text>

              {historico.length > 0 && (
                <View style={styles.tabContador}>
                  <Text style={styles.tabContadorText}>
                    {historico.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {abaAtiva === 'catalogo' ? (
            <>
              <Text style={styles.sectionTitle}>
                Resumo do estoque
              </Text>

              <View style={styles.resumoGrid}>
                <View style={styles.resumoCard}>
                  <View
                    style={[
                      styles.resumoIcone,
                      { backgroundColor: C.azulClaro },
                    ]}
                  >
                    <MaterialIcons
                      name="category"
                      size={21}
                      color={C.azulGov}
                    />
                  </View>

                  <Text style={styles.resumoValor}>
                    {materiais.length}
                  </Text>

                  <Text style={styles.resumoLabel}>
                    Materiais
                  </Text>
                </View>

                <View style={styles.resumoCard}>
                  <View
                    style={[
                      styles.resumoIcone,
                      { backgroundColor: '#EAF7EC' },
                    ]}
                  >
                    <MaterialIcons
                      name="inventory-2"
                      size={21}
                      color={C.verde}
                    />
                  </View>

                  <Text style={styles.resumoValor}>
                    {resumoEstoque.unidadesDisponiveis}
                  </Text>

                  <Text style={styles.resumoLabel}>
                    Unidades disponíveis
                  </Text>
                </View>

                <View style={styles.resumoCard}>
                  <View
                    style={[
                      styles.resumoIcone,
                      { backgroundColor: '#FFF7E6' },
                    ]}
                  >
                    <MaterialIcons
                      name="warning-amber"
                      size={21}
                      color={C.laranja}
                    />
                  </View>

                  <Text style={styles.resumoValor}>
                    {resumoEstoque.estoqueBaixo}
                  </Text>

                  <Text style={styles.resumoLabel}>
                    Estoque baixo
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.resumoCard,
                    totalUnidadesCarrinho > 0 &&
                      styles.resumoCardAtivo,
                  ]}
                  onPress={() => {
                    if (totalUnidadesCarrinho > 0) {
                      setModalCarrinho(true);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.resumoIcone,
                      { backgroundColor: '#F3E8FF' },
                    ]}
                  >
                    <MaterialIcons
                      name="shopping-cart"
                      size={21}
                      color={C.roxo}
                    />
                  </View>

                  <Text style={styles.resumoValor}>
                    {totalUnidadesCarrinho}
                  </Text>

                  <Text style={styles.resumoLabel}>
                    No carrinho
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.catalogoHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Catálogo de materiais
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    Estoque atualizado em tempo real
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => buscarCatalogo(true)}
                  disabled={atualizandoCatalogo}
                >
                  {atualizandoCatalogo ? (
                    <ActivityIndicator
                      size="small"
                      color={C.azulGov}
                    />
                  ) : (
                    <MaterialIcons
                      name="refresh"
                      size={21}
                      color={C.azulGov}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.filtrosCard}>
                <View style={styles.searchContainer}>
                  <MaterialIcons
                    name="search"
                    size={20}
                    color={C.textoSecundario}
                  />

                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar material ou código"
                    placeholderTextColor="#94A3B8"
                    value={buscaMaterial}
                    onChangeText={setBuscaMaterial}
                  />

                  {buscaMaterial ? (
                    <TouchableOpacity
                      onPress={() => setBuscaMaterial('')}
                      style={styles.clearButton}
                    >
                      <MaterialIcons
                        name="close"
                        size={19}
                        color={C.textoSecundario}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categorias}
                >
                  {categorias.map((item) => {
                    const selecionada = categoria === item;

                    return (
                      <TouchableOpacity
                        key={item}
                        style={[
                          styles.categoriaChip,
                          selecionada &&
                            styles.categoriaChipAtivo,
                        ]}
                        onPress={() => setCategoria(item)}
                      >
                        <Text
                          style={[
                            styles.categoriaText,
                            selecionada &&
                              styles.categoriaTextAtivo,
                          ]}
                        >
                          {item}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {erroCatalogo ? (
                <View style={styles.errorCard}>
                  <MaterialIcons
                    name="error-outline"
                    size={22}
                    color={C.vermelho}
                  />

                  <View style={styles.errorTextContainer}>
                    <Text style={styles.errorTitle}>
                      Catálogo indisponível
                    </Text>

                    <Text style={styles.errorText}>
                      {erroCatalogo}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => buscarCatalogo(true)}
                  >
                    <Text style={styles.errorRetry}>
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {carregandoCatalogo ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator
                    size="large"
                    color={C.azulGov}
                  />

                  <Text style={styles.loadingText}>
                    Consultando estoque...
                  </Text>
                </View>
              ) : materiaisFiltrados.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="archive-search-outline"
                    size={45}
                    color={C.textoSecundario}
                  />

                  <Text style={styles.emptyTitle}>
                    Nenhum material encontrado
                  </Text>

                  <Text style={styles.emptyText}>
                    Altere a busca ou selecione outra categoria.
                  </Text>
                </View>
              ) : (
                <View style={styles.catalogoGrid}>
                  {materiaisFiltrados.map((material) => {
                    const materialId = String(material.id);
                    const quantidade =
                      carrinho[materialId] || 0;

                    const disponivel =
                      estoqueDisponivel(material);

                    const minimo = numeroSeguro(
                      material.estoque_minimo,
                    );

                    const limite = numeroSeguro(
                      material.limite_por_requisicao,
                    );

                    const maximoPermitido =
                      limiteMaterial(material);

                    const selecionado = quantidade > 0;
                    const indisponivel = disponivel === 0;
                    const estoqueBaixo =
                      disponivel > 0 && disponivel <= minimo;

                    const adicionarDesabilitado =
                      indisponivel ||
                      quantidade >= maximoPermitido;

                    return (
                      <View
                        key={materialId}
                        style={[
                          styles.materialCard,
                          selecionado &&
                            styles.materialCardSelecionado,
                        ]}
                      >
                        <View style={styles.materialTop}>
                          <View
                            style={[
                              styles.materialIcone,
                              selecionado &&
                                styles.materialIconeSelecionado,
                            ]}
                          >
                            <MaterialIcons
                              name={
                                (material.icone ||
                                  'inventory-2') as IconeMaterial
                              }
                              size={24}
                              color={
                                selecionado
                                  ? C.branco
                                  : C.azulGov
                              }
                            />
                          </View>

                          <View
                            style={[
                              styles.estoqueBadge,
                              indisponivel
                                ? styles.estoqueIndisponivel
                                : estoqueBaixo
                                  ? styles.estoqueBaixo
                                  : styles.estoqueDisponivel,
                            ]}
                          >
                            <Text
                              style={[
                                styles.estoqueBadgeText,
                                indisponivel
                                  ? styles.estoqueIndisponivelText
                                  : estoqueBaixo
                                    ? styles.estoqueBaixoText
                                    : styles.estoqueDisponivelText,
                              ]}
                            >
                              {indisponivel
                                ? 'Indisponível'
                                : estoqueBaixo
                                  ? 'Estoque baixo'
                                  : 'Disponível'}
                            </Text>
                          </View>
                        </View>

                        <Text style={styles.materialCodigo}>
                          {material.codigo}
                        </Text>

                        <Text style={styles.materialNome}>
                          {material.nome}
                        </Text>

                        <Text style={styles.materialCategoria}>
                          {material.categoria}
                        </Text>

                        <View style={styles.stockInfo}>
                          <View>
                            <Text style={styles.stockLabel}>
                              Estoque disponível
                            </Text>

                            <Text
                              style={[
                                styles.stockValue,
                                indisponivel && {
                                  color: C.vermelho,
                                },
                              ]}
                            >
                              {disponivel} {material.unidade}
                            </Text>
                          </View>

                          <Text style={styles.stockLimit}>
                            Limite: {limite}
                          </Text>
                        </View>

                        <View style={styles.stepper}>
                          <TouchableOpacity
                            style={[
                              styles.stepperButton,
                              quantidade === 0 &&
                                styles.stepperButtonDisabled,
                            ]}
                            onPress={() =>
                              alterarQuantidade(material, -1)
                            }
                            disabled={quantidade === 0}
                          >
                            <MaterialIcons
                              name="remove"
                              size={19}
                              color={
                                quantidade > 0
                                  ? C.texto
                                  : C.textoSecundario
                              }
                            />
                          </TouchableOpacity>

                          <View style={styles.stepperQuantidade}>
                            <Text
                              style={styles.stepperQuantidadeText}
                            >
                              {quantidade}
                            </Text>

                            <Text
                              style={styles.stepperUnidadeText}
                            >
                              {material.unidade}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.stepperButton,
                              adicionarDesabilitado &&
                                styles.stepperButtonDisabled,
                            ]}
                            onPress={() =>
                              alterarQuantidade(material, 1)
                            }
                            disabled={adicionarDesabilitado}
                          >
                            <MaterialIcons
                              name="add"
                              size={19}
                              color={
                                adicionarDesabilitado
                                  ? C.textoSecundario
                                  : C.azulGov
                              }
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.catalogoHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    Meus pedidos
                  </Text>

                  <Text style={styles.sectionSubtitle}>
                    {historicoFiltrado.length}{' '}
                    {historicoFiltrado.length === 1
                      ? 'pedido encontrado'
                      : 'pedidos encontrados'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => buscarHistorico(true)}
                  disabled={atualizandoHistorico}
                >
                  {atualizandoHistorico ? (
                    <ActivityIndicator
                      size="small"
                      color={C.azulGov}
                    />
                  ) : (
                    <MaterialIcons
                      name="refresh"
                      size={21}
                      color={C.azulGov}
                    />
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.filtrosCard}>
                <View style={styles.searchContainer}>
                  <MaterialIcons
                    name="search"
                    size={20}
                    color={C.textoSecundario}
                  />

                  <TextInput
                    style={styles.searchInput}
                    placeholder="Buscar protocolo ou material"
                    placeholderTextColor="#94A3B8"
                    value={buscaPedido}
                    onChangeText={setBuscaPedido}
                  />

                  {buscaPedido ? (
                    <TouchableOpacity
                      onPress={() => setBuscaPedido('')}
                      style={styles.clearButton}
                    >
                      <MaterialIcons
                        name="close"
                        size={19}
                        color={C.textoSecundario}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categorias}
                >
                  {OPCOES_STATUS.map((opcao) => {
                    const selecionada =
                      filtroStatus === opcao.value;

                    return (
                      <TouchableOpacity
                        key={opcao.value}
                        style={[
                          styles.categoriaChip,
                          selecionada && {
                            backgroundColor: `${opcao.cor}14`,
                            borderColor: opcao.cor,
                          },
                        ]}
                        onPress={() =>
                          setFiltroStatus(opcao.value)
                        }
                      >
                        <Text
                          style={[
                            styles.categoriaText,
                            selecionada && {
                              color: opcao.cor,
                              fontWeight: '900',
                            },
                          ]}
                        >
                          {opcao.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {erroHistorico ? (
                <View style={styles.errorCard}>
                  <MaterialIcons
                    name="error-outline"
                    size={22}
                    color={C.vermelho}
                  />

                  <View style={styles.errorTextContainer}>
                    <Text style={styles.errorTitle}>
                      Pedidos indisponíveis
                    </Text>

                    <Text style={styles.errorText}>
                      {erroHistorico}
                    </Text>
                  </View>
                </View>
              ) : null}

              {carregandoHistorico ? (
                <View style={styles.loadingCard}>
                  <ActivityIndicator
                    size="large"
                    color={C.azulGov}
                  />

                  <Text style={styles.loadingText}>
                    Consultando pedidos...
                  </Text>
                </View>
              ) : historicoFiltrado.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="inbox-remove-outline"
                    size={48}
                    color={C.textoSecundario}
                  />

                  <Text style={styles.emptyTitle}>
                    Nenhum pedido encontrado
                  </Text>

                  <Text style={styles.emptyText}>
                    Registre uma requisição ou altere os filtros.
                  </Text>

                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={() => setAbaAtiva('catalogo')}
                  >
                    <MaterialIcons
                      name="add-shopping-cart"
                      size={18}
                      color={C.branco}
                    />

                    <Text style={styles.emptyButtonText}>
                      Abrir catálogo
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  {historicoFiltrado.map((pedido) => {
                    const itens = normalizarItensPedido(
                      pedido.itens,
                    );

                    const totalPedido = itens.reduce(
                      (total, item) =>
                        total + numeroSeguro(item.qtd),
                      0,
                    );

                    const status = obterVisualStatus(
                      pedido.status,
                    );

                    const prioridadePedido =
                      prioridadeSegura(pedido.prioridade);

                    const prioridadeVisual =
                      CORES_PRIORIDADE[prioridadePedido];

                    return (
                      <View
                        key={String(pedido.id)}
                        style={styles.pedidoCard}
                      >
                        <View style={styles.pedidoHeader}>
                          <View style={styles.pedidoHeaderText}>
                            <Text
                              style={styles.pedidoProtocoloLabel}
                            >
                              PROTOCOLO
                            </Text>

                            <Text style={styles.pedidoProtocolo}>
                              {pedido.protocolo ||
                                `ALM-${pedido.id}`}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: status.fundo,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name={status.icone}
                              size={14}
                              color={status.cor}
                            />

                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: status.cor },
                              ]}
                            >
                              {status.texto}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.pedidoResumo}>
                          <MaterialIcons
                            name="inventory-2"
                            size={18}
                            color={C.azulGov}
                          />

                          <Text style={styles.pedidoResumoText}>
                            {itens.length}{' '}
                            {itens.length === 1
                              ? 'material'
                              : 'materiais'}{' '}
                            • {totalPedido}{' '}
                            {totalPedido === 1
                              ? 'unidade'
                              : 'unidades'}
                          </Text>
                        </View>

                        <View style={styles.pedidoItens}>
                          {itens.map((item, index) => (
                            <View
                              key={`${pedido.id}-${item.material_id || item.id || index}`}
                              style={styles.pedidoItem}
                            >
                              <View
                                style={styles.pedidoItemQuantidade}
                              >
                                <Text
                                  style={
                                    styles.pedidoItemQuantidadeText
                                  }
                                >
                                  {numeroSeguro(item.qtd)}x
                                </Text>
                              </View>

                              <View
                                style={styles.pedidoItemInfo}
                              >
                                <Text
                                  style={styles.pedidoItemNome}
                                >
                                  {item.nome ||
                                    'Material não identificado'}
                                </Text>

                                {item.codigo ? (
                                  <Text
                                    style={styles.pedidoItemCodigo}
                                  >
                                    {item.codigo}
                                  </Text>
                                ) : null}
                              </View>
                            </View>
                          ))}
                        </View>

                        <View style={styles.pedidoFooter}>
                          <View
                            style={[
                              styles.prioridadeBadge,
                              {
                                backgroundColor:
                                  prioridadeVisual.fundo,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.prioridadeBadgeText,
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

                          <Text style={styles.pedidoId}>
                            Pedido #{pedido.id}
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
              color={C.azulGov}
            />

            <Text style={styles.institutionalFooterText}>
              Estoque e requisições integrados ao Supabase
            </Text>
          </View>
        </View>
      </ScrollView>

      {totalUnidadesCarrinho > 0 && (
        <View style={styles.footerCarrinho}>
          <View style={styles.footerCarrinhoInfo}>
            <View style={styles.footerCarrinhoIcone}>
              <MaterialIcons
                name="shopping-cart"
                size={21}
                color={C.azulGov}
              />
            </View>

            <View>
              <Text style={styles.footerCarrinhoTitle}>
                {totalUnidadesCarrinho}{' '}
                {totalUnidadesCarrinho === 1
                  ? 'unidade'
                  : 'unidades'}
              </Text>

              <Text style={styles.footerCarrinhoSubtitle}>
                {itensCarrinho.length}{' '}
                {itensCarrinho.length === 1
                  ? 'material selecionado'
                  : 'materiais selecionados'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setModalCarrinho(true)}
          >
            <Text style={styles.reviewButtonText}>
              Revisar
            </Text>

            <MaterialIcons
              name="arrow-forward"
              size={18}
              color={C.branco}
            />
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={modalCarrinho}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!enviando) {
            setModalCarrinho(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>
                  REVISÃO DA REQUISIÇÃO
                </Text>

                <Text style={styles.modalTitle}>
                  Carrinho de materiais
                </Text>
              </View>

              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalCarrinho(false)}
                disabled={enviando}
              >
                <MaterialIcons
                  name="close"
                  size={23}
                  color={C.texto}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalIdentificacao}>
                <MaterialIcons
                  name="business"
                  size={19}
                  color={C.azulGov}
                />

                <View style={styles.modalIdentificacaoText}>
                  <Text style={styles.modalIdentificacaoLabel}>
                    UNIDADE REQUISITANTE
                  </Text>

                  <Text style={styles.modalIdentificacaoValue}>
                    {uorg || 'Unidade não informada'}
                  </Text>
                </View>
              </View>

              {itensCarrinho.map(
                ({ material, quantidade }) => (
                  <View
                    key={String(material.id)}
                    style={styles.modalItem}
                  >
                    <View style={styles.modalItemIcon}>
                      <MaterialIcons
                        name={
                          (material.icone ||
                            'inventory-2') as IconeMaterial
                        }
                        size={21}
                        color={C.azulGov}
                      />
                    </View>

                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>
                        {material.nome}
                      </Text>

                      <Text style={styles.modalItemDetails}>
                        {quantidade} {material.unidade} •{' '}
                        {material.codigo}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.modalRemove}
                      onPress={() =>
                        removerDoCarrinho(material.id)
                      }
                      disabled={enviando}
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={21}
                        color={C.vermelho}
                      />
                    </TouchableOpacity>
                  </View>
                ),
              )}

              <View style={styles.modalPrioridade}>
                <Text style={styles.modalPrioridadeTitle}>
                  Prioridade administrativa
                </Text>

                <Text style={styles.modalPrioridadeText}>
                  A prioridade ficará visível para a Central de
                  Gestão.
                </Text>

                <PrioritySelector
                  value={prioridade}
                  onChange={setPrioridade}
                  compact
                />
              </View>

              <View style={styles.reservaInfo}>
                <MaterialIcons
                  name="lock-clock"
                  size={19}
                  color={C.azulGov}
                />

                <Text style={styles.reservaInfoText}>
                  Ao confirmar, as quantidades serão reservadas
                  automaticamente no estoque.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View>
                <Text style={styles.modalTotalLabel}>
                  TOTAL DA REQUISIÇÃO
                </Text>

                <Text style={styles.modalTotalValue}>
                  {totalUnidadesCarrinho}{' '}
                  {totalUnidadesCarrinho === 1
                    ? 'unidade'
                    : 'unidades'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  enviando && styles.confirmButtonDisabled,
                ]}
                onPress={finalizarPedido}
                disabled={
                  enviando || itensCarrinho.length === 0
                }
              >
                {enviando ? (
                  <ActivityIndicator
                    size="small"
                    color={C.branco}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name="check"
                      size={19}
                      color={C.branco}
                    />

                    <Text style={styles.confirmButtonText}>
                      Protocolar
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.fundo,
  },

  header: {
    minHeight: 68,
    backgroundColor: C.azulGov,
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
    color: C.branco,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },

  scrollContentComCarrinho: {
    paddingBottom: 125,
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
    color: C.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 5,
  },

  identificacaoCard: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
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
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  identificacaoTexto: {
    flex: 1,
  },

  identificacaoLabel: {
    color: C.azulGov,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  identificacaoNome: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 2,
  },

  identificacaoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  identificacaoDetalhe: {
    color: C.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  identificacaoUnidade: {
    flex: 1,
    color: C.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },

  separador: {
    width: 1,
    height: 13,
    backgroundColor: C.borda,
    marginHorizontal: 9,
  },

  tabsContainer: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
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
  },

  tabButtonAtivo: {
    backgroundColor: C.azulClaro,
  },

  tabText: {
    color: C.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
  },

  tabTextAtivo: {
    color: C.azulGov,
    fontWeight: '900',
  },

  tabContador: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.azulGov,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },

  tabContadorText: {
    color: C.branco,
    fontSize: 9,
    fontWeight: '900',
  },

  sectionTitle: {
    color: C.azulEscuro,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 8,
    marginBottom: 11,
  },

  sectionSubtitle: {
    color: C.textoSecundario,
    fontSize: 11,
    marginTop: -7,
  },

  resumoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 18,
  },

  resumoCard: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 125,
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 13,
    padding: 13,
    margin: 5,
  },

  resumoCardAtivo: {
    borderColor: C.roxo,
  },

  resumoIcone: {
    width: 37,
    height: 37,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resumoValor: {
    color: C.texto,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 9,
  },

  resumoLabel: {
    color: C.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },

  catalogoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  refreshButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  filtrosCard: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 13,
    padding: 12,
    marginBottom: 14,
  },

  searchContainer: {
    minHeight: 45,
    backgroundColor: C.cinzaClaro,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 11,
  },

  searchInput: {
    flex: 1,
    minHeight: 43,
    color: C.texto,
    fontSize: 13,
    marginLeft: 8,
  },

  clearButton: {
    padding: 5,
  },

  categorias: {
    paddingBottom: 2,
  },

  categoriaChip: {
    minHeight: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: C.borda,
    backgroundColor: C.branco,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 13,
    marginRight: 7,
  },

  categoriaChipAtivo: {
    backgroundColor: C.azulClaro,
    borderColor: C.azulGov,
  },

  categoriaText: {
    color: C.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
  },

  categoriaTextAtivo: {
    color: C.azulGov,
    fontWeight: '900',
  },

  catalogoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },

  materialCard: {
    flexGrow: 1,
    flexBasis: 290,
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 14,
    padding: 15,
    margin: 5,
    elevation: 1,
  },

  materialCardSelecionado: {
    borderColor: C.azulGov,
    elevation: 3,
  },

  materialTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  materialIcone: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  materialIconeSelecionado: {
    backgroundColor: C.azulGov,
  },

  estoqueBadge: {
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  estoqueDisponivel: {
    backgroundColor: '#EAF7EC',
  },

  estoqueBaixo: {
    backgroundColor: '#FFF7E6',
  },

  estoqueIndisponivel: {
    backgroundColor: '#FDECEC',
  },

  estoqueBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  estoqueDisponivelText: {
    color: C.verde,
  },

  estoqueBaixoText: {
    color: C.laranja,
  },

  estoqueIndisponivelText: {
    color: C.vermelho,
  },

  materialCodigo: {
    color: C.azulGov,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 12,
  },

  materialNome: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    marginTop: 3,
  },

  materialCategoria: {
    color: C.textoSecundario,
    fontSize: 10,
    marginTop: 3,
  },

  stockInfo: {
    backgroundColor: C.cinzaClaro,
    borderRadius: 9,
    padding: 10,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  stockLabel: {
    color: C.textoSecundario,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  stockValue: {
    color: C.verde,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
  },

  stockLimit: {
    color: C.textoSecundario,
    fontSize: 9,
    fontWeight: '700',
  },

  stepper: {
    minHeight: 43,
    backgroundColor: C.cinzaClaro,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 4,
  },

  stepperButton: {
    width: 35,
    height: 35,
    borderRadius: 18,
    backgroundColor: C.branco,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
  },

  stepperButtonDisabled: {
    opacity: 0.4,
  },

  stepperQuantidade: {
    flex: 1,
    alignItems: 'center',
  },

  stepperQuantidadeText: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '900',
  },

  stepperUnidadeText: {
    color: C.textoSecundario,
    fontSize: 8,
    marginTop: -1,
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
    color: C.vermelho,
    fontSize: 11,
    fontWeight: '800',
  },

  errorText: {
    color: '#7F1D1D',
    fontSize: 9,
    marginTop: 2,
  },

  errorRetry: {
    color: C.vermelho,
    fontSize: 9,
    fontWeight: '900',
  },

  loadingCard: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 14,
    padding: 35,
    alignItems: 'center',
  },

  loadingText: {
    color: C.textoSecundario,
    fontSize: 12,
    marginTop: 10,
  },

  emptyState: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: C.borda,
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
  },

  emptyTitle: {
    color: C.texto,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 11,
  },

  emptyText: {
    color: C.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },

  emptyButton: {
    minHeight: 41,
    borderRadius: 21,
    backgroundColor: C.azulGov,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginTop: 13,
  },

  emptyButtonText: {
    color: C.branco,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 6,
  },

  pedidoCard: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    elevation: 1,
  },

  pedidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  pedidoHeaderText: {
    flex: 1,
    marginRight: 10,
  },

  pedidoProtocoloLabel: {
    color: C.textoSecundario,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  pedidoProtocolo: {
    color: C.azulGov,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    marginLeft: 4,
  },

  pedidoResumo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.azulClaro,
    borderRadius: 9,
    padding: 10,
    marginTop: 13,
  },

  pedidoResumoText: {
    color: C.azulEscuro,
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 7,
  },

  pedidoItens: {
    marginTop: 10,
  },

  pedidoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.cinzaClaro,
  },

  pedidoItemQuantidade: {
    minWidth: 34,
    height: 27,
    borderRadius: 14,
    backgroundColor: C.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  pedidoItemQuantidadeText: {
    color: C.azulGov,
    fontSize: 10,
    fontWeight: '900',
  },

  pedidoItemInfo: {
    flex: 1,
    marginLeft: 9,
  },

  pedidoItemNome: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '700',
  },

  pedidoItemCodigo: {
    color: C.textoSecundario,
    fontSize: 8,
    marginTop: 2,
  },

  pedidoFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },

  prioridadeBadge: {
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  prioridadeBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
  },

  pedidoId: {
    color: C.textoSecundario,
    fontSize: 9,
    fontWeight: '600',
  },

  institutionalFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 25,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.borda,
  },

  institutionalFooterText: {
    color: C.textoSecundario,
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 6,
  },

  footerCarrinho: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    backgroundColor: C.branco,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    paddingHorizontal: 17,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: -3,
    },
  },

  footerCarrinhoInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerCarrinhoIcone: {
    width: 41,
    height: 41,
    borderRadius: 21,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },

  footerCarrinhoTitle: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '900',
  },

  footerCarrinhoSubtitle: {
    color: C.textoSecundario,
    fontSize: 9,
    marginTop: 2,
  },

  reviewButton: {
    minHeight: 43,
    borderRadius: 22,
    backgroundColor: C.azulGov,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  reviewButtonText: {
    color: C.branco,
    fontSize: 11,
    fontWeight: '900',
    marginRight: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000080',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },

  modalContent: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    backgroundColor: C.branco,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
  },

  modalHeader: {
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: C.borda,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalEyebrow: {
    color: C.azulGov,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },

  modalTitle: {
    color: C.texto,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },

  modalClose: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: C.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalScroll: {
    paddingHorizontal: 18,
  },

  modalIdentificacao: {
    backgroundColor: C.azulClaro,
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 8,
  },

  modalIdentificacaoText: {
    flex: 1,
    marginLeft: 9,
  },

  modalIdentificacaoLabel: {
    color: C.textoSecundario,
    fontSize: 8,
    fontWeight: '800',
  },

  modalIdentificacaoValue: {
    color: C.azulEscuro,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },

  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: C.borda,
    paddingVertical: 12,
  },

  modalItemIcon: {
    width: 41,
    height: 41,
    borderRadius: 11,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalItemInfo: {
    flex: 1,
    marginLeft: 10,
  },

  modalItemName: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '800',
  },

  modalItemDetails: {
    color: C.textoSecundario,
    fontSize: 9,
    marginTop: 3,
  },

  modalRemove: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalPrioridade: {
    backgroundColor: C.cinzaClaro,
    borderRadius: 12,
    padding: 14,
    marginTop: 15,
  },

  modalPrioridadeTitle: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '900',
  },

  modalPrioridadeText: {
    color: C.textoSecundario,
    fontSize: 9,
    marginTop: 3,
    marginBottom: 11,
  },

  reservaInfo: {
    backgroundColor: C.azulClaro,
    borderRadius: 11,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 15,
  },

  reservaInfoText: {
    flex: 1,
    color: C.azulEscuro,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 8,
  },

  modalFooter: {
    minHeight: 79,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  modalTotalLabel: {
    color: C.textoSecundario,
    fontSize: 8,
    fontWeight: '800',
  },

  modalTotalValue: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },

  confirmButton: {
    minHeight: 45,
    borderRadius: 23,
    backgroundColor: C.azulGov,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 17,
  },

  confirmButtonDisabled: {
    opacity: 0.6,
  },

  confirmButtonText: {
    color: C.branco,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
  },
});