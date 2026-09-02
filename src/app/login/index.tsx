/**
 * Super App Gov — Acesso institucional ao Portal Integrado N2
 * Ficheiro: src/app/login/index.tsx
 */

import React, { useEffect, useRef, useState } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  setPortalSession,
  supabase,
  supabaseConfigurado,
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

type EtapaLogin =
  | 'formulario'
  | 'buscando'
  | 'autorizado'
  | 'negado'
  | 'erro';

function apenasNumeros(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11);
}

function formatarCpf(valor: string) {
  const numeros = apenasNumeros(valor);

  if (numeros.length <= 3) return numeros;
  if (numeros.length <= 6) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
  }
  if (numeros.length <= 9) {
    return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`;
  }

  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`;
}

function Recurso({
  icone,
  titulo,
  texto,
}: {
  icone: React.ComponentProps<typeof MaterialIcons>['name'];
  titulo: string;
  texto: string;
}) {
  return (
    <View style={styles.recurso}>
      <View style={styles.recursoIcone}>
        <MaterialIcons name={icone} size={19} color={C.azul} />
      </View>
      <View style={styles.recursoConteudo}>
        <Text style={styles.recursoTitulo}>{titulo}</Text>
        <Text style={styles.recursoTexto}>{texto}</Text>
      </View>
    </View>
  );
}

