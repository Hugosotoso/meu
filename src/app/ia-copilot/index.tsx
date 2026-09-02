/**
 * Super App Gov — Assistente Virtual Gov.ia
 * Ficheiro: src/app/ia-copilot/index.tsx
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import {
  getPortalProfile,
  supabase,
  type PortalProfile,
} from '../../lib/supabase';

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
  borda: '#DCE3EA',
  amarelo: '#FFCD00',
  verde: '#168821',
  verdeClaro: '#EAF7EC',
  vermelho: '#B42318',
  vermelhoClaro: '#FEF3F2',
};

type Papel = 'usuario' | 'assistente';

type Mensagem = {
  id: string;
  papel: Papel;
  texto: string;
};

type ItemHistorico = {
  papel: Papel;
  texto: string;
};

type SolicitacaoAssistente = {
  mensagem: string;
  historico: ItemHistorico[];
};

type RespostaAssistente = {
  resposta?: string;
  modelo?: string;
  resposta_id?: string | null;
  erro?: string;
};

const PERGUNTAS_SUGERIDAS = [
  'Como solicito um veículo oficial?',
  'Onde consulto meu contracheque?',
  'Como abrir um chamado de patrimônio?',
  'Explique o fluxo do Gabinete Digital.',
];

function criarId(prefixo: string) {
  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function primeiroNome(nome?: string) {
  return String(nome || 'Servidor').trim().split(/\s+/)[0] || 'Servidor';
}

async function extrairMensagemErro(error: unknown) {
  const falha = error as {
    message?: string;
    context?: { json?: () => Promise<unknown> };
  };

  let mensagem = falha?.message || 'Não foi possível consultar o assistente.';
  const contexto = falha?.context;

  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = (await contexto.json()) as RespostaAssistente;
      mensagem = corpo?.erro || mensagem;
    } catch {
      // Mantém a mensagem original quando a resposta não for JSON.
    }
  }

  return mensagem;
}

export default function IaCopilotScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [perfil, setPerfil] = useState<PortalProfile | null>(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [inputTexto, setInputTexto] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [ultimaSolicitacao, setUltimaSolicitacao] =
    useState<SolicitacaoAssistente | null>(null);
  const [modelo, setModelo] = useState('Gemini');

  const possuiPergunta = useMemo(
    () => mensagens.some((mensagem) => mensagem.papel === 'usuario'),
    [mensagens],
  );

  useEffect(() => {
    let telaAtiva = true;

    const validarSessao = async () => {
      try {
        const perfilAtual = await getPortalProfile();

        if (!telaAtiva) return;

        setPerfil(perfilAtual);

        if (perfilAtual) {
          setMensagens([
            {
              id: 'boas-vindas',
              papel: 'assistente',
              texto:
                `Olá, ${primeiroNome(perfilAtual.nome)}! Sou o Assistente Gov.ia. ` +
                'Posso orientar você sobre processos, Gestão de Pessoas, frota, almoxarifado e patrimônio. Como posso ajudar?',
            },
          ]);
        }
      } catch (error) {
        console.error('Erro ao validar sessão no Assistente:', error);

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
    const temporizador = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(temporizador);
  }, [mensagens, carregando, erro]);

  const consultarAssistente = async (solicitacao: SolicitacaoAssistente) => {
    setCarregando(true);
    setErro('');

    try {
      const { data, error } =
        await supabase.functions.invoke<RespostaAssistente>('assistente-gov', {
          body: solicitacao,
        });

      if (error || !data?.resposta) {
        const mensagemErro = error
          ? await extrairMensagemErro(error)
          : data?.erro || 'A IA não retornou uma resposta válida.';

        setErro(mensagemErro);
        return;
      }

      setMensagens((anteriores) => [
        ...anteriores,
        {
          id: criarId('assistente'),
          papel: 'assistente',
          texto: data.resposta as string,
        },
      ]);
      setModelo(String(data.modelo || 'Gemini'));
      setUltimaSolicitacao(null);
    } catch (error) {
      console.error('Erro inesperado ao consultar o Assistente:', error);
      setErro('Falha de conexão com o assistente. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  const enviarMensagem = async (textoSugerido?: string) => {
    const texto = String(textoSugerido ?? inputTexto).trim();

    if (!texto || carregando || texto.length > 2_000) return;

    const historico = mensagens.slice(-8).map((mensagem) => ({
      papel: mensagem.papel,
      texto: mensagem.texto,
    }));
    const solicitacao = { mensagem: texto, historico };

    setInputTexto('');
    setErro('');
    setUltimaSolicitacao(solicitacao);
    setMensagens((anteriores) => [
      ...anteriores,
      {
        id: criarId('usuario'),
        papel: 'usuario',
        texto,
      },
    ]);

    await consultarAssistente(solicitacao);
  };

  if (verificandoSessao) {
    return (
      <SafeAreaView style={styles.carregandoPagina}>
        <StatusBar barStyle="light-content" backgroundColor={C.azulEscuro} />
        <ActivityIndicator size="large" color={C.branco} />
        <Text style={styles.carregandoTexto}>Conectando ao Assistente Gov.ia…</Text>
      </SafeAreaView>
    );
  }

  if (!perfil) {
    return <Redirect href="/login" />;
  }

  const envioBloqueado = carregando || !inputTexto.trim();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={C.azulEscuro} />

      <View style={styles.topoInstitucional}>
        <View style={styles.topoConteudo}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.btnVoltar}
            accessibilityLabel="Voltar"
          >
            <MaterialIcons name="arrow-back" size={23} color={C.branco} />
          </TouchableOpacity>

          <View style={styles.identidade}>
            <View style={styles.identidadeLinha}>
              <MaterialCommunityIcons
                name="robot-outline"
                size={22}
                color={C.amarelo}
              />
              <Text style={styles.headerTitle}>Assistente Gov.ia</Text>
            </View>
            <Text style={styles.headerSubtitle}>Orientação inteligente do Portal N2</Text>
          </View>

          <View style={styles.statusBadge}>
            <View style={styles.statusPonto} />
            <Text style={styles.statusTexto}>IA ATIVA</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.paginaConteudo}>
          <View style={styles.faixaContexto}>
            <View style={styles.faixaIcone}>
              <MaterialIcons name="verified-user" size={18} color={C.azul} />
            </View>
            <View style={styles.faixaTextoArea}>
              <Text style={styles.faixaTitulo}>Atendimento contextual</Text>
              <Text style={styles.faixaTexto} numberOfLines={2}>
                {perfil.cargo || 'Servidor público'} • {perfil.uorg_id || 'Unidade não informada'}
              </Text>
            </View>
            <Text style={styles.modeloTexto}>{modelo}</Text>
          </View>

          <View style={styles.chatCard}>
            <ScrollView
              ref={scrollRef}
              style={styles.chatScroll}
              contentContainerStyle={styles.chatContainer}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.avisoArea}>
                <MaterialIcons name="info-outline" size={17} color={C.azulMedio} />
                <Text style={styles.avisoTexto}>
                  Respostas orientativas. Confirme decisões administrativas com o setor responsável.
                </Text>
              </View>

              {mensagens.map((mensagem) => {
                const usuario = mensagem.papel === 'usuario';

                return (
                  <View
                    key={mensagem.id}
                    style={[
                      styles.mensagemLinha,
                      usuario ? styles.mensagemUsuarioLinha : styles.mensagemIaLinha,
                    ]}
                  >
                    {!usuario && (
                      <View style={styles.avatarIa}>
                        <MaterialCommunityIcons
                          name="robot-outline"
                          size={18}
                          color={C.azul}
                        />
                      </View>
                    )}

                    <View style={styles.mensagemColuna}>
                      <Text
                        style={[
                          styles.autorTexto,
                          usuario && styles.autorUsuarioTexto,
                        ]}
                      >
                        {usuario ? 'Você' : 'Gov.ia'}
                      </Text>
                      <View
                        style={[
                          styles.balao,
                          usuario ? styles.balaoUsuario : styles.balaoIa,
                        ]}
                      >
                        <Text
                          style={usuario ? styles.textoUsuario : styles.textoIa}
                          selectable
                        >
                          {mensagem.texto}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {!possuiPergunta && (
                <View style={styles.sugestoesArea}>
                  <Text style={styles.sugestoesTitulo}>Perguntas rápidas</Text>
                  <View style={styles.sugestoesLista}>
                    {PERGUNTAS_SUGERIDAS.map((pergunta) => (
                      <TouchableOpacity
                        key={pergunta}
                        style={styles.sugestaoBotao}
                        onPress={() => enviarMensagem(pergunta)}
                        disabled={carregando}
                      >
                        <MaterialIcons
                          name="arrow-forward"
                          size={16}
                          color={C.azul}
                        />
                        <Text style={styles.sugestaoTexto}>{pergunta}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {carregando && (
                <View style={[styles.mensagemLinha, styles.mensagemIaLinha]}>
                  <View style={styles.avatarIa}>
                    <MaterialCommunityIcons
                      name="robot-outline"
                      size={18}
                      color={C.azul}
                    />
                  </View>
                  <View style={[styles.balao, styles.balaoIa, styles.digitandoBalao]}>
                    <ActivityIndicator size="small" color={C.azul} />
                    <Text style={styles.digitandoTexto}>Analisando sua pergunta…</Text>
                  </View>
                </View>
              )}

              {!!erro && (
                <View style={styles.erroCard}>
                  <MaterialIcons name="error-outline" size={20} color={C.vermelho} />
                  <View style={styles.erroConteudo}>
                    <Text style={styles.erroTitulo}>Não foi possível responder</Text>
                    <Text style={styles.erroTexto}>{erro}</Text>
                  </View>
                  {!!ultimaSolicitacao && !carregando && (
                    <TouchableOpacity
                      style={styles.repetirBotao}
                      onPress={() => consultarAssistente(ultimaSolicitacao)}
                    >
                      <Text style={styles.repetirTexto}>Tentar novamente</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>

            <View style={styles.compositor}>
              <View style={styles.inputMoldura}>
                <TextInput
                  style={styles.input}
                  value={inputTexto}
                  onChangeText={setInputTexto}
                  placeholder="Digite sua dúvida sobre o portal…"
                  placeholderTextColor={C.secundario}
                  multiline
                  maxLength={2_000}
                  editable={!carregando}
                  textAlignVertical="top"
                  accessibilityLabel="Mensagem para o Assistente Gov.ia"
                />
                <Text style={styles.contador}>{inputTexto.length}/2000</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.btnEnviar,
                  envioBloqueado && styles.btnEnviarDesabilitado,
                ]}
                onPress={() => enviarMensagem()}
                disabled={envioBloqueado}
                accessibilityLabel="Enviar mensagem"
              >
                {carregando ? (
                  <ActivityIndicator size="small" color={C.branco} />
                ) : (
                  <MaterialIcons name="send" size={21} color={C.branco} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.privacidadeArea}>
              <MaterialIcons name="lock-outline" size={14} color={C.secundario} />
              <Text style={styles.privacidadeTexto}>
                A conversa é processada pelo Google Gemini. Não informe senhas ou dados sigilosos.
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.azulEscuro },
  carregandoPagina: {
    flex: 1,
    backgroundColor: C.azulEscuro,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
  },
  carregandoTexto: { color: C.branco, fontSize: 14, fontWeight: '600' },
  topoInstitucional: {
    backgroundColor: C.azulEscuro,
    borderBottomWidth: 4,
    borderBottomColor: C.amarelo,
  },
  topoConteudo: {
    width: '100%',
    maxWidth: 1040,
    minHeight: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  btnVoltar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF14',
    justifyContent: 'center',
    alignItems: 'center',
  },
  identidade: { flex: 1, marginHorizontal: 12 },
  identidadeLinha: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { color: C.branco, fontSize: 18, fontWeight: '800' },
  headerSubtitle: { color: '#FFFFFFB8', fontSize: 11, marginTop: 3 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF12',
    borderWidth: 1,
    borderColor: '#FFFFFF28',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPonto: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#42D66B',
  },
  statusTexto: {
    color: C.branco,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  container: { flex: 1, backgroundColor: C.fundo },
  paginaConteudo: {
    flex: 1,
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: 14,
  },
  faixaContexto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 10,
    padding: 11,
    marginBottom: 10,
  },
  faixaIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faixaTextoArea: { flex: 1, marginHorizontal: 10 },
  faixaTitulo: { color: C.texto, fontSize: 12, fontWeight: '800' },
  faixaTexto: { color: C.secundario, fontSize: 11, marginTop: 2 },
  modeloTexto: {
    color: C.azulMedio,
    backgroundColor: C.azulClaro,
    borderRadius: 14,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 10,
    fontWeight: '700',
    maxWidth: 150,
  },
  chatCard: {
    flex: 1,
    minHeight: 0,
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#071D41',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  chatScroll: { flex: 1, backgroundColor: C.superficie },
  chatContainer: { flexGrow: 1, padding: 16, paddingBottom: 24 },
  avisoArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.azulClaro,
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
  },
  avisoTexto: { flex: 1, color: C.azulMedio, fontSize: 11, lineHeight: 16 },
  mensagemLinha: {
    width: '100%',
    flexDirection: 'row',
    marginBottom: 16,
  },
  mensagemIaLinha: { justifyContent: 'flex-start' },
  mensagemUsuarioLinha: { justifyContent: 'flex-end' },
  avatarIa: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.azulClaro,
    borderWidth: 1,
    borderColor: '#C7DBF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 18,
  },
  mensagemColuna: { maxWidth: '82%' },
  autorTexto: {
    color: C.secundario,
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    marginLeft: 3,
  },
  autorUsuarioTexto: { textAlign: 'right', marginRight: 3 },
  balao: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  balaoUsuario: { backgroundColor: C.azul, borderTopRightRadius: 4 },
  balaoIa: {
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderTopLeftRadius: 4,
  },
  textoUsuario: { color: C.branco, fontSize: 14, lineHeight: 20 },
  textoIa: { color: C.texto, fontSize: 14, lineHeight: 21 },
  sugestoesArea: { marginTop: 2, marginLeft: 42 },
  sugestoesTitulo: {
    color: C.secundario,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 8,
  },
  sugestoesLista: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sugestaoBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: '#B8CCEB',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  sugestaoTexto: { color: C.azulMedio, fontSize: 11, fontWeight: '600' },
  digitandoBalao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 18,
  },
  digitandoTexto: { color: C.secundario, fontSize: 12 },
  erroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: C.vermelhoClaro,
    borderWidth: 1,
    borderColor: '#FECDCA',
    borderRadius: 10,
    padding: 11,
    marginTop: 4,
  },
  erroConteudo: { flex: 1 },
  erroTitulo: { color: C.vermelho, fontSize: 12, fontWeight: '800' },
  erroTexto: {
    color: '#7A271A',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  repetirBotao: {
    borderWidth: 1,
    borderColor: C.vermelho,
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  repetirTexto: { color: C.vermelho, fontSize: 10, fontWeight: '800' },
  compositor: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: C.branco,
    borderTopWidth: 1,
    borderTopColor: C.borda,
    paddingHorizontal: 12,
    paddingTop: 11,
  },
  inputMoldura: {
    flex: 1,
    minHeight: 48,
    maxHeight: 112,
    backgroundColor: C.superficie,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 4,
  },
  input: {
    minHeight: 28,
    maxHeight: 76,
    color: C.texto,
    fontSize: 14,
    padding: 0,
  },
  contador: {
    color: C.secundario,
    fontSize: 9,
    textAlign: 'right',
    marginTop: 2,
  },
  btnEnviar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.azul,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnEnviarDesabilitado: { backgroundColor: '#9AA9BC', opacity: 0.7 },
  privacidadeArea: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    backgroundColor: C.branco,
    paddingHorizontal: 12,
    paddingTop: 7,
    paddingBottom: 10,
  },
  privacidadeTexto: {
    color: C.secundario,
    fontSize: 9,
    textAlign: 'center',
  },
});
