import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const C = {
  roxo: '#7E22CE',
  roxoEscuro: '#581C87',
  roxoClaro: '#F3E8FF',
  azul: '#1351B4',
  azulClaro: '#E8EEFA',
  branco: '#FFFFFF',
  fundo: '#F4F6F9',
  texto: '#1F2937',
  secundario: '#64748B',
  borda: '#D9DDE8',
  verde: '#047857',
  verdeClaro: '#ECFDF5',
  vermelho: '#B91C1C',
  vermelhoClaro: '#FEF2F2',
  laranja: '#C2410C',
  laranjaClaro: '#FFF7ED',
};

type Processo = {
  id: string | number;
  created_at?: string | null;
  updated_at?: string | null;
  numero: string;
  protocolo?: string | null;
  orgao: string;
  orgaoNome?: string | null;
  assunto: string;
  descricao?: string | null;
  interessado?: string | null;
  vencimento: string;
  responsavel?: string | null;
  tipo: string;
  status: string;
  prioridade?: string | null;
  etapa?: string | null;
  sigilo?: string | null;
  justificativa_gestor?: string | null;
};

type AnaliseIA = {
  titulo: string;
  resumo_executivo: string;
  classificacao: {
    prioridade_sugerida: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
    complexidade: 'BAIXA' | 'MEDIA' | 'ALTA';
    confianca: number;
    justificativa: string;
  };
  riscos: Array<{
    nivel: 'BAIXO' | 'MEDIO' | 'ALTO';
    titulo: string;
    justificativa: string;
    evidencia: string;
  }>;
  pendencias: Array<{
    item: string;
    motivo: string;
    evidencia: string;
  }>;
  prazos: Array<{
    status: 'VENCIDO' | 'PROXIMO' | 'REGULAR' | 'INDEFINIDO';
    descricao: string;
    data_mencionada: string;
    evidencia: string;
  }>;
  referencias_legais: Array<{
    referencia: string;
    aplicacao: string;
    confirmada_no_processo: boolean;
  }>;
  proximas_acoes: Array<{
    ordem: number;
    acao: string;
    motivo: string;
  }>;
  minuta_despacho: string;
  limitacoes: string[];
  aviso: string;
};

function texto(valor: unknown, fallback = 'Não informado') {
  const resultado = String(valor ?? '').trim();
  return resultado || fallback;
}

function tituloEnum(valor: string) {
  return texto(valor).replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function coresNivel(nivel: string) {
  if (nivel === 'ALTO' || nivel === 'URGENTE' || nivel === 'VENCIDO') {
    return { texto: C.vermelho, fundo: C.vermelhoClaro };
  }
  if (nivel === 'MEDIO' || nivel === 'ALTA' || nivel === 'PROXIMO') {
    return { texto: C.laranja, fundo: C.laranjaClaro };
  }
  if (nivel === 'REGULAR' || nivel === 'BAIXO' || nivel === 'BAIXA') {
    return { texto: C.verde, fundo: C.verdeClaro };
  }
  return { texto: C.azul, fundo: C.azulClaro };
}

function Tag({ valor }: { valor: string }) {
  const cores = coresNivel(valor);
  return (
    <View style={[styles.tag, { backgroundColor: cores.fundo }]}>
      <Text style={[styles.tagTexto, { color: cores.texto }]}>{tituloEnum(valor)}</Text>
    </View>
  );
}

function Secao({
  titulo,
  icone,
  children,
}: {
  titulo: string;
  icone: any;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.secao}>
      <View style={styles.secaoCabecalho}>
        <View style={styles.secaoIcone}>
          <MaterialIcons name={icone} size={18} color={C.roxo} />
        </View>
        <Text style={styles.secaoTitulo}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

async function extrairMensagemErro(error: any) {
  let mensagem = error?.message || 'Não foi possível concluir a análise.';
  const contexto = error?.context;

  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json();
      mensagem = corpo?.erro || mensagem;
    } catch {
      // Mantém a mensagem original.
    }
  }

  return mensagem;
}

