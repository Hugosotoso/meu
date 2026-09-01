/**
 * Super App Gov — Módulo Logística e Frota
 * Ficheiro: src/app/logistica/index.tsx
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

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
  roxo: '#7C3AED',
};

type IconeMaterial = React.ComponentProps<typeof MaterialIcons>['name'];

type ParametrosUsuario = {
  nome?: string;
  cargo?: string;
  uorg?: string;
  matricula?: string;
  cpf?: string;
};

type SolicitacaoFrota = {
  id: number | string;
  protocolo?: string | null;
  destino?: string | null;
  data_ida?: string | null;
  status?: string | null;
  prioridade?: string | null;
};

type FiltroFrota =
  | 'TODOS'
  | 'EM_ANALISE'
  | 'APROVADO'
  | 'REJEITADO';

type ResumoCardProps = {
  titulo: string;
  valor: number;
  icone: IconeMaterial;
  cor: string;
  carregando?: boolean;
  onPress: () => void;
};

type ServiceCardProps = {
  icon: IconeMaterial;
  title: string;
  subtitle: string;
  color: string;
  ultimo?: boolean;
  onPress: () => void;
};

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

function classificarStatus(status?: string | null): FiltroFrota {
  const statusNormalizado = normalizarTexto(status);

  if (statusNormalizado.includes('aprov')) {
    return 'APROVADO';
  }

  if (
    statusNormalizado.includes('rejeit') ||
    statusNormalizado.includes('negad')
  ) {
    return 'REJEITADO';
  }

  if (
    statusNormalizado.includes('analise') ||
    statusNormalizado.includes('pendente') ||
    statusNormalizado.includes('aguard')
  ) {
    return 'EM_ANALISE';
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

function formatarData(data?: string | null): string {
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

function mascararCpf(cpf: string): string {
  const numeros = cpf.replace(/\D/g, '');

  if (numeros.length !== 11) {
    return cpf ? 'CPF protegido' : 'Não informado';
  }

  return `***.***.${numeros.slice(6, 9)}-**`;
}

function ResumoCard({
  titulo,
  valor,
  icone,
  cor,
  carregando,
  onPress,
}: ResumoCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.resumoCard,
        {
          borderColor: `${cor}30`,
          backgroundColor: G_COLORS.branco,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}: ${valor}`}
    >
      <View
        style={[
          styles.resumoIcone,
          {
            backgroundColor: `${cor}14`,
          },
        ]}
      >
        <MaterialIcons name={icone} size={22} color={cor} />
      </View>

      {carregando ? (
        <ActivityIndicator
          size="small"
          color={cor}
          style={styles.resumoLoading}
        />
      ) : (
        <Text style={[styles.resumoValor, { color: cor }]}>
          {valor}
        </Text>
      )}

      <Text style={styles.resumoTitulo}>{titulo}</Text>
    </TouchableOpacity>
  );
}

function ServiceCard({
  icon,
  title,
  subtitle,
  color,
  ultimo = false,
  onPress,
}: ServiceCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        ultimo && styles.serviceCardUltimo,
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
    >
      <View
        style={[
          styles.serviceIcon,
          {
            backgroundColor: `${color}14`,
          },
        ]}
      >
        <MaterialIcons name={icon} size={27} color={color} />
      </View>

      <View style={styles.serviceTextContainer}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceSubtitle}>{subtitle}</Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={24}
        color={G_COLORS.cinzaTexto}
      />
    </TouchableOpacity>
  );
}

export default function LogisticaHome() {
  const router = useRouter();

  const parametros = useLocalSearchParams<ParametrosUsuario>();

  const nome = obterParametro(parametros.nome);
  const cargo = obterParametro(parametros.cargo);
  const uorg = obterParametro(parametros.uorg);
  const matricula = obterParametro(parametros.matricula);
  const cpf = obterParametro(parametros.cpf);

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoFrota[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erroResumo, setErroResumo] = useState('');

  const parametrosNavegacao = useMemo(
    () => ({
      nome,
      cargo,
      uorg,
      matricula,
      cpf,
    }),
    [nome, cargo, uorg, matricula, cpf],
  );

  const buscarSolicitacoes = useCallback(
    async (atualizacaoManual = false) => {
      if (!matricula) {
        setErroResumo(
          'A matrícula não foi informada. Abra a Logística pela tela principal.',
        );
        setCarregando(false);
        setAtualizando(false);
        return;
      }

      if (atualizacaoManual) {
        setAtualizando(true);
      } else {
        setCarregando(true);
      }

      setErroResumo('');

      try {
        const { data, error } = await supabase
          .from('solicitacoes_frota')
          .select(
            'id, protocolo, destino, data_ida, status, prioridade',
          )
          .eq('matricula', String(matricula))
          .order('id', { ascending: false })
          .limit(50);

        if (error) {
          throw error;
        }

        setSolicitacoes((data || []) as SolicitacaoFrota[]);
      } catch (error) {
        console.error(
          'Erro ao carregar o resumo da frota:',
          error,
        );

        setErroResumo(
          'Não foi possível atualizar os dados da Frota.',
        );
      } finally {
        setCarregando(false);
        setAtualizando(false);
      }
    },
    [matricula],
  );

  useEffect(() => {
    buscarSolicitacoes();
  }, [buscarSolicitacoes]);

  const resumo = useMemo(() => {
    return solicitacoes.reduce(
      (resultado, solicitacao) => {
        const status = classificarStatus(solicitacao.status);

        resultado.total += 1;

        if (status === 'EM_ANALISE') {
          resultado.emAnalise += 1;
        }

        if (status === 'APROVADO') {
          resultado.aprovadas += 1;
        }

        if (status === 'REJEITADO') {
          resultado.rejeitadas += 1;
        }

        return resultado;
      },
      {
        total: 0,
        emAnalise: 0,
        aprovadas: 0,
        rejeitadas: 0,
      },
    );
  }, [solicitacoes]);

  const ultimaSolicitacao = solicitacoes[0] || null;

  const abrirFrota = (
    aba: 'nova' | 'historico',
    filtroStatus: FiltroFrota = 'TODOS',
  ) => {
    router.push({
      pathname: '/logistica/frota',
      params: {
        ...parametrosNavegacao,
        aba,
        filtroStatus,
      },
    });
  };

  const abrirModulo = (
    pathname:
      | '/logistica/almoxarifado'
      | '/logistica/patrimonio',
  ) => {
    router.push({
      pathname,
      params: parametrosNavegacao,
    });
  };

  const statusUltimaSolicitacao = obterVisualStatus(
    ultimaSolicitacao?.status,
  );

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
          <Text style={styles.headerEyebrow}>PORTAL N2</Text>
          <Text style={styles.headerTitle}>Logística e Frota</Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialIcons
            name="local-shipping"
            size={25}
            color={G_COLORS.branco}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => buscarSolicitacoes(true)}
            colors={[G_COLORS.azulPrincipal]}
            tintColor={G_COLORS.azulPrincipal}
          />
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
              Início / Logística
            </Text>
          </View>

          <View style={styles.perfilCard}>
            <View style={styles.perfilTopo}>
              <View style={styles.perfilIcone}>
                <MaterialIcons
                  name="person"
                  size={24}
                  color={G_COLORS.azulPrincipal}
                />
              </View>

              <View style={styles.perfilTexto}>
                <Text style={styles.perfilIdentificacao}>
                  SOLICITANTE VINCULADO
                </Text>

                <Text style={styles.perfilNome}>
                  {nome || 'Servidor Público'}
                </Text>

                <Text style={styles.perfilCargo}>
                  {cargo || 'Cargo não especificado'}
                </Text>
              </View>
            </View>

            <View style={styles.perfilDivisor} />

            <View style={styles.dadosServidor}>
              <View style={styles.dadoServidor}>
                <MaterialIcons
                  name="badge"
                  size={17}
                  color={G_COLORS.ouro}
                />

                <View style={styles.dadoTextoContainer}>
                  <Text style={styles.dadoLabel}>Matrícula</Text>
                  <Text style={styles.dadoValor}>
                    {matricula || 'Não informada'}
                  </Text>
                </View>
              </View>

              <View style={styles.dadoServidor}>
                <MaterialIcons
                  name="shield"
                  size={17}
                  color={G_COLORS.ouro}
                />

                <View style={styles.dadoTextoContainer}>
                  <Text style={styles.dadoLabel}>CPF</Text>
                  <Text style={styles.dadoValor}>
                    {mascararCpf(cpf)}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.uorgBadge}>
              <MaterialIcons
                name="business"
                size={15}
                color={G_COLORS.branco}
              />

              <Text style={styles.uorgText} numberOfLines={2}>
                {uorg || 'Unidade de lotação não especificada'}
              </Text>
            </View>
          </View>

          <View style={styles.acaoDestaque}>
            <View style={styles.acaoDestaqueTexto}>
              <Text style={styles.acaoDestaqueTitulo}>
                Precisa de transporte oficial?
              </Text>

              <Text style={styles.acaoDestaqueDescricao}>
                Registre uma solicitação e acompanhe o protocolo.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.novaSolicitacaoButton}
              onPress={() => abrirFrota('nova')}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="add-road"
                size={20}
                color={G_COLORS.branco}
              />

              <Text style={styles.novaSolicitacaoTexto}>
                Solicitar
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Resumo operacional
              </Text>

              <Text style={styles.sectionSubtitle}>
                Dados das suas solicitações de Frota
              </Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={() => buscarSolicitacoes(true)}
              disabled={carregando || atualizando}
              accessibilityRole="button"
              accessibilityLabel="Atualizar resumo"
            >
              {atualizando ? (
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

          {erroResumo ? (
            <View style={styles.errorCard}>
              <MaterialIcons
                name="error-outline"
                size={22}
                color={G_COLORS.vermelho}
              />

              <View style={styles.errorTextContainer}>
                <Text style={styles.errorTitle}>
                  Resumo indisponível
                </Text>

                <Text style={styles.errorText}>
                  {erroResumo}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => buscarSolicitacoes(true)}
                style={styles.errorRetry}
              >
                <Text style={styles.errorRetryText}>
                  Tentar novamente
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.resumoGrid}>
            <ResumoCard
              titulo="Total"
              valor={resumo.total}
              icone="description"
              cor={G_COLORS.azulPrincipal}
              carregando={carregando}
              onPress={() => abrirFrota('historico', 'TODOS')}
            />

            <ResumoCard
              titulo="Em análise"
              valor={resumo.emAnalise}
              icone="schedule"
              cor={G_COLORS.laranja}
              carregando={carregando}
              onPress={() =>
                abrirFrota('historico', 'EM_ANALISE')
              }
            />

            <ResumoCard
              titulo="Aprovadas"
              valor={resumo.aprovadas}
              icone="check-circle"
              cor={G_COLORS.verde}
              carregando={carregando}
              onPress={() =>
                abrirFrota('historico', 'APROVADO')
              }
            />

            <ResumoCard
              titulo="Rejeitadas"
              valor={resumo.rejeitadas}
              icone="cancel"
              cor={G_COLORS.vermelho}
              carregando={carregando}
              onPress={() =>
                abrirFrota('historico', 'REJEITADO')
              }
            />
          </View>

          <Text style={styles.sectionTitle}>
            Acompanhamento recente
          </Text>

          {carregando ? (
            <View style={styles.ultimaSolicitacaoCard}>
              <ActivityIndicator
                size="small"
                color={G_COLORS.azulPrincipal}
              />

              <Text style={styles.loadingText}>
                Consultando solicitações...
              </Text>
            </View>
          ) : ultimaSolicitacao ? (
            <TouchableOpacity
              style={styles.ultimaSolicitacaoCard}
              onPress={() => abrirFrota('historico')}
              activeOpacity={0.75}
            >
              <View style={styles.ultimaSolicitacaoTopo}>
                <View style={styles.protocoloContainer}>
                  <Text style={styles.protocoloLabel}>
                    ÚLTIMO PROTOCOLO
                  </Text>

                  <Text style={styles.protocoloValor}>
                    {ultimaSolicitacao.protocolo ||
                      `FRO-${ultimaSolicitacao.id}`}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        statusUltimaSolicitacao.fundo,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color: statusUltimaSolicitacao.cor,
                      },
                    ]}
                  >
                    {statusUltimaSolicitacao.texto}
                  </Text>
                </View>
              </View>

              <View style={styles.ultimaSolicitacaoLinha}>
                <MaterialIcons
                  name="place"
                  size={17}
                  color={G_COLORS.azulPrincipal}
                />

                <Text
                  style={styles.ultimaSolicitacaoDestino}
                  numberOfLines={1}
                >
                  {ultimaSolicitacao.destino ||
                    'Destino não informado'}
                </Text>
              </View>

              <View style={styles.ultimaSolicitacaoRodape}>
                <View style={styles.ultimaSolicitacaoLinha}>
                  <MaterialIcons
                    name="event"
                    size={15}
                    color={G_COLORS.cinzaTexto}
                  />

                  <Text style={styles.ultimaSolicitacaoData}>
                    {formatarData(ultimaSolicitacao.data_ida)}
                  </Text>
                </View>

                <View style={styles.acompanharContainer}>
                  <Text style={styles.acompanharTexto}>
                    Acompanhar
                  </Text>

                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={G_COLORS.azulPrincipal}
                  />
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <MaterialIcons
                  name="inbox"
                  size={30}
                  color={G_COLORS.cinzaTexto}
                />
              </View>

              <View style={styles.emptyTextContainer}>
                <Text style={styles.emptyTitle}>
                  Nenhum pedido registrado
                </Text>

                <Text style={styles.emptyDescription}>
                  Sua próxima solicitação aparecerá aqui.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>
            Módulos operacionais
          </Text>

          <View style={styles.serviceGroup}>
            <ServiceCard
              icon="directions-car"
              title="Gestão de Frota"
              subtitle="Solicitações, protocolos, rotas e acompanhamento"
              color="#0284C7"
              onPress={() => abrirFrota('historico')}
            />

            <ServiceCard
              icon="inventory"
              title="Almoxarifado"
              subtitle="Materiais de consumo, estoque e requisições"
              color="#EA580C"
              onPress={() =>
                abrirModulo('/logistica/almoxarifado')
              }
            />

            <ServiceCard
              icon="domain"
              title="Patrimônio"
              subtitle="Bens, cautelas, inventário e transferências"
              color={G_COLORS.roxo}
              ultimo
              onPress={() =>
                abrirModulo('/logistica/patrimonio')
              }
            />
          </View>

          <View style={styles.institutionalFooter}>
            <MaterialIcons
              name="verified-user"
              size={18}
              color={G_COLORS.azulPrincipal}
            />

            <Text style={styles.institutionalFooterText}>
              Ambiente integrado de serviços administrativos
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: G_COLORS.cinzaFundo,
  },

  header: {
    minHeight: 68,
    paddingHorizontal: 16,
    backgroundColor: G_COLORS.azulPrincipal,
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
    letterSpacing: 1.4,
  },

  headerTitle: {
    color: G_COLORS.branco,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },

  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
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

  perfilCard: {
    backgroundColor: G_COLORS.azulEscuro,
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#000000',
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  perfilTopo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  perfilIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: G_COLORS.branco,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 13,
  },

  perfilTexto: {
    flex: 1,
  },

  perfilIdentificacao: {
    color: G_COLORS.ouro,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  perfilNome: {
    color: G_COLORS.branco,
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },

  perfilCargo: {
    color: '#FFFFFFC7',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  perfilDivisor: {
    height: 1,
    backgroundColor: '#FFFFFF24',
    marginVertical: 14,
  },

  dadosServidor: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
  },

  dadoServidor: {
    minWidth: 150,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginBottom: 8,
  },

  dadoTextoContainer: {
    marginLeft: 8,
  },

  dadoLabel: {
    color: '#FFFFFF9E',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  dadoValor: {
    color: G_COLORS.branco,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },

  uorgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
    backgroundColor: '#FFFFFF18',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
    marginTop: 4,
  },

  uorgText: {
    flexShrink: 1,
    color: G_COLORS.branco,
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 6,
  },

  acaoDestaque: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 23,
  },

  acaoDestaqueTexto: {
    flex: 1,
    paddingRight: 12,
  },

  acaoDestaqueTitulo: {
    color: G_COLORS.azulEscuro,
    fontSize: 15,
    fontWeight: '800',
  },

  acaoDestaqueDescricao: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  novaSolicitacaoButton: {
    minHeight: 42,
    backgroundColor: G_COLORS.azulPrincipal,
    borderRadius: 21,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  novaSolicitacaoTexto: {
    color: G_COLORS.branco,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 11,
  },

  sectionTitle: {
    color: G_COLORS.azulEscuro,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 10,
    marginBottom: 11,
  },

  sectionSubtitle: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    marginTop: -7,
  },

  refreshButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: G_COLORS.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  errorTextContainer: {
    flex: 1,
    marginLeft: 10,
  },

  errorTitle: {
    color: G_COLORS.vermelho,
    fontSize: 12,
    fontWeight: '800',
  },

  errorText: {
    color: '#7F1D1D',
    fontSize: 10,
    marginTop: 2,
  },

  errorRetry: {
    padding: 7,
  },

  errorRetryText: {
    color: G_COLORS.vermelho,
    fontSize: 10,
    fontWeight: '800',
  },

  resumoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: 17,
  },

  resumoCard: {
    flexGrow: 1,
    flexBasis: 140,
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 13,
    padding: 14,
    margin: 5,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  resumoIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  resumoValor: {
    fontSize: 25,
    fontWeight: '900',
    marginTop: 10,
  },

  resumoLoading: {
    alignSelf: 'flex-start',
    marginTop: 15,
    marginBottom: 5,
  },

  resumoTitulo: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },

  ultimaSolicitacaoCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 16,
    marginBottom: 21,
    minHeight: 90,
    elevation: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  ultimaSolicitacaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 13,
  },

  protocoloContainer: {
    flex: 1,
    marginRight: 10,
  },

  protocoloLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  protocoloValor: {
    color: G_COLORS.azulPrincipal,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  ultimaSolicitacaoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ultimaSolicitacaoDestino: {
    flex: 1,
    color: G_COLORS.textoPreto,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 7,
  },

  ultimaSolicitacaoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: G_COLORS.cinzaBorda,
  },

  ultimaSolicitacaoData: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    marginLeft: 6,
  },

  acompanharContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  acompanharTexto: {
    color: G_COLORS.azulPrincipal,
    fontSize: 11,
    fontWeight: '800',
  },

  loadingText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },

  emptyCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 21,
  },

  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: G_COLORS.cinzaClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyTextContainer: {
    flex: 1,
    marginLeft: 13,
  },

  emptyTitle: {
    color: G_COLORS.textoPreto,
    fontSize: 13,
    fontWeight: '800',
  },

  emptyDescription: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    marginTop: 3,
  },

  serviceGroup: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  serviceCard: {
    minHeight: 79,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: G_COLORS.cinzaBorda,
  },

  serviceCardUltimo: {
    borderBottomWidth: 0,
  },

  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },

  serviceTextContainer: {
    flex: 1,
    marginLeft: 14,
    marginRight: 7,
  },

  serviceTitle: {
    color: G_COLORS.textoPreto,
    fontSize: 14,
    fontWeight: '800',
  },

  serviceSubtitle: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
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
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 7,
  },
});