export default function LoginGovReal() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const desktop = width >= 820;
  const redirecionamentoRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState('');
  const [etapa, setEtapa] = useState<EtapaLogin>('formulario');

  useEffect(() => {
    return () => {
      if (redirecionamentoRef.current) {
        clearTimeout(redirecionamentoRef.current);
      }
    };
  }, []);

  const alterarCpf = (valor: string) => {
    setCpf(formatarCpf(valor));
    setErroCpf('');
  };

  const consultarSupabase = async (cpfLimpo: string) => {
    setPortalSession(null);
    setEtapa('buscando');

    try {
      const { data, error } = await supabase.rpc('portal_iniciar_sessao', {
        p_cpf: cpfLimpo,
      });

      if (error) throw error;

      const sessao = Array.isArray(data) ? data[0] : data;

      if (!sessao?.session_token) {
        setEtapa('negado');
        return;
      }

      setPortalSession(sessao.session_token);
      setEtapa('autorizado');

      redirecionamentoRef.current = setTimeout(() => {
        router.replace('/');
      }, 900);
    } catch (error) {
      console.error('Erro ao iniciar sessão do portal:', error);
      setEtapa('erro');
    }
  };

  const continuar = () => {
    const cpfLimpo = apenasNumeros(cpf);

    if (cpfLimpo.length !== 11) {
      setErroCpf('Informe os 11 números do CPF.');
      return;
    }

    if (!supabaseConfigurado) {
      setEtapa('erro');
      return;
    }

    consultarSupabase(cpfLimpo);
  };

  const voltarAoFormulario = () => {
    setPortalSession(null);
    setErroCpf('');
    setEtapa('formulario');
  };

  const renderizarEstado = () => {
    if (etapa === 'buscando') {
      return (
        <View style={styles.estadoConteudo}>
          <View style={[styles.estadoIcone, styles.estadoIconeAzul]}>
            <MaterialIcons name="shield" size={38} color={C.azul} />
          </View>
          <ActivityIndicator size="large" color={C.azul} />
          <Text style={styles.estadoTitulo}>Validando sua identificação</Text>
          <Text style={styles.estadoTexto}>
            Estamos confirmando o vínculo funcional e preparando uma sessão segura.
          </Text>
          <View style={styles.progressoTrilho}>
            <View style={styles.progressoBarra} />
          </View>
        </View>
      );
    }

    if (etapa === 'autorizado') {
      return (
        <View style={styles.estadoConteudo}>
          <View style={[styles.estadoIcone, styles.estadoIconeVerde]}>
            <MaterialIcons name="verified-user" size={40} color={C.verde} />
          </View>
          <Text style={styles.estadoSuper}>IDENTIFICAÇÃO CONFIRMADA</Text>
          <Text style={styles.estadoTitulo}>Acesso autorizado</Text>
          <Text style={styles.estadoTexto}>
            Sua sessão foi criada com segurança. Preparando o Portal Integrado N2…
          </Text>
          <ActivityIndicator size="small" color={C.verde} />
        </View>
      );
    }

    const indisponivel = etapa === 'erro';

    return (
      <View style={styles.estadoConteudo}>
        <View style={[styles.estadoIcone, styles.estadoIconeVermelho]}>
          <MaterialIcons
            name={indisponivel ? 'cloud-off' : 'person-off'}
            size={40}
            color={C.vermelho}
          />
        </View>
        <Text style={styles.estadoSuper}>
          {indisponivel ? 'SERVIÇO INDISPONÍVEL' : 'IDENTIFICAÇÃO NÃO LOCALIZADA'}
        </Text>
        <Text style={styles.estadoTitulo}>
          {indisponivel
            ? 'Não foi possível entrar agora'
            : 'Vínculo funcional não encontrado'}
        </Text>
        <Text style={styles.estadoTexto}>
          {indisponivel
            ? 'Verifique sua conexão e tente novamente em alguns instantes.'
            : 'Confira o CPF informado ou procure a unidade responsável pelo cadastro.'}
        </Text>
        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={voltarAoFormulario}
          activeOpacity={0.8}
        >
          <MaterialIcons name="arrow-back" size={18} color={C.azul} />
          <Text style={styles.botaoSecundarioTexto}>Voltar e tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.azulEscuro} />

      <View style={styles.header}>
        <View style={styles.headerConteudo}>
          <View style={styles.marcaIcone}>
            <MaterialIcons name="account-balance" size={23} color={C.amarelo} />
          </View>
          <View style={styles.marcaArea}>
            <Text style={styles.marcaSuper}>PORTAL INTEGRADO</Text>
            <Text style={styles.marca}>N2</Text>
          </View>
          <View style={styles.demoBadge}>
            <View style={styles.demoPonto} />
            <Text style={styles.demoTexto}>AMBIENTE DEMONSTRATIVO</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.pagina}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.grade,
              desktop ? styles.gradeDesktop : styles.gradeMobile,
            ]}
          >
            <View style={[styles.apresentacao, desktop && styles.apresentacaoDesktop]}>
              <Text style={styles.apresentacaoSuper}>SERVIÇOS PÚBLICOS DIGITAIS</Text>
              <Text style={styles.apresentacaoTitulo}>
                Um único acesso para sua jornada institucional
              </Text>
              <Text style={styles.apresentacaoTexto}>
                Consulte serviços, acompanhe solicitações e trabalhe com informações
                administrativas em um ambiente integrado.
              </Text>

              <View style={styles.recursosLista}>
                <Recurso
                  icone="hub"
                  titulo="Serviços integrados"
                  texto="Gabinete, Gestão de Pessoas e Logística em um só portal."
                />
                <Recurso
                  icone="fact-check"
                  titulo="Rastreabilidade"
                  texto="Solicitações e decisões acompanhadas durante todo o fluxo."
                />
                <Recurso
                  icone="auto-awesome"
                  titulo="Inteligência aplicada"
                  texto="Recursos de IA para apoiar orientação e análise administrativa."
                />
              </View>
            </View>

            <View style={[styles.card, desktop && styles.cardDesktop]}>
              {etapa === 'formulario' ? (
                <>
                  <View style={styles.cardCabecalho}>
                    <View style={styles.cadeadoIcone}>
                      <MaterialIcons name="lock-outline" size={21} color={C.azul} />
                    </View>
                    <View style={styles.cardCabecalhoTexto}>
                      <Text style={styles.cardTitulo}>Acesso institucional</Text>
                      <Text style={styles.cardSubtitulo}>
                        Identifique-se para entrar no Portal N2
                      </Text>
                    </View>
                  </View>

                  <View style={styles.informativo}>
                    <MaterialIcons name="info-outline" size={18} color={C.azulMedio} />
                    <Text style={styles.informativoTexto}>
                      Utilize o CPF vinculado ao cadastro demonstrativo do servidor.
                    </Text>
                  </View>

                  <Text style={styles.label}>CPF</Text>
                  <Text style={styles.ajudaLabel}>Digite os 11 números</Text>
                  <View style={[styles.inputMoldura, !!erroCpf && styles.inputMolduraErro]}>
                    <MaterialIcons
                      name="badge"
                      size={20}
                      color={erroCpf ? C.vermelho : C.secundario}
                    />
                    <TextInput
                      style={styles.input}
                      placeholder="000.000.000-00"
                      placeholderTextColor="#9AA6B2"
                      keyboardType="numeric"
                      maxLength={14}
                      value={cpf}
                      onChangeText={alterarCpf}
                      onSubmitEditing={continuar}
                      returnKeyType="done"
                      autoCapitalize="none"
                      accessibilityLabel="Número do CPF"
                    />
                  </View>
                  {!!erroCpf && (
                    <View style={styles.erroLinha}>
                      <MaterialIcons name="error-outline" size={15} color={C.vermelho} />
                      <Text style={styles.erroTexto}>{erroCpf}</Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.botaoPrincipal}
                    onPress={continuar}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.botaoPrincipalTexto}>Entrar no portal</Text>
                    <MaterialIcons name="arrow-forward" size={20} color={C.branco} />
                  </TouchableOpacity>

                  <View style={styles.segurancaLinha}>
                    <MaterialIcons name="verified-user" size={16} color={C.verde} />
                    <Text style={styles.segurancaTexto}>
                      Sessão temporária e acesso protegido
                    </Text>
                  </View>
                </>
              ) : (
                renderizarEstado()
              )}
            </View>
          </View>

          <Text style={styles.rodape}>
            Protótipo acadêmico • Dados e funcionalidades para demonstração institucional
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo },
  pagina: { flex: 1 },
  header: {
    backgroundColor: C.azulEscuro,
    borderBottomWidth: 4,
    borderBottomColor: C.amarelo,
  },
  headerConteudo: {
    width: '100%',
    maxWidth: 1080,
    minHeight: 72,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  marcaIcone: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF12',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  marcaArea: { flex: 1 },
  marcaSuper: {
    color: '#FFFFFFB5',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  marca: { color: C.branco, fontSize: 24, fontWeight: '900', lineHeight: 27 },
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF2C',
    backgroundColor: '#FFFFFF10',
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  demoPonto: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.amarelo },
  demoTexto: {
    color: C.branco,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  scroll: { flexGrow: 1, padding: 18, paddingBottom: 22 },
  grade: {
    width: '100%',
    maxWidth: 1080,
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  gradeDesktop: { flexDirection: 'row', alignItems: 'center', gap: 54 },
  gradeMobile: { flexDirection: 'column-reverse' },
  apresentacao: { paddingTop: 10 },
  apresentacaoDesktop: { flex: 1, maxWidth: 520 },
  apresentacaoSuper: {
    color: C.azul,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginBottom: 9,
  },
  apresentacaoTitulo: {
    color: C.azulEscuro,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
    maxWidth: 520,
  },
  apresentacaoTexto: {
    color: C.secundario,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 520,
  },
  recursosLista: { marginTop: 22, gap: 13 },
  recurso: { flexDirection: 'row', alignItems: 'center' },
  recursoIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recursoConteudo: { flex: 1, marginLeft: 11 },
  recursoTitulo: { color: C.texto, fontSize: 12, fontWeight: '800' },
  recursoTexto: { color: C.secundario, fontSize: 11, lineHeight: 16, marginTop: 2 },
  card: {
    width: '100%',
    backgroundColor: C.branco,
    borderWidth: 1,
    borderColor: C.borda,
    borderRadius: 16,
    padding: 22,
    shadowColor: C.azulEscuro,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  cardDesktop: { width: 420, minHeight: 420, justifyContent: 'center' },
  cardCabecalho: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  cadeadoIcone: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: C.azulClaro,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCabecalhoTexto: { flex: 1, marginLeft: 11 },
  cardTitulo: { color: C.azulEscuro, fontSize: 19, fontWeight: '900' },
  cardSubtitulo: { color: C.secundario, fontSize: 11, marginTop: 3 },
  informativo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: C.azulClaro,
    borderRadius: 9,
    padding: 11,
    marginBottom: 19,
  },
  informativoTexto: { flex: 1, color: C.azulMedio, fontSize: 11, lineHeight: 16 },
  label: { color: C.texto, fontSize: 13, fontWeight: '800' },
  ajudaLabel: { color: C.secundario, fontSize: 10, marginTop: 2, marginBottom: 7 },
  inputMoldura: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#9AA6B2',
    borderRadius: 9,
    paddingHorizontal: 13,
    backgroundColor: C.branco,
  },
  inputMolduraErro: { borderColor: C.vermelho, borderWidth: 2 },
  input: { flex: 1, color: C.texto, fontSize: 16, height: 50, padding: 0 },
  erroLinha: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  erroTexto: { color: C.vermelho, fontSize: 11, fontWeight: '600' },
  botaoPrincipal: {
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.azul,
    borderRadius: 25,
    marginTop: 22,
  },
  botaoPrincipalTexto: { color: C.branco, fontSize: 14, fontWeight: '800' },
  segurancaLinha: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
  },
  segurancaTexto: { color: C.secundario, fontSize: 10 },
  estadoConteudo: { alignItems: 'center', paddingVertical: 20 },
  estadoIcone: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  estadoIconeAzul: { backgroundColor: C.azulClaro },
  estadoIconeVerde: { backgroundColor: C.verdeClaro },
  estadoIconeVermelho: { backgroundColor: C.vermelhoClaro },
  estadoSuper: {
    color: C.azul,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 7,
  },
  estadoTitulo: {
    color: C.azulEscuro,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 12,
  },
  estadoTexto: {
    color: C.secundario,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 330,
    marginTop: 8,
    marginBottom: 18,
  },
  progressoTrilho: {
    width: '78%',
    height: 4,
    borderRadius: 2,
    backgroundColor: C.borda,
    overflow: 'hidden',
  },
  progressoBarra: {
    width: '68%',
    height: 4,
    borderRadius: 2,
    backgroundColor: C.azul,
  },
  botaoSecundario: {
    minHeight: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: C.azul,
    borderRadius: 22,
    paddingHorizontal: 18,
    marginTop: 4,
  },
  botaoSecundarioTexto: { color: C.azul, fontSize: 12, fontWeight: '800' },
  rodape: {
    color: C.secundario,
    fontSize: 9,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 22,
  },
});