export default function GabineteIAScreen() {
  const router = useRouter();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [processoSelecionado, setProcessoSelecionado] = useState<Processo | null>(null);
  const [analise, setAnalise] = useState<AnaliseIA | null>(null);
  const [modelo, setModelo] = useState('');
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState('');

  const carregarProcessos = async () => {
    setCarregando(true);
    setErro('');

    const { data, error } = await supabase
      .from('oficios')
      .select(
        'id,created_at,updated_at,numero,protocolo,orgao,orgaoNome,assunto,descricao,interessado,vencimento,responsavel,tipo,status,prioridade,etapa,sigilo,justificativa_gestor',
      )
      .order('id', { ascending: false })
      .limit(40);

    if (error) {
      setProcessos([]);
      setErro(error.message);
    } else {
      setProcessos((data || []) as Processo[]);
    }

    setCarregando(false);
  };

  useEffect(() => {
    carregarProcessos();
  }, []);

  const processosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return processos;

    return processos.filter((processo) =>
      [
        processo.protocolo,
        processo.numero,
        processo.orgao,
        processo.orgaoNome,
        processo.assunto,
        processo.interessado,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termo),
    );
  }, [busca, processos]);

  const analisarProcesso = async () => {
    if (!processoSelecionado || analisando) return;

    setAnalisando(true);
    setErro('');

    const { data, error } = await supabase.functions.invoke('analisar-processo', {
      body: { processo: processoSelecionado },
    });

    if (error || !data?.analise) {
      const mensagem = error
        ? await extrairMensagemErro(error)
        : data?.erro || 'A função não retornou uma análise válida.';
      setErro(mensagem);
      setAnalisando(false);
      Alert.alert('Análise não concluída', mensagem);
      return;
    }

    setAnalise(data.analise as AnaliseIA);
    setModelo(texto(data.modelo, 'OpenAI'));
    setAnalisando(false);
  };

  const voltarParaLista = () => {
    setAnalise(null);
    setModelo('');
    setErro('');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.voltar} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={23} color={C.branco} />
        </TouchableOpacity>
        <View style={styles.headerCentro}>
          <View style={styles.headerTituloLinha}>
            <MaterialCommunityIcons name="robot-outline" size={20} color={C.branco} />
            <Text style={styles.headerTitulo}>Gabinete IA</Text>
          </View>
          <Text style={styles.headerSub}>Análise assistida de processos</Text>
        </View>
        <View style={styles.realBadge}>
          <View style={styles.realPonto} />
          <Text style={styles.realTexto}>OPENAI</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.conteudo}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!analise ? (
          <>
            <View style={styles.hero}>
              <View style={styles.heroIcone}>
                <MaterialCommunityIcons name="file-search-outline" size={32} color={C.roxo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitulo}>Análise real dos processos cadastrados</Text>
                <Text style={styles.heroTexto}>
                  Selecione um processo. A IA analisará resumo, riscos, pendências,
                  prazos, próximas ações e produzirá uma minuta de despacho.
                </Text>
              </View>
            </View>

            <View style={styles.avisoBase}>
              <MaterialIcons name="info-outline" size={18} color={C.azul} />
              <Text style={styles.avisoBaseTexto}>
                Esta primeira versão usa os campos e a descrição já salvos no Gabinete.
                Leitura de PDF e DOCX será a próxima evolução.
              </Text>
            </View>

            {analisando ? (
              <View style={styles.analisandoCard}>
                <View style={styles.analisandoIcone}>
                  <ActivityIndicator size="large" color={C.roxo} />
                </View>
                <Text style={styles.analisandoTitulo}>Analisando o processo</Text>
                <Text style={styles.analisandoTexto}>
                  Identificando fatos, lacunas, riscos e ações possíveis. Isso pode levar
                  alguns segundos.
                </Text>
                <View style={styles.processoMini}>
                  <Text style={styles.processoMiniNumero}>
                    {processoSelecionado?.protocolo || processoSelecionado?.numero}
                  </Text>
                  <Text style={styles.processoMiniAssunto} numberOfLines={2}>
                    {processoSelecionado?.assunto}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.buscaBox}>
                  <MaterialIcons name="search" size={21} color={C.secundario} />
                  <TextInput
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar processo, protocolo, órgão ou assunto"
                    placeholderTextColor="#9EA3B0"
                    style={styles.buscaInput}
                  />
                </View>

                <View style={styles.listaCabecalho}>
                  <View>
                    <Text style={styles.listaTitulo}>Escolha o processo</Text>
                    <Text style={styles.listaSub}>{processosFiltrados.length} encontrados</Text>
                  </View>
                  <TouchableOpacity onPress={carregarProcessos} style={styles.atualizarBtn}>
                    <MaterialIcons name="refresh" size={19} color={C.azul} />
                  </TouchableOpacity>
                </View>

                {carregando ? (
                  <ActivityIndicator size="large" color={C.roxo} style={{ marginTop: 40 }} />
                ) : erro && processos.length === 0 ? (
                  <View style={styles.estadoVazio}>
                    <MaterialIcons name="cloud-off" size={38} color={C.vermelho} />
                    <Text style={styles.estadoTitulo}>Não foi possível carregar</Text>
                    <Text style={styles.estadoTexto}>{erro}</Text>
                    <TouchableOpacity style={styles.tentarBtn} onPress={carregarProcessos}>
                      <Text style={styles.tentarTexto}>Tentar novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : processosFiltrados.length === 0 ? (
                  <View style={styles.estadoVazio}>
                    <MaterialCommunityIcons name="file-search-outline" size={40} color={C.borda} />
                    <Text style={styles.estadoTitulo}>Nenhum processo encontrado</Text>
                    <Text style={styles.estadoTexto}>Altere o texto da busca.</Text>
                  </View>
                ) : (
                  processosFiltrados.map((processo) => {
                    const selecionado = String(processoSelecionado?.id) === String(processo.id);
                    return (
                      <TouchableOpacity
                        key={String(processo.id)}
                        style={[styles.processoCard, selecionado && styles.processoCardSelecionado]}
                        activeOpacity={0.8}
                        onPress={() => setProcessoSelecionado(processo)}
                      >
                        <View style={styles.processoIcone}>
                          <MaterialCommunityIcons
                            name="file-document-outline"
                            size={23}
                            color={selecionado ? C.roxo : C.azul}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={styles.processoTopo}>
                            <Text style={styles.processoNumero}>
                              {processo.protocolo || processo.numero}
                            </Text>
                            <Tag valor={texto(processo.prioridade, 'NORMAL')} />
                          </View>
                          <Text style={styles.processoAssunto} numberOfLines={2}>
                            {processo.assunto}
                          </Text>
                          <Text style={styles.processoMeta} numberOfLines={1}>
                            {processo.orgao} • {texto(processo.interessado, 'Sem interessado')}
                          </Text>
                        </View>
                        <MaterialIcons
                          name={selecionado ? 'check-circle' : 'radio-button-unchecked'}
                          size={24}
                          color={selecionado ? C.roxo : C.borda}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}

                {processoSelecionado ? (
                  <TouchableOpacity style={styles.analisarBtn} onPress={analisarProcesso}>
                    <MaterialCommunityIcons name="creation" size={21} color={C.branco} />
                    <Text style={styles.analisarBtnTexto}>Analisar processo com IA</Text>
                  </TouchableOpacity>
                ) : null}
              </>
            )}
          </>
        ) : (
          <View style={styles.resultado}>
            <View style={styles.resultadoTopo}>
              <View style={styles.resultadoSelo}>
                <MaterialCommunityIcons name="check-decagram" size={20} color={C.roxo} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultadoSuper}>ANÁLISE CONCLUÍDA</Text>
                <Text style={styles.resultadoTitulo}>{analise.titulo}</Text>
                <Text style={styles.resultadoProcesso}>
                  {processoSelecionado?.protocolo || processoSelecionado?.numero}
                </Text>
              </View>
            </View>

            <View style={styles.metricas}>
              <View style={styles.metrica}>
                <Text style={styles.metricaLabel}>Prioridade sugerida</Text>
                <Tag valor={analise.classificacao.prioridade_sugerida} />
              </View>
              <View style={styles.metrica}>
                <Text style={styles.metricaLabel}>Complexidade</Text>
                <Tag valor={analise.classificacao.complexidade} />
              </View>
              <View style={styles.metrica}>
                <Text style={styles.metricaLabel}>Confiança</Text>
                <Text style={styles.confianca}>{analise.classificacao.confianca}%</Text>
              </View>
            </View>

            <Secao titulo="Resumo executivo" icone="summarize">
              <Text style={styles.textoPrincipal}>{analise.resumo_executivo}</Text>
              <View style={styles.justificativaBox}>
                <Text style={styles.justificativaLabel}>CRITÉRIO DA CLASSIFICAÇÃO</Text>
                <Text style={styles.justificativaTexto}>{analise.classificacao.justificativa}</Text>
              </View>
            </Secao>

            <Secao titulo={`Riscos identificados (${analise.riscos.length})`} icone="warning-amber">
              {analise.riscos.length === 0 ? (
                <Text style={styles.semItens}>Nenhum risco objetivo identificado nos dados enviados.</Text>
              ) : analise.riscos.map((risco, indice) => (
                <View key={`${risco.titulo}-${indice}`} style={styles.itemResultado}>
                  <View style={styles.itemTopo}>
                    <Text style={styles.itemTitulo}>{risco.titulo}</Text>
                    <Tag valor={risco.nivel} />
                  </View>
                  <Text style={styles.itemTexto}>{risco.justificativa}</Text>
                  <Text style={styles.evidencia}>Evidência: {risco.evidencia}</Text>
                </View>
              ))}
            </Secao>

            <Secao titulo={`Pendências (${analise.pendencias.length})`} icone="rule">
              {analise.pendencias.length === 0 ? (
                <Text style={styles.semItens}>Nenhuma pendência objetiva identificada.</Text>
              ) : analise.pendencias.map((pendencia, indice) => (
                <View key={`${pendencia.item}-${indice}`} style={styles.itemResultado}>
                  <Text style={styles.itemTitulo}>{pendencia.item}</Text>
                  <Text style={styles.itemTexto}>{pendencia.motivo}</Text>
                  <Text style={styles.evidencia}>Evidência: {pendencia.evidencia}</Text>
                </View>
              ))}
            </Secao>

            <Secao titulo="Prazos" icone="event">
              {analise.prazos.length === 0 ? (
                <Text style={styles.semItens}>Nenhum prazo pôde ser extraído.</Text>
              ) : analise.prazos.map((prazo, indice) => (
                <View key={`${prazo.descricao}-${indice}`} style={styles.itemResultado}>
                  <View style={styles.itemTopo}>
                    <Text style={styles.itemTitulo}>{prazo.descricao}</Text>
                    <Tag valor={prazo.status} />
                  </View>
                  <Text style={styles.itemTexto}>Data: {prazo.data_mencionada}</Text>
                  <Text style={styles.evidencia}>Evidência: {prazo.evidencia}</Text>
                </View>
              ))}
            </Secao>

            <Secao titulo="Referências legais encontradas" icone="gavel">
              {analise.referencias_legais.length === 0 ? (
                <Text style={styles.semItens}>Nenhuma referência legal consta nos dados analisados.</Text>
              ) : analise.referencias_legais.map((referencia, indice) => (
                <View key={`${referencia.referencia}-${indice}`} style={styles.itemResultado}>
                  <View style={styles.itemTopo}>
                    <Text style={styles.itemTitulo}>{referencia.referencia}</Text>
                    <MaterialIcons
                      name={referencia.confirmada_no_processo ? 'verified' : 'help-outline'}
                      size={19}
                      color={referencia.confirmada_no_processo ? C.verde : C.laranja}
                    />
                  </View>
                  <Text style={styles.itemTexto}>{referencia.aplicacao}</Text>
                </View>
              ))}
            </Secao>

            <Secao titulo="Próximas ações sugeridas" icone="route">
              {analise.proximas_acoes.map((acao, indice) => (
                <View key={`${acao.ordem}-${indice}`} style={styles.acaoItem}>
                  <View style={styles.acaoNumero}>
                    <Text style={styles.acaoNumeroTexto}>{acao.ordem}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitulo}>{acao.acao}</Text>
                    <Text style={styles.itemTexto}>{acao.motivo}</Text>
                  </View>
                </View>
              ))}
            </Secao>

            <View style={styles.minutaCard}>
              <View style={styles.secaoCabecalho}>
                <View style={[styles.secaoIcone, { backgroundColor: C.roxoClaro }]}>
                  <MaterialCommunityIcons name="text-box-edit-outline" size={19} color={C.roxo} />
                </View>
                <Text style={[styles.secaoTitulo, { color: C.roxoEscuro }]}>Minuta sugerida</Text>
              </View>
              <Text style={styles.minutaTexto}>{analise.minuta_despacho}</Text>
            </View>

            {analise.limitacoes.length > 0 ? (
              <Secao titulo="Limitações desta análise" icone="info-outline">
                {analise.limitacoes.map((limitacao, indice) => (
                  <View key={`${limitacao}-${indice}`} style={styles.limitacaoLinha}>
                    <View style={styles.bolinha} />
                    <Text style={styles.limitacaoTexto}>{limitacao}</Text>
                  </View>
                ))}
              </Secao>
            ) : null}

            <View style={styles.avisoFinal}>
              <MaterialIcons name="verified-user" size={20} color={C.laranja} />
              <View style={{ flex: 1 }}>
                <Text style={styles.avisoFinalTitulo}>Revisão humana obrigatória</Text>
                <Text style={styles.avisoFinalTexto}>{analise.aviso}</Text>
                <Text style={styles.modeloTexto}>Modelo: {modelo}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.analisarBtn} onPress={analisarProcesso} disabled={analisando}>
              {analisando ? (
                <ActivityIndicator color={C.branco} />
              ) : (
                <>
                  <MaterialIcons name="refresh" size={21} color={C.branco} />
                  <Text style={styles.analisarBtnTexto}>Analisar novamente</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.novaAnaliseBtn} onPress={voltarParaLista}>
              <Text style={styles.novaAnaliseTexto}>Escolher outro processo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo },
  header: { minHeight: 72, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.roxo, flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFFFFF18', alignItems: 'center', justifyContent: 'center' },
  headerCentro: { flex: 1 },
  headerTituloLinha: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  headerTitulo: { color: C.branco, fontSize: 19, fontWeight: '900' },
  headerSub: { color: '#FFFFFFB8', fontSize: 10, marginTop: 2 },
  realBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF18', borderRadius: 14, paddingHorizontal: 9, paddingVertical: 6 },
  realPonto: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#86EFAC' },
  realTexto: { color: C.branco, fontSize: 9, fontWeight: '900' },
  conteudo: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 16, paddingBottom: 70 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, backgroundColor: C.roxoEscuro, borderRadius: 18, marginBottom: 11 },
  heroIcone: { width: 58, height: 58, borderRadius: 18, backgroundColor: C.roxoClaro, alignItems: 'center', justifyContent: 'center' },
  heroTitulo: { color: C.branco, fontSize: 18, fontWeight: '900' },
  heroTexto: { color: '#FFFFFFC9', fontSize: 11, lineHeight: 17, marginTop: 5 },
  avisoBase: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.azulClaro, borderRadius: 12, padding: 13, marginBottom: 14 },
  avisoBaseTexto: { flex: 1, color: '#0C326F', fontSize: 10, lineHeight: 15 },
  buscaBox: { height: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda, borderRadius: 13 },
  buscaInput: { flex: 1, height: 48, color: C.texto, fontSize: 12 },
  listaCabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 9 },
  listaTitulo: { color: C.texto, fontSize: 15, fontWeight: '900' },
  listaSub: { color: C.secundario, fontSize: 10, marginTop: 2 },
  atualizarBtn: { width: 38, height: 38, borderRadius: 11, backgroundColor: C.azulClaro, alignItems: 'center', justifyContent: 'center' },
  processoCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.branco, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 13, marginBottom: 9 },
  processoCardSelecionado: { borderColor: C.roxo, backgroundColor: '#FAF5FF' },
  processoIcone: { width: 43, height: 43, borderRadius: 12, backgroundColor: C.fundo, alignItems: 'center', justifyContent: 'center' },
  processoTopo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  processoNumero: { flex: 1, color: C.azul, fontSize: 10, fontWeight: '900' },
  processoAssunto: { color: C.texto, fontSize: 13, lineHeight: 18, fontWeight: '800', marginTop: 4 },
  processoMeta: { color: C.secundario, fontSize: 9, marginTop: 4 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 10 },
  tagTexto: { fontSize: 8, fontWeight: '900' },
  analisarBtn: { minHeight: 53, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.roxo, borderRadius: 13, marginTop: 16 },
  analisarBtnTexto: { color: C.branco, fontSize: 13, fontWeight: '900' },
  analisandoCard: { backgroundColor: C.branco, borderRadius: 20, borderWidth: 1, borderColor: C.roxoClaro, padding: 28, alignItems: 'center', marginTop: 12 },
  analisandoIcone: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.roxoClaro, alignItems: 'center', justifyContent: 'center' },
  analisandoTitulo: { color: C.roxoEscuro, fontSize: 19, fontWeight: '900', marginTop: 16 },
  analisandoTexto: { color: C.secundario, fontSize: 11, lineHeight: 17, textAlign: 'center', maxWidth: 500, marginTop: 6 },
  processoMini: { width: '100%', backgroundColor: C.fundo, borderRadius: 12, padding: 13, marginTop: 18 },
  processoMiniNumero: { color: C.azul, fontSize: 10, fontWeight: '900' },
  processoMiniAssunto: { color: C.texto, fontSize: 12, fontWeight: '700', marginTop: 4 },
  estadoVazio: { alignItems: 'center', padding: 28, marginTop: 14, backgroundColor: C.branco, borderWidth: 1, borderStyle: 'dashed', borderColor: C.borda, borderRadius: 15 },
  estadoTitulo: { color: C.texto, fontSize: 14, fontWeight: '900', marginTop: 9 },
  estadoTexto: { color: C.secundario, fontSize: 10, textAlign: 'center', marginTop: 4 },
  tentarBtn: { backgroundColor: C.azul, borderRadius: 10, paddingHorizontal: 15, paddingVertical: 9, marginTop: 13 },
  tentarTexto: { color: C.branco, fontSize: 10, fontWeight: '900' },
  resultado: { gap: 12 },
  resultadoTopo: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.roxoEscuro, borderRadius: 18, padding: 18 },
  resultadoSelo: { width: 52, height: 52, borderRadius: 16, backgroundColor: C.roxoClaro, alignItems: 'center', justifyContent: 'center' },
  resultadoSuper: { color: '#D8B4FE', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  resultadoTitulo: { color: C.branco, fontSize: 17, lineHeight: 22, fontWeight: '900', marginTop: 3 },
  resultadoProcesso: { color: '#FFFFFFB8', fontSize: 9, marginTop: 4 },
  metricas: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  metrica: { flex: 1, minWidth: 120, backgroundColor: C.branco, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 13, padding: 13 },
  metricaLabel: { color: C.secundario, fontSize: 9, fontWeight: '700', marginBottom: 7 },
  confianca: { color: C.roxo, fontSize: 20, fontWeight: '900' },
  secao: { backgroundColor: C.branco, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 16, padding: 16 },
  secaoCabecalho: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  secaoIcone: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.roxoClaro, alignItems: 'center', justifyContent: 'center' },
  secaoTitulo: { flex: 1, color: C.texto, fontSize: 14, fontWeight: '900' },
  textoPrincipal: { color: C.texto, fontSize: 13, lineHeight: 21 },
  justificativaBox: { backgroundColor: C.fundo, borderRadius: 11, padding: 12, marginTop: 13 },
  justificativaLabel: { color: C.roxo, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  justificativaTexto: { color: C.secundario, fontSize: 10, lineHeight: 16, marginTop: 5 },
  itemResultado: { borderTopWidth: 1, borderTopColor: '#EEF0F3', paddingTop: 12, marginTop: 4, marginBottom: 8 },
  itemTopo: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 9 },
  itemTitulo: { flex: 1, color: C.texto, fontSize: 12, fontWeight: '900' },
  itemTexto: { color: C.secundario, fontSize: 10, lineHeight: 16, marginTop: 5 },
  evidencia: { color: C.azul, fontSize: 9, lineHeight: 14, marginTop: 6, fontStyle: 'italic' },
  semItens: { color: C.secundario, fontSize: 11, lineHeight: 17 },
  acaoItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: '#EEF0F3', paddingTop: 12, marginTop: 4, marginBottom: 8 },
  acaoNumero: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.roxoClaro, alignItems: 'center', justifyContent: 'center' },
  acaoNumeroTexto: { color: C.roxo, fontSize: 11, fontWeight: '900' },
  minutaCard: { backgroundColor: '#FAF5FF', borderWidth: 1.5, borderColor: C.roxo, borderRadius: 16, padding: 16 },
  minutaTexto: { color: C.texto, fontSize: 13, lineHeight: 21 },
  limitacaoLinha: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  bolinha: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.laranja, marginTop: 5 },
  limitacaoTexto: { flex: 1, color: C.secundario, fontSize: 10, lineHeight: 15 },
  avisoFinal: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.laranjaClaro, borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14, padding: 14 },
  avisoFinalTitulo: { color: C.laranja, fontSize: 11, fontWeight: '900' },
  avisoFinalTexto: { color: '#7C2D12', fontSize: 10, lineHeight: 15, marginTop: 3 },
  modeloTexto: { color: C.secundario, fontSize: 8, marginTop: 6 },
  novaAnaliseBtn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  novaAnaliseTexto: { color: C.roxo, fontSize: 12, fontWeight: '900' },
});
