import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPortalProfile, supabase } from '../../lib/supabase';
import {
  CORES_PRIORIDADE,
  estiloStatus,
  formatarDataHora,
  prioridadeSegura,
  statusFinalizado,
} from '../../lib/workflow';

const C = {
  azul: '#1351B4',
  azulEscuro: '#0C326F',
  amarelo: '#FFCD00',
  branco: '#FFFFFF',
  fundo: '#F4F6F9',
  texto: '#1F2937',
  secundario: '#64748B',
  borda: '#D9DDE8',
  verde: '#047857',
  vermelho: '#B91C1C',
};

type Modulo = 'Gabinete' | 'Almoxarifado' | 'Frota' | 'Patrimônio' | 'SDGP';

type Pendencia = {
  chave: string;
  id: string | number;
  tabela: string;
  modulo: Modulo;
  titulo: string;
  subtitulo: string;
  protocolo: string;
  status: string;
  prioridade: string;
  solicitante: string;
  created_at?: string | null;
  justificativa_gestor?: string | null;
};

const MODULOS: Array<'Todos' | Modulo> = ['Todos', 'Gabinete', 'SDGP', 'Almoxarifado', 'Frota', 'Patrimônio'];

const STATUS_POR_TABELA: Record<string, Array<{ valor: string; label: string }>> = {
  oficios: [
    { valor: 'andamento', label: 'Em andamento' },
    { valor: 'EM_ANALISE', label: 'Em análise' },
    { valor: 'AGUARDANDO_ASSINATURA', label: 'Aguardando assinatura' },
    { valor: 'finalizado', label: 'Finalizado' },
  ],
  solicitacoes_almoxarifado: [
    { valor: 'A Separar', label: 'A separar' },
    { valor: 'Em Trânsito', label: 'Em trânsito' },
    { valor: 'Entregue', label: 'Entregue' },
    { valor: 'Rejeitado', label: 'Rejeitado' },
  ],
  solicitacoes_frota: [
    { valor: 'Em Análise', label: 'Em análise' },
    { valor: 'Aprovado', label: 'Aprovado' },
    { valor: 'Concluído', label: 'Concluído' },
    { valor: 'Rejeitado', label: 'Rejeitado' },
  ],
  chamados_patrimonio: [
    { valor: 'Aguardando Análise', label: 'Aguardando análise' },
    { valor: 'Em Atendimento', label: 'Em atendimento' },
    { valor: 'Concluído', label: 'Concluído' },
    { valor: 'Rejeitado', label: 'Rejeitado' },
  ],
  solicitacoes_ferias: [
    { valor: 'EM_ANALISE', label: 'Em análise' },
    { valor: 'APROVADO', label: 'Aprovado' },
    { valor: 'REJEITADO', label: 'Rejeitado' },
  ],
};

function texto(valor: unknown, fallback = 'Não informado') {
  if (typeof valor === 'object' || typeof valor === 'function') return fallback;
  const resultado = String(valor ?? '').trim();
  return resultado || fallback;
}

function solicitanteSeguro(valor: unknown, fallback = 'Gabinete') {
  const resultado = texto(valor, fallback);
  const contemMetadadosInternos =
    /\[?\s*assinado\s*\]?/i.test(resultado) ||
    /(?:^|\s)(?:CPF|IP|Sess(?:ã|a)o|UID|Autor|Data)\s*:/i.test(resultado);

  return contemMetadadosInternos
    ? 'Documento assinado digitalmente'
    : resultado;
}

function nomeMaterial(item: Record<string, unknown>) {
  const candidato =
    item.nome ??
    item.descricao ??
    item.material ??
    item.produto ??
    item.titulo ??
    item.item;

  if (candidato && typeof candidato === 'object' && !Array.isArray(candidato)) {
    const interno = candidato as Record<string, unknown>;
    return texto(
      interno.nome ?? interno.descricao ?? interno.titulo,
      'Material',
    );
  }

  return texto(candidato, 'Material');
}

