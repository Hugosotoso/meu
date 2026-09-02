/**
 * Super App Gov — Portal Integrado N2
 * Ficheiro: src/app/index.tsx
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
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import {
  getPortalProfile,
  supabase,
  type PortalProfile,
} from '../lib/supabase';

const C = {
  azul: '#1351B4',
  azulEscuro: '#071D41',
  azulMedio: '#0C3789',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  fundo: '#F4F6F8',
  superficie: '#F8FAFC',
  texto: '#1F2937',
  secundario: '#64748B',
  borda: '#E2E8F0',
  amarelo: '#FFCD00',
  verde: '#168821',
  laranja: '#B45309',
  vermelho: '#DC2626',
  roxo: '#7C3AED',
  ciano: '#0369A1',
};

type Icone = React.ComponentProps<typeof MaterialIcons>['name'];

type Modulo = {
  id: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  icone: Icone;
  rota: string;
  badge: string;
  cor: string;
};

const COMUNICADOS = [
  {
    titulo: 'Serviços integrados',
    texto:
      'Solicitações de pessoal, frota, materiais e patrimônio podem ser acompanhadas em um único ambiente.',
    icone: 'hub' as Icone,
  },
  {
    titulo: 'Gestão com rastreabilidade',
    texto:
      'Protocolos, prioridades e decisões administrativas permanecem registrados durante todo o fluxo.',
    icone: 'fact-check' as Icone,
  },
  {
    titulo: 'Inteligência aplicada',
    texto:
      'O Gabinete utiliza análise assistida por IA para apoiar a triagem e a organização dos processos.',
    icone: 'auto-awesome' as Icone,
  },
];

const MODULOS_BASE: Modulo[] = [
  {
    id: 'gabinete',
    titulo: 'Gabinete Digital',
    subtitulo: 'Processos e decisões',
    descricao:
      'Ofícios, prazos, assinaturas e análise inteligente em um fluxo administrativo rastreável.',
    icone: 'gavel',
    rota: '/gabinete',
    badge: 'Prioritário',
    cor: C.roxo,
  },
  {
    id: 'sdgp',
    titulo: 'Gestão de Pessoas',
    subtitulo: 'SDGP Digital',
    descricao:
      'Contracheques, vida funcional, férias, assentamento digital e simulação previdenciária.',
    icone: 'groups',
    rota: '/sdgp',
    badge: 'Serviços ativos',
    cor: C.verde,
  },
  {
    id: 'logistica',
    titulo: 'Logística Integrada',
    subtitulo: 'Frota, materiais e bens',
    descricao:
      'Solicitação de veículos, estoque real do almoxarifado e gestão da carga patrimonial.',
    icone: 'local-shipping',
    rota: '/logistica',
    badge: 'Operacional',
    cor: C.ciano,
  },
  {
    id: 'ia-copilot',
    titulo: 'Assistente Gov.ia',
    subtitulo: 'Apoio inteligente',
    descricao:
      'Orientação contextual para serviços, processos e rotinas administrativas do portal.',
    icone: 'auto-awesome',
    rota: '/ia-copilot',
    badge: 'IA integrada',
    cor: C.laranja,
  },
];

const MODULO_GESTAO: Modulo = {
  id: 'central',
  titulo: 'Central de Gestão',
  subtitulo: 'Visão executiva',
  descricao:
    'Pendências, decisões, indicadores, prioridades e trilha de auditoria para o perfil gestor.',
  icone: 'space-dashboard',
  rota: '/central',
  badge: 'Acesso gestor',
  cor: C.azul,
};

function normalizarStatus(valor?: string | null): string {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

function estaEmAndamento(status?: string | null): boolean {
  const valor = normalizarStatus(status);

  if (!valor) {
    return true;
  }

  return !(
    valor.includes('CONCLUID') ||
    valor.includes('FINALIZ') ||
    valor.includes('ENTREGUE') ||
    valor.includes('REJEIT') ||
    valor.includes('CANCELAD') ||
    valor.includes('ARQUIVAD') ||
    valor.includes('INDEFERID')
  );
}

function mascararCpf(cpf?: string | null): string {
  const digitos = String(cpf || '').replace(/\D/g, '');

  if (digitos.length !== 11) {
    return '***.***.***-**';
  }

  return (
    digitos.slice(0, 3) +
    '.***.***-' +
    digitos.slice(-2)
  );
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function obterSaudacao(): string {
  const hora = new Date().getHours();

  if (hora < 12) {
    return 'Bom dia';
  }

  if (hora < 18) {
    return 'Boa tarde';
  }

  return 'Boa noite';
}

function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] || 'Servidor';
}

function KpiCard({
  titulo,
  valor,
  detalhe,
  icone,
  cor,
  desktop,
}: {
  titulo: string;
  valor: string | number;
  detalhe: string;
  icone: Icone;
  cor: string;
  desktop: boolean;
}) {
  return (
    <View
      style={[
        styles.kpiCard,
        desktop ? styles.kpiDesktop : styles.kpiMobile,
      ]}
    >
      <View style={styles.kpiTopo}>
        <View style={[styles.kpiIcone, { backgroundColor: cor + '12' }]}>
          <MaterialIcons name={icone} size={20} color={cor} />
        </View>
        <View style={[styles.kpiPonto, { backgroundColor: cor }]} />
      </View>
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiTitulo}>{titulo}</Text>
      <Text style={styles.kpiDetalhe}>{detalhe}</Text>
    </View>
  );
}

function ModuloCard({
  modulo,
  desktop,
  onPress,
}: {
  modulo: Modulo;
  desktop: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.moduloCard,
        desktop && styles.moduloCardDesktop,
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View
        style={[
          styles.moduloFaixa,
          { backgroundColor: modulo.cor },
        ]}
      />

      <View style={styles.moduloTopo}>
        <View
          style={[
            styles.moduloIcone,
            { backgroundColor: modulo.cor + '12' },
          ]}
        >
          <MaterialIcons
            name={modulo.icone}
            size={27}
            color={modulo.cor}
          />
        </View>

        <View
          style={[
            styles.moduloBadge,
            { backgroundColor: modulo.cor + '12' },
          ]}
        >
          <View
            style={[
              styles.moduloBadgePonto,
              { backgroundColor: modulo.cor },
            ]}
          />
          <Text
            style={[
              styles.moduloBadgeTexto,
              { color: modulo.cor },
            ]}
          >
            {modulo.badge}
          </Text>
        </View>
      </View>

      <Text style={styles.moduloSubtitulo}>
        {modulo.subtitulo.toUpperCase()}
      </Text>
      <Text style={styles.moduloTitulo}>{modulo.titulo}</Text>
      <Text style={styles.moduloDescricao}>{modulo.descricao}</Text>

      <View style={styles.moduloRodape}>
        <Text style={[styles.moduloAcessar, { color: modulo.cor }]}>
          Acessar módulo
        </Text>
        <View
          style={[
            styles.moduloSeta,
            { backgroundColor: modulo.cor + '12' },
          ]}
        >
          <MaterialIcons
            name="arrow-forward"
            size={17}
            color={modulo.cor}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 920;
  const gridDesktop = width >= 720;
  const compacto = width < 430;

  const [perfil, setPerfil] = useState<PortalProfile | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [indiceComunicado, setIndiceComunicado] = useState(0);
  const [ultimoSalario, setUltimoSalario] = useState<number | null>(null);
  const [mesSalario, setMesSalario] = useState('');
  const [carregandoResumo, setCarregandoResumo] = useState(true);
  const [salarioVisivel, setSalarioVisivel] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const [servicosEmAndamento, setServicosEmAndamento] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);

  const nomeServidor = perfil?.nome || 'Servidor autenticado';
  const cargoServidor = perfil?.cargo || 'Cargo não informado';
  const uorgServidor = perfil?.uorg_id || 'Lotação não informada';
  const nivelAcesso = perfil?.nivel_acesso || 'OURO';
  const matriculaServidor = perfil?.matricula || '';
  const cpfServidor = perfil?.cpf || '';
  const gestor = nivelAcesso.toUpperCase() === 'DIAMANTE';

  const modulosVisiveis = useMemo(
    () => (gestor ? [MODULO_GESTAO, ...MODULOS_BASE] : MODULOS_BASE),
    [gestor],
  );

  useEffect(() => {
    let telaAtiva = true;

    const validarSessao = async () => {
      try {
        const perfilAtual = await getPortalProfile();

        if (telaAtiva) {
          setPerfil(perfilAtual);
        }
      } catch (error) {
        console.error('Erro ao validar sessão:', error);

        if (telaAtiva) {
          setPerfil(null);
        }
      } finally {
        if (telaAtiva) {
          setVerificandoSessao(false);
        }
      }
    };

    validarSessao();

    return () => {
      telaAtiva = false;
    };
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceComunicado(
        (atual) => (atual + 1) % COMUNICADOS.length,
      );
    }, 5500);

    return () => clearInterval(intervalo);
  }, []);

  const carregarResumo = useCallback(
    async (refresh = false) => {
      if (!matriculaServidor) {
        setCarregandoResumo(false);
        setAtualizando(false);
        return;
      }

      if (refresh) {
        setAtualizando(true);
      } else {
        setCarregandoResumo(true);
      }

      try {
        const [
          salario,
          notificacoes,
          frota,
          almoxarifado,
          patrimonio,
          ferias,
        ] = await Promise.all([
          supabase
            .from('contracheques')
            .select('liquido, mes_referencia')
            .eq('matricula', matriculaServidor)
            .order('id', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('notificacoes')
            .select('id', { count: 'exact', head: true })
            .eq('matricula', matriculaServidor)
            .eq('lida', false),
          supabase
            .from('solicitacoes_frota')
            .select('status')
            .eq('matricula', matriculaServidor),
          supabase
            .from('solicitacoes_almoxarifado')
            .select('status')
            .eq('matricula', matriculaServidor),
          supabase
            .from('chamados_patrimonio')
            .select('status')
            .eq('matricula', matriculaServidor),
          supabase
            .from('solicitacoes_ferias')
            .select('status')
            .eq('matricula', matriculaServidor),
        ]);

        if (!salario.error && salario.data) {
          setUltimoSalario(Number(salario.data.liquido));
          setMesSalario(String(salario.data.mes_referencia || ''));
        } else {
          setUltimoSalario(null);
          setMesSalario('');
        }

        setNotificacoesNaoLidas(
          notificacoes.error ? 0 : notificacoes.count || 0,
        );

        const consultasOperacionais = [
          frota,
          almoxarifado,
          patrimonio,
          ferias,
        ];

        const totalEmAndamento = consultasOperacionais.reduce(
          (total, consulta) => {
            if (consulta.error || !Array.isArray(consulta.data)) {
              return total;
            }

            return (
              total +
              consulta.data.filter((item) =>
                estaEmAndamento(item.status),
              ).length
            );
          },
          0,
        );

        setServicosEmAndamento(totalEmAndamento);
        setUltimaAtualizacao(new Date());
      } catch (error) {
        console.error('Erro ao carregar o resumo da Home:', error);
      } finally {
        setCarregandoResumo(false);
        setAtualizando(false);
      }
    },
    [matriculaServidor],
  );

  useEffect(() => {
    carregarResumo();
  }, [carregarResumo]);

  const abrirModulo = (modulo: Modulo) => {
    if (!perfil) {
      return;
    }

    if (modulo.id === 'gabinete' || modulo.id === 'central') {
      router.push(modulo.rota as any);
      return;
    }

    router.push({
      pathname: modulo.rota as any,
      params: {
        nome: perfil.nome,
        cargo: perfil.cargo,
        uorg: perfil.uorg_id,
        matricula: perfil.matricula,
        cpf: perfil.cpf,
        nivel_acesso: perfil.nivel_acesso,
      },
    });
  };

  const abrirFinanceiro = () => {
    const moduloSdgp = MODULOS_BASE.find((modulo) => modulo.id === 'sdgp');

    if (moduloSdgp) {
      abrirModulo(moduloSdgp);
    }
  };

  const abrirNotificacoes = () => {
    if (gestor) {
      router.push('/central');
      return;
    }

    Alert.alert(
      'Notificações administrativas',
      notificacoesNaoLidas > 0
        ? 'Você possui ' +
            notificacoesNaoLidas +
            ' atualização(ões) não lida(s) nos seus serviços.'
        : 'Não existem novas atualizações para a sua matrícula.',
    );
  };

  if (verificandoSessao) {
    return (
      <SafeAreaView style={styles.loadingPagina}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={C.azulEscuro}
        />
        <View style={styles.loadingMarca}>
          <Text style={styles.loadingGov}>
            gov<Text style={styles.pontoAmarelo}>.</Text>br
          </Text>
          <View style={styles.loadingDivisor} />
          <Text style={styles.loadingPortal}>Portal N2</Text>
        </View>
        <ActivityIndicator size="large" color={C.amarelo} />
        <Text style={styles.loadingTexto}>Validando sessão segura...</Text>
      </SafeAreaView>
    );
  }

  if (!perfil) {
    return <Redirect href="/login" />;
  }

  const comunicado = COMUNICADOS[indiceComunicado];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      <View style={styles.govBar}>
        <View style={styles.marca}>
          <Text style={styles.govText}>
            gov<Text style={styles.pontoAmarelo}>.</Text>br
          </Text>
          {!compacto && <View style={styles.marcaDivisor} />}
          {!compacto && (
            <View>
              <Text style={styles.marcaPortal}>Portal Integrado N2</Text>
              <Text style={styles.marcaOrgao}>
                Gestão pública digital
              </Text>
            </View>
          )}
        </View>

        <View style={styles.govAcoes}>
          <View style={styles.demoBadge}>
            <View style={styles.demoPonto} />
            <Text style={styles.demoTexto}>
              {compacto ? 'DEMO' : 'AMBIENTE DEMONSTRATIVO'}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.notificacaoBotao}
            onPress={abrirNotificacoes}
            accessibilityLabel="Ver notificações"
          >
            <MaterialIcons
              name="notifications-none"
              size={22}
              color={C.branco}
            />
            {notificacoesNaoLidas > 0 && (
              <View style={styles.notificacaoContador}>
                <Text style={styles.notificacaoContadorTexto}>
                  {Math.min(notificacoesNaoLidas, 9)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={atualizando}
            onRefresh={() => carregarResumo(true)}
            colors={[C.azul]}
            tintColor={C.azul}
          />
        }
      >
        <View style={styles.heroFundo}>
          <View style={styles.heroCirculoUm} />
          <View style={styles.heroCirculoDois} />

          <View
            style={[
              styles.limite,
              styles.hero,
              desktop && styles.heroDesktop,
            ]}
          >
            <View style={styles.heroPrincipal}>
              <View style={styles.heroEyebrow}>
                <MaterialIcons
                  name="waving-hand"
                  size={15}
                  color={C.amarelo}
                />
                <Text style={styles.heroEyebrowTexto}>
                  {obterSaudacao()}, {primeiroNome(nomeServidor)}
                </Text>
              </View>

              <Text style={styles.heroTitulo}>
                Administração pública{'\n'}
                <Text style={styles.heroTituloDestaque}>
                  simples, integrada e inteligente.
                </Text>
              </Text>

              <Text style={styles.heroDescricao}>
                Um único ambiente para serviços internos, decisões,
                acompanhamento e gestão digital.
              </Text>

              <View style={styles.heroSelos}>
                <View style={styles.heroSelo}>
                  <MaterialIcons
                    name="verified-user"
                    size={15}
                    color={C.amarelo}
                  />
                  <Text style={styles.heroSeloTexto}>
                    Sessão verificada
                  </Text>
                </View>
                <View style={styles.heroSelo}>
                  <MaterialIcons
                    name="workspace-premium"
                    size={15}
                    color={C.amarelo}
                  />
                  <Text style={styles.heroSeloTexto}>
                    Perfil {nivelAcesso.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={[
                styles.identidadeCard,
                desktop && styles.identidadeCardDesktop,
              ]}
            >
              <View style={styles.identidadeTopo}>
                <View style={styles.avatar}>
                  <MaterialIcons
                    name="person"
                    size={29}
                    color={C.azul}
                  />
                </View>
                <View style={styles.identidadeTexto}>
                  <Text style={styles.identidadeRotulo}>
                    SERVIDOR AUTENTICADO
                  </Text>
                  <Text
                    style={styles.identidadeNome}
                    numberOfLines={2}
                  >
                    {nomeServidor}
                  </Text>
                  <Text style={styles.identidadeCargo}>
                    {cargoServidor}
                  </Text>
                </View>
                <MaterialIcons
                  name="verified"
                  size={22}
                  color={C.verde}
                />
              </View>

              <View style={styles.identidadeDivisor} />

              <View style={styles.identidadeDados}>
                <View style={styles.identidadeLinha}>
                  <MaterialIcons
                    name="badge"
                    size={16}
                    color={C.secundario}
                  />
                  <Text style={styles.identidadeLinhaTexto}>
                    Matrícula {matriculaServidor}
                  </Text>
                </View>
                <View style={styles.identidadeLinha}>
                  <MaterialIcons
                    name="business"
                    size={16}
                    color={C.secundario}
                  />
                  <Text
                    style={styles.identidadeLinhaTexto}
                    numberOfLines={1}
                  >
                    {uorgServidor}
                  </Text>
                </View>
                <View style={styles.identidadeLinha}>
                  <MaterialIcons
                    name="fingerprint"
                    size={16}
                    color={C.secundario}
                  />
                  <Text style={styles.identidadeLinhaTexto}>
                    CPF {mascararCpf(cpfServidor)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.limite, styles.corpo]}>
          <View style={styles.secaoCabecalho}>
            <View>
              <Text style={styles.secaoEyebrow}>PAINEL DO SERVIDOR</Text>
              <Text style={styles.secaoTitulo}>Visão geral</Text>
            </View>
            {ultimaAtualizacao && !compacto && (
              <View style={styles.atualizacao}>
                <MaterialIcons
                  name="sync"
                  size={15}
                  color={C.secundario}
                />
                <Text style={styles.atualizacaoTexto}>
                  Atualizado às{' '}
                  {ultimaAtualizacao.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.kpiGrid}>
            <KpiCard
              titulo="Serviços integrados"
              valor={modulosVisiveis.length}
              detalhe="módulos disponíveis"
              icone="apps"
              cor={C.azul}
              desktop={desktop}
            />
            <KpiCard
              titulo="Em andamento"
              valor={carregandoResumo ? '—' : servicosEmAndamento}
              detalhe="solicitações ativas"
              icone="pending-actions"
              cor={C.laranja}
              desktop={desktop}
            />
            <KpiCard
              titulo="Atualizações"
              valor={carregandoResumo ? '—' : notificacoesNaoLidas}
              detalhe="notificações não lidas"
              icone="notifications-active"
              cor={C.roxo}
              desktop={desktop}
            />
            <KpiCard
              titulo="Acesso"
              valor={nivelAcesso.toUpperCase()}
              detalhe={gestor ? 'perfil de gestão' : 'perfil de servidor'}
              icone="shield"
              cor={C.verde}
              desktop={desktop}
            />
          </View>

          <View style={styles.comunicado}>
            <View style={styles.comunicadoIcone}>
              <MaterialIcons
                name={comunicado.icone}
                size={24}
                color={C.azul}
              />
            </View>
            <View style={styles.comunicadoConteudo}>
              <View style={styles.comunicadoTopo}>
                <Text style={styles.comunicadoRotulo}>
                  COMUNICADO DO PORTAL
                </Text>
                <View style={styles.comunicadoDemo}>
                  <Text style={styles.comunicadoDemoTexto}>
                    DEMONSTRAÇÃO
                  </Text>
                </View>
              </View>
              <Text style={styles.comunicadoTitulo}>
                {comunicado.titulo}
              </Text>
              <Text style={styles.comunicadoTexto}>
                {comunicado.texto}
              </Text>
            </View>
            {!compacto && (
              <View style={styles.comunicadoPaginacao}>
                {COMUNICADOS.map((_, indice) => (
                  <View
                    key={indice}
                    style={[
                      styles.comunicadoPonto,
                      indice === indiceComunicado &&
                        styles.comunicadoPontoAtivo,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>

          <View
            style={[
              styles.conteudoGrid,
              desktop && styles.conteudoGridDesktop,
            ]}
          >
            <View style={styles.modulosColuna}>
              <View style={styles.secaoCabecalho}>
                <View>
                  <Text style={styles.secaoEyebrow}>
                    ECOSSISTEMA INTEGRADO
                  </Text>
                  <Text style={styles.secaoTitulo}>
                    Serviços e módulos
                  </Text>
                  <Text style={styles.secaoSubtitulo}>
                    Selecione uma área para iniciar ou acompanhar um serviço.
                  </Text>
                </View>
              </View>

              <View style={styles.modulosGrid}>
                {modulosVisiveis.map((modulo) => (
                  <ModuloCard
                    key={modulo.id}
                    modulo={modulo}
                    desktop={gridDesktop}
                    onPress={() => abrirModulo(modulo)}
                  />
                ))}
              </View>
            </View>

            <View
              style={[
                styles.lateral,
                desktop && styles.lateralDesktop,
              ]}
            >
              <View style={styles.financeiroCard}>
                <View style={styles.financeiroDecoracao} />
                <View style={styles.financeiroTopo}>
                  <View>
                    <Text style={styles.financeiroRotulo}>
                      RESUMO FINANCEIRO
                    </Text>
                    <Text style={styles.financeiroTitulo}>
                      Último rendimento líquido
                    </Text>
                  </View>
                  <View style={styles.financeiroIcone}>
                    <MaterialIcons
                      name="account-balance-wallet"
                      size={23}
                      color={C.amarelo}
                    />
                  </View>
                </View>

                <Text style={styles.financeiroMes}>
                  {carregandoResumo
                    ? 'Consultando dados...'
                    : mesSalario
                      ? 'Referência: ' + mesSalario
                      : 'Referência indisponível'}
                </Text>

                <View style={styles.financeiroValorLinha}>
                  {carregandoResumo ? (
                    <ActivityIndicator
                      size="small"
                      color={C.amarelo}
                    />
                  ) : (
                    <Text style={styles.financeiroValor}>
                      {salarioVisivel && ultimoSalario !== null
                        ? formatarMoeda(ultimoSalario)
                        : 'R$ •••••••'}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.visibilidadeBotao}
                    onPress={() =>
                      setSalarioVisivel((atual) => !atual)
                    }
                  >
                    <MaterialIcons
                      name={
                        salarioVisivel
                          ? 'visibility'
                          : 'visibility-off'
                      }
                      size={21}
                      color="rgba(255,255,255,0.72)"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.financeiroAcao}
                  onPress={abrirFinanceiro}
                >
                  <Text style={styles.financeiroAcaoTexto}>
                    Consultar no SDGP
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={17}
                    color={C.azulEscuro}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.plataformaCard}>
                <View style={styles.plataformaCabecalho}>
                  <View style={styles.plataformaIcone}>
                    <MaterialIcons
                      name="verified-user"
                      size={22}
                      color={C.verde}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.plataformaTitulo}>
                      Plataforma integrada
                    </Text>
                    <Text style={styles.plataformaSubtitulo}>
                      Estado operacional do protótipo
                    </Text>
                  </View>
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlinePonto} />
                    <Text style={styles.onlineTexto}>ONLINE</Text>
                  </View>
                </View>

                <View style={styles.plataformaLista}>
                  <LinhaPlataforma
                    icone="lock"
                    titulo="Sessão protegida"
                    texto="Validação por token temporário"
                  />
                  <LinhaPlataforma
                    icone="sync"
                    titulo="Dados sincronizados"
                    texto="Integração em tempo real com Supabase"
                  />
                  <LinhaPlataforma
                    icone="devices"
                    titulo="Multiplataforma"
                    texto="Web responsiva e aplicativo Android"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.rodape}>
            <View style={styles.rodapeMarca}>
              <Text style={styles.rodapeGov}>
                gov<Text style={{ color: C.azul }}>.</Text>br
              </Text>
              <View style={styles.rodapeDivisor} />
              <Text style={styles.rodapePortal}>
                Portal Integrado N2
              </Text>
            </View>
            <Text style={styles.rodapeTexto}>
              Protótipo acadêmico • Ambiente demonstrativo • 2026
            </Text>
            <Text style={styles.rodapeSubtexto}>
              Serviços digitais, gestão integrada e decisões rastreáveis.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaPlataforma({
  icone,
  titulo,
  texto,
}: {
  icone: Icone;
  titulo: string;
  texto: string;
}) {
  return (
    <View style={styles.plataformaLinha}>
      <View style={styles.plataformaLinhaIcone}>
        <MaterialIcons name={icone} size={17} color={C.azul} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.plataformaLinhaTitulo}>{titulo}</Text>
        <Text style={styles.plataformaLinhaTexto}>{texto}</Text>
      </View>
      <MaterialIcons
        name="check-circle"
        size={18}
        color={C.verde}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.azul,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: C.fundo,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  limite: {
    width: '100%',
    maxWidth: 1160,
    alignSelf: 'center',
  },
  loadingPagina: {
    flex: 1,
    backgroundColor: C.azulEscuro,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingMarca: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  loadingGov: {
    color: C.branco,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  pontoAmarelo: {
    color: C.amarelo,
  },
  loadingDivisor: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.24)',
    marginHorizontal: 13,
  },
  loadingPortal: {
    color: C.branco,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingTexto: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 14,
  },
  govBar: {
    minHeight: 68,
    backgroundColor: C.azul,
    paddingHorizontal: 18,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    elevation: 5,
    zIndex: 10,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  govText: {
    color: C.branco,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.7,
  },
  marcaDivisor: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: 12,
  },
  marcaPortal: {
    color: C.branco,
    fontSize: 13,
    fontWeight: '800',
  },
  marcaOrgao: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 9,
    marginTop: 1,
  },
  govAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  demoBadge: {
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.amarelo,
  },
  demoTexto: {
    color: C.branco,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  notificacaoBotao: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificacaoContador: {
    position: 'absolute',
    top: 1,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: C.vermelho,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.azul,
  },
  notificacaoContadorTexto: {
    color: C.branco,
    fontSize: 8,
    fontWeight: '900',
  },
  heroFundo: {
    backgroundColor: C.azulEscuro,
    overflow: 'hidden',
    position: 'relative',
  },
  heroCirculoUm: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(19,81,180,0.28)',
    top: -210,
    right: -70,
  },
  heroCirculoDois: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 44,
    borderColor: 'rgba(255,255,255,0.035)',
    bottom: -150,
    left: -80,
  },
  hero: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 30,
  },
  heroDesktop: {
    minHeight: 360,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 46,
    paddingHorizontal: 24,
    paddingVertical: 42,
  },
  heroPrincipal: {
    flex: 1,
  },
  heroEyebrow: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 17,
    paddingHorizontal: 11,
    paddingVertical: 6,
    marginBottom: 15,
  },
  heroEyebrowTexto: {
    color: C.branco,
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitulo: {
    color: C.branco,
    fontSize: 30,
    lineHeight: 37,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  heroTituloDestaque: {
    color: C.amarelo,
  },
  heroDescricao: {
    maxWidth: 610,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 13,
  },
  heroSelos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 18,
  },
  heroSelo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroSeloTexto: {
    color: C.branco,
    fontSize: 10,
    fontWeight: '700',
  },
  identidadeCard: {
    width: '100%',
    backgroundColor: C.branco,
    borderRadius: 15,
    padding: 16,
    marginTop: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
  },
  identidadeCardDesktop: {
    width: 370,
    marginTop: 0,
  },
  identidadeTopo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identidadeTexto: {
    flex: 1,
    marginHorizontal: 11,
  },
  identidadeRotulo: {
    color: C.azul,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  identidadeNome: {
    color: C.texto,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 2,
  },
  identidadeCargo: {
    color: C.secundario,
    fontSize: 10,
    marginTop: 2,
  },
  identidadeDivisor: {
    height: 1,
    backgroundColor: C.borda,
    marginVertical: 13,
  },
  identidadeDados: {
    gap: 8,
  },
  identidadeLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  identidadeLinhaTexto: {
    flex: 1,
    color: C.secundario,
    fontSize: 11,
  },
  corpo: {
    paddingHorizontal: 16,
    paddingTop: 25,
  },
  secaoCabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  secaoEyebrow: {
    color: C.azul,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 3,
  },
  secaoTitulo: {
    color: C.azulEscuro,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  secaoSubtitulo: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  atualizacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  atualizacaoTexto: {
    color: C.secundario,
    fontSize: 10,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 13,
    padding: 13,
  },
  kpiDesktop: {
    width: '24%',
    flex: 1,
  },
  kpiMobile: {
    width: '48%',
    flexGrow: 1,
  },
  kpiTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kpiIcone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiPonto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
  },
  kpiValor: {
    color: C.texto,
    fontSize: 21,
    fontWeight: '900',
  },
  kpiTitulo: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 3,
  },
  kpiDetalhe: {
    color: C.secundario,
    fontSize: 9,
    marginTop: 2,
  },
  comunicado: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderLeftWidth: 4,
    borderLeftColor: C.azul,
    borderRadius: 13,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 27,
  },
  comunicadoIcone: {
    width: 47,
    height: 47,
    borderRadius: 12,
    backgroundColor: C.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  comunicadoConteudo: {
    flex: 1,
  },
  comunicadoTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 3,
  },
  comunicadoRotulo: {
    color: C.azul,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  comunicadoDemo: {
    backgroundColor: '#FFF7ED',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  comunicadoDemoTexto: {
    color: C.laranja,
    fontSize: 7,
    fontWeight: '900',
  },
  comunicadoTitulo: {
    color: C.texto,
    fontSize: 13,
    fontWeight: '900',
  },
  comunicadoTexto: {
    color: C.secundario,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },
  comunicadoPaginacao: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 3,
  },
  comunicadoPonto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.borda,
  },
  comunicadoPontoAtivo: {
    width: 13,
    backgroundColor: C.azul,
  },
  conteudoGrid: {
    width: '100%',
  },
  conteudoGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  modulosColuna: {
    flex: 1,
    minWidth: 0,
  },
  modulosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  moduloCard: {
    width: '100%',
    minHeight: 235,
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 14,
    padding: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  moduloCardDesktop: {
    width: '48.8%',
  },
  moduloFaixa: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  moduloTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  moduloIcone: {
    width: 52,
    height: 52,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduloBadge: {
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  moduloBadgePonto: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  moduloBadgeTexto: {
    fontSize: 8,
    fontWeight: '900',
  },
  moduloSubtitulo: {
    color: C.secundario,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  moduloTitulo: {
    color: C.texto,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 4,
  },
  moduloDescricao: {
    flex: 1,
    color: C.secundario,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  moduloRodape: {
    borderTopWidth: 1,
    borderTopColor: C.borda,
    paddingTop: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduloAcessar: {
    fontSize: 11,
    fontWeight: '900',
  },
  moduloSeta: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lateral: {
    width: '100%',
    marginTop: 24,
    gap: 14,
  },
  lateralDesktop: {
    width: 340,
    marginTop: 0,
  },
  financeiroCard: {
    backgroundColor: C.azulEscuro,
    borderRadius: 15,
    padding: 17,
    overflow: 'hidden',
    position: 'relative',
  },
  financeiroDecoracao: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(19,81,180,0.32)',
    top: -85,
    right: -45,
  },
  financeiroTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  financeiroRotulo: {
    color: C.amarelo,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  financeiroTitulo: {
    color: C.branco,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 4,
  },
  financeiroIcone: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  financeiroMes: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 10,
    marginTop: 15,
  },
  financeiroValorLinha: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  financeiroValor: {
    color: C.branco,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  visibilidadeBotao: {
    padding: 6,
  },
  financeiroAcao: {
    minHeight: 42,
    borderRadius: 9,
    backgroundColor: C.amarelo,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  financeiroAcaoTexto: {
    color: C.azulEscuro,
    fontSize: 11,
    fontWeight: '900',
  },
  plataformaCard: {
    backgroundColor: C.branco,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.borda,
    padding: 15,
  },
  plataformaCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  plataformaIcone: {
    width: 41,
    height: 41,
    borderRadius: 11,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plataformaTitulo: {
    color: C.texto,
    fontSize: 12,
    fontWeight: '900',
  },
  plataformaSubtitulo: {
    color: C.secundario,
    fontSize: 9,
    marginTop: 2,
  },
  onlineBadge: {
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlinePonto: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.verde,
  },
  onlineTexto: {
    color: C.verde,
    fontSize: 7,
    fontWeight: '900',
  },
  plataformaLista: {
    borderTopWidth: 1,
    borderTopColor: C.borda,
    marginTop: 14,
    paddingTop: 5,
  },
  plataformaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 9,
  },
  plataformaLinhaIcone: {
    width: 31,
    height: 31,
    borderRadius: 9,
    backgroundColor: C.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plataformaLinhaTitulo: {
    color: C.texto,
    fontSize: 10,
    fontWeight: '800',
  },
  plataformaLinhaTexto: {
    color: C.secundario,
    fontSize: 8,
    marginTop: 2,
  },
  rodape: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.borda,
    marginTop: 35,
    paddingTop: 25,
    paddingBottom: 28,
  },
  rodapeMarca: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rodapeGov: {
    color: C.azulEscuro,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  rodapeDivisor: {
    width: 1,
    height: 17,
    backgroundColor: C.borda,
    marginHorizontal: 10,
  },
  rodapePortal: {
    color: C.texto,
    fontSize: 11,
    fontWeight: '800',
  },
  rodapeTexto: {
    color: C.secundario,
    fontSize: 9,
    textAlign: 'center',
    marginTop: 9,
  },
  rodapeSubtexto: {
    color: '#94A3B8',
    fontSize: 8,
    textAlign: 'center',
    marginTop: 3,
  },
});