function formatarItemAlmoxarifado(valor: unknown) {
  if (typeof valor === 'string') return texto(valor, 'Material');

  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
    return texto(valor, 'Material');
  }

  const item = valor as Record<string, unknown>;
  const quantidadeBruta = item.quantidade ?? item.qtd ?? item.qtde;
  const quantidade = Number(quantidadeBruta);
  const possuiQuantidade =
    quantidadeBruta !== undefined &&
    quantidadeBruta !== null &&
    String(quantidadeBruta).trim() !== '' &&
    Number.isFinite(quantidade);

  if (possuiQuantidade && quantidade <= 0) return '';

  const nome = nomeMaterial(item);
  return possuiQuantidade ? `${quantidade}x ${nome}` : nome;
}

function formatarItensAlmoxarifado(valor: unknown) {
  let itens = valor;

  if (typeof itens === 'string') {
    const bruto = itens.trim();
    if (!bruto) return 'materiais';

    try {
      itens = JSON.parse(bruto);
    } catch {
      return bruto.includes('[object Object]') ? 'materiais diversos' : bruto;
    }
  }

  const lista = Array.isArray(itens) ? itens : [itens];
  const formatados = lista
    .map(formatarItemAlmoxarifado)
    .filter((item): item is string => Boolean(item));

  if (formatados.length === 0) return 'materiais';
  if (formatados.length <= 3) return formatados.join(', ');

  const restantes = formatados.length - 3;
  return `${formatados.slice(0, 3).join(', ')} e mais ${restantes} ${restantes === 1 ? 'item' : 'itens'}`;
}

function mapearDados(tabela: string, modulo: Modulo, dados: any[] | null): Pendencia[] {
  return (dados || []).map((item) => {
    let titulo = '';
    let subtitulo = '';
    let solicitante = solicitanteSeguro(item.nome_servidor || item.responsavel, 'Gabinete');

    if (tabela === 'oficios') {
      titulo = texto(item.assunto, 'Ofício sem assunto');
      subtitulo = `${texto(item.numero, 'Sem número')} • ${texto(item.orgao, 'Órgão não informado')}`;
    } else if (tabela === 'solicitacoes_almoxarifado') {
      titulo = `Requisição de ${formatarItensAlmoxarifado(item.itens)}`;
      subtitulo = texto(item.uorg, 'Unidade não informada');
    } else if (tabela === 'solicitacoes_frota') {
      titulo = `Viagem para ${texto(item.destino)}`;
      subtitulo = `${texto(item.data_ida, 'Data não informada')} • ${texto(item.motivo)}`;
    } else if (tabela === 'chamados_patrimonio') {
      titulo = `${texto(item.tipo_chamado)} — ${texto(item.tombamento)}`;
      subtitulo = texto(item.descricao);
    } else {
      titulo = `Férias de ${texto(item.quantidade_dias, '0')} dias`;
      subtitulo = `${texto(item.data_inicio)} a ${texto(item.data_fim)}`;
    }

    return {
      chave: `${tabela}-${item.id}`,
      id: item.id,
      tabela,
      modulo,
      titulo,
      subtitulo,
      protocolo: texto(item.protocolo, `REG-${item.id}`),
      status: texto(item.status, 'Em análise'),
      prioridade: texto(item.prioridade, 'NORMAL'),
      solicitante,
      created_at: item.created_at,
      justificativa_gestor: item.justificativa_gestor,
    };
  });
}

function Kpi({ icone, valor, label, cor }: { icone: any; valor: number; label: string; cor: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcone, { backgroundColor: `${cor}18` }]}>
        <MaterialIcons name={icone} size={20} color={cor} />
      </View>
      <Text style={styles.kpiValor}>{valor}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function CentralGestao() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [identidade, setIdentidade] = useState({
    nome: texto(params.nome, 'Gestor'),
    matricula: texto(params.matricula, 'N/D'),
    nivel_acesso: '',
  });
  const { nome, matricula } = identidade;

  const [itens, setItens] = useState<Pendencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [busca, setBusca] = useState('');
  const [moduloAtivo, setModuloAtivo] = useState<(typeof MODULOS)[number]>('Todos');
  const [selecionado, setSelecionado] = useState<Pendencia | null>(null);
  const [novoStatus, setNovoStatus] = useState('');
  const [justificativa, setJustificativa] = useState('');

  const carregar = async () => {
    setCarregando(true);
    const consultas = await Promise.all([
      supabase.from('oficios').select('*').order('id', { ascending: false }),
      supabase.from('solicitacoes_almoxarifado').select('*').order('id', { ascending: false }),
      supabase.from('solicitacoes_frota').select('*').order('id', { ascending: false }),
      supabase.from('chamados_patrimonio').select('*').order('id', { ascending: false }),
      supabase.from('solicitacoes_ferias').select('*').order('id', { ascending: false }),
    ]);

    const combinados = [
      ...mapearDados('oficios', 'Gabinete', consultas[0].data),
      ...mapearDados('solicitacoes_almoxarifado', 'Almoxarifado', consultas[1].data),
      ...mapearDados('solicitacoes_frota', 'Frota', consultas[2].data),
      ...mapearDados('chamados_patrimonio', 'Patrimônio', consultas[3].data),
      ...mapearDados('solicitacoes_ferias', 'SDGP', consultas[4].data),
    ];

    combinados.sort((a, b) => {
      const prioridadeA = prioridadeSegura(a.prioridade) === 'URGENTE' ? 1 : 0;
      const prioridadeB = prioridadeSegura(b.prioridade) === 'URGENTE' ? 1 : 0;
      if (prioridadeA !== prioridadeB) return prioridadeB - prioridadeA;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    setItens(combinados);
    setCarregando(false);
  };

  useEffect(() => {
    let ativo = true;

    const validarAcesso = async () => {
      try {
        const perfil = await getPortalProfile();
        if (!ativo) return;
        if (!perfil || perfil.nivel_acesso.toUpperCase() !== 'DIAMANTE') {
          Alert.alert('Acesso restrito', 'A Central de Gestão é exclusiva para o perfil DIAMANTE.');
          router.back();
          return;
        }

        setIdentidade({
          nome: perfil.nome,
          matricula: perfil.matricula,
          nivel_acesso: perfil.nivel_acesso,
        });
        await carregar();
      } catch {
        if (!ativo) return;
        Alert.alert('Sessão inválida', 'Entre novamente para acessar a Central de Gestão.');
        router.replace('/login');
      }
    };

    validarAcesso();
    return () => { ativo = false; };
  }, []);

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return itens.filter((item) => {
      const noModulo = moduloAtivo === 'Todos' || item.modulo === moduloAtivo;
      const noTexto = !termo || `${item.protocolo} ${item.titulo} ${item.solicitante}`.toLowerCase().includes(termo);
      return noModulo && noTexto;
    });
  }, [busca, itens, moduloAtivo]);

  const abertos = itens.filter((item) => !statusFinalizado(item.status));
  const urgentes = abertos.filter((item) => prioridadeSegura(item.prioridade) === 'URGENTE');
  const gabinete = abertos.filter((item) => item.modulo === 'Gabinete');
  const concluidos = itens.filter((item) => statusFinalizado(item.status));

  const abrirAnalise = (item: Pendencia) => {
    setSelecionado(item);
    setNovoStatus(item.status);
    setJustificativa(item.justificativa_gestor || '');
  };

  const atualizarStatus = async () => {
    if (!selecionado || !novoStatus) return;
    if (novoStatus.toLowerCase().includes('rejeit') && justificativa.trim().length < 8) {
      Alert.alert('Justificativa obrigatória', 'Informe o motivo da rejeição com pelo menos 8 caracteres.');
      return;
    }

    setAtualizando(true);
    const { error } = await supabase
      .from(selecionado.tabela)
      .update({
        status: novoStatus,
        justificativa_gestor: justificativa.trim() || null,
        atualizado_por_matricula: matricula,
        atualizado_por_nome: nome,
      })
      .eq('id', selecionado.id);

    setAtualizando(false);
    if (error) {
      Alert.alert('Erro', `Não foi possível atualizar: ${error.message}`);
      return;
    }

    setSelecionado(null);
    Alert.alert('Movimentação registrada', 'O status, a auditoria e a notificação foram atualizados.');
    carregar();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.voltar}>
          <MaterialIcons name="arrow-back" size={22} color={C.branco} />
        </TouchableOpacity>
        <View style={styles.headerTexto}>
          <Text style={styles.marca}>gov<Text style={{ color: C.amarelo }}>.</Text>br</Text>
          <Text style={styles.headerTitulo}>Central de Gestão</Text>
        </View>
        <View style={styles.selo}>
          <MaterialIcons name="verified-user" size={14} color={C.amarelo} />
          <Text style={styles.seloTexto}>DIAMANTE</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
        <View style={styles.boasVindas}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boasVindasLabel}>PAINEL DO GESTOR</Text>
            <Text style={styles.boasVindasNome}>{nome}</Text>
            <Text style={styles.boasVindasMeta}>Matrícula {matricula} • visão consolidada em tempo real</Text>
          </View>
          <TouchableOpacity accessibilityLabel="Atualizar painel" onPress={carregar} style={styles.atualizar}>
            <MaterialIcons name="refresh" size={22} color={C.azul} />
          </TouchableOpacity>
        </View>

        <View style={styles.kpis}>
          <Kpi icone="pending-actions" valor={abertos.length} label="Em aberto" cor={C.azul} />
          <Kpi icone="priority-high" valor={urgentes.length} label="Urgentes" cor={C.vermelho} />
          <Kpi icone="gavel" valor={gabinete.length} label="Gabinete" cor="#7E22CE" />
          <Kpi icone="task-alt" valor={concluidos.length} label="Concluídos" cor={C.verde} />
        </View>

        <View style={styles.busca}>
          <MaterialIcons name="search" size={20} color={C.secundario} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar por protocolo, assunto ou servidor"
            placeholderTextColor="#9EA3B0"
            style={styles.buscaInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {MODULOS.map((modulo) => (
            <TouchableOpacity
              key={modulo}
              onPress={() => setModuloAtivo(modulo)}
              style={[styles.filtro, moduloAtivo === modulo && styles.filtroAtivo]}
            >
              <Text style={[styles.filtroTexto, moduloAtivo === modulo && styles.filtroTextoAtivo]}>{modulo}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.tituloLinha}>
          <Text style={styles.secaoTitulo}>Processos e solicitações</Text>
          <Text style={styles.contador}>{filtrados.length} registros</Text>
        </View>

        {carregando ? (
          <ActivityIndicator color={C.azul} size="large" style={{ marginTop: 40 }} />
        ) : filtrados.length === 0 ? (
          <View style={styles.vazio}>
            <MaterialCommunityIcons name="clipboard-check-outline" size={42} color={C.borda} />
            <Text style={styles.vazioTitulo}>Nenhum registro encontrado</Text>
            <Text style={styles.vazioTexto}>Altere os filtros ou aguarde novas solicitações.</Text>
          </View>
        ) : (
          filtrados.map((item) => {
            const status = estiloStatus(item.status);
            const prioridade = CORES_PRIORIDADE[prioridadeSegura(item.prioridade)];
            return (
              <TouchableOpacity key={item.chave} style={styles.card} onPress={() => abrirAnalise(item)} activeOpacity={0.82}>
                <View style={styles.cardTopo}>
                  <View style={styles.moduloTag}>
                    <Text style={styles.moduloTagTexto}>{item.modulo.toUpperCase()}</Text>
                  </View>
                  <View style={[styles.prioridadeTag, { backgroundColor: prioridade.fundo }]}>
                    <Text style={[styles.prioridadeTexto, { color: prioridade.texto }]}>{prioridade.label}</Text>
                  </View>
                </View>
                <Text style={styles.protocolo}>{item.protocolo}</Text>
                <Text style={styles.cardTitulo} numberOfLines={2}>{item.titulo}</Text>
                <Text style={styles.cardSubtitulo} numberOfLines={2}>{item.subtitulo}</Text>
                <View style={styles.cardRodape}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.solicitante}>{item.solicitante}</Text>
                    <Text style={styles.data}>{formatarDataHora(item.created_at)}</Text>
                  </View>
                  <View style={[styles.statusTag, { backgroundColor: status.fundo }]}>
                    <Text style={[styles.statusTexto, { color: status.texto }]}>{status.label}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(selecionado)} transparent animationType="fade" onRequestClose={() => setSelecionado(null)}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSuper}>ANÁLISE ADMINISTRATIVA</Text>
                <Text style={styles.modalTitulo}>{selecionado?.protocolo}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelecionado(null)} style={styles.fechar}>
                <MaterialIcons name="close" size={22} color={C.texto} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.detalheTitulo}>{selecionado?.titulo}</Text>
              <Text style={styles.detalheSub}>{selecionado?.subtitulo}</Text>

              <Text style={styles.label}>Novo status</Text>
              <View style={styles.statusOpcoes}>
                {(selecionado ? STATUS_POR_TABELA[selecionado.tabela] || [] : []).map((opcao) => {
                  const ativo = novoStatus === opcao.valor;
                  return (
                    <TouchableOpacity
                      key={opcao.valor}
                      onPress={() => setNovoStatus(opcao.valor)}
                      style={[styles.statusOpcao, ativo && styles.statusOpcaoAtiva]}
                    >
                      <Text style={[styles.statusOpcaoTexto, ativo && styles.statusOpcaoTextoAtivo]}>{opcao.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Despacho ou justificativa</Text>
              <TextInput
                value={justificativa}
                onChangeText={setJustificativa}
                multiline
                placeholder="Registre a fundamentação da decisão..."
                placeholderTextColor="#9EA3B0"
                style={styles.textarea}
              />

              <View style={styles.auditoriaAviso}>
                <MaterialIcons name="policy" size={18} color={C.azul} />
                <Text style={styles.auditoriaTexto}>A movimentação será registrada na trilha de auditoria e notificará o solicitante.</Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.btnConfirmar} onPress={atualizarStatus} disabled={atualizando}>
              {atualizando ? <ActivityIndicator color={C.branco} /> : (
                <>
                  <MaterialIcons name="task-alt" size={19} color={C.branco} />
                  <Text style={styles.btnConfirmarTexto}>Registrar decisão</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo },
  header: { backgroundColor: C.azul, minHeight: 70, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' },
  headerTexto: { flex: 1 },
  marca: { color: C.branco, fontSize: 13, fontWeight: '900' },
  headerTitulo: { color: C.branco, fontSize: 20, fontWeight: '800' },
  selo: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 14, backgroundColor: '#FFFFFF18' },
  seloTexto: { color: C.branco, fontSize: 10, fontWeight: '800' },
  conteudo: { padding: 16, paddingBottom: 50 },
  boasVindas: { backgroundColor: C.azulEscuro, borderRadius: 18, padding: 18, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  boasVindasLabel: { color: C.amarelo, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  boasVindasNome: { color: C.branco, fontSize: 20, fontWeight: '800', marginTop: 4 },
  boasVindasMeta: { color: '#FFFFFFB8', fontSize: 11, marginTop: 3 },
  atualizar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.branco, alignItems: 'center', justifyContent: 'center' },
  kpis: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  kpi: { width: '47%', flexGrow: 1, backgroundColor: C.branco, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  kpiIcone: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiValor: { color: C.texto, fontSize: 24, fontWeight: '900', marginTop: 8 },
  kpiLabel: { color: C.secundario, fontSize: 11, fontWeight: '600' },
  busca: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 12, paddingHorizontal: 12 },
  buscaInput: { flex: 1, height: 48, paddingLeft: 8, color: C.texto, fontSize: 13 },
  filtros: { gap: 8, paddingVertical: 14 },
  filtro: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda },
  filtroAtivo: { backgroundColor: C.azul, borderColor: C.azul },
  filtroTexto: { color: C.secundario, fontSize: 12, fontWeight: '700' },
  filtroTextoAtivo: { color: C.branco },
  tituloLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  secaoTitulo: { color: C.texto, fontSize: 17, fontWeight: '800' },
  contador: { color: C.secundario, fontSize: 11 },
  card: { backgroundColor: C.branco, borderRadius: 15, padding: 15, marginBottom: 11, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moduloTag: { backgroundColor: '#E8EEFA', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  moduloTagTexto: { color: C.azul, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  prioridadeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  prioridadeTexto: { fontSize: 10, fontWeight: '800' },
  protocolo: { color: C.azul, fontSize: 11, fontWeight: '800', marginTop: 11 },
  cardTitulo: { color: C.texto, fontSize: 15, fontWeight: '800', marginTop: 4 },
  cardSubtitulo: { color: C.secundario, fontSize: 12, lineHeight: 17, marginTop: 4 },
  cardRodape: { flexDirection: 'row', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#EEF0F3', marginTop: 12, paddingTop: 10 },
  solicitante: { color: C.texto, fontSize: 11, fontWeight: '700' },
  data: { color: '#9EA3B0', fontSize: 10, marginTop: 2 },
  statusTag: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12 },
  statusTexto: { fontSize: 10, fontWeight: '800' },
  vazio: { alignItems: 'center', backgroundColor: C.branco, borderWidth: 1, borderStyle: 'dashed', borderColor: C.borda, borderRadius: 14, padding: 32 },
  vazioTitulo: { color: C.texto, fontWeight: '800', marginTop: 10 },
  vazioTexto: { color: C.secundario, fontSize: 12, marginTop: 4 },
  modalFundo: { flex: 1, backgroundColor: '#0F172A99', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: C.branco, borderRadius: 20, padding: 18, maxWidth: 620, width: '100%', alignSelf: 'center' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  modalSuper: { color: C.azul, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  modalTitulo: { color: C.texto, fontSize: 18, fontWeight: '900', marginTop: 3 },
  fechar: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.fundo, alignItems: 'center', justifyContent: 'center' },
  detalheTitulo: { color: C.texto, fontSize: 16, fontWeight: '800' },
  detalheSub: { color: C.secundario, fontSize: 12, lineHeight: 17, marginTop: 4, marginBottom: 18 },
  label: { color: C.texto, fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  statusOpcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusOpcao: { borderWidth: 1, borderColor: C.borda, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  statusOpcaoAtiva: { backgroundColor: C.azul, borderColor: C.azul },
  statusOpcaoTexto: { color: C.secundario, fontSize: 11, fontWeight: '700' },
  statusOpcaoTextoAtivo: { color: C.branco },
  textarea: { minHeight: 100, borderWidth: 1, borderColor: C.borda, borderRadius: 12, padding: 12, textAlignVertical: 'top', color: C.texto, fontSize: 13 },
  auditoriaAviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginTop: 14 },
  auditoriaTexto: { flex: 1, color: C.azulEscuro, fontSize: 11, lineHeight: 16 },
  btnConfirmar: { backgroundColor: C.azul, minHeight: 50, borderRadius: 12, marginTop: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  btnConfirmarTexto: { color: C.branco, fontSize: 14, fontWeight: '800' },
});
