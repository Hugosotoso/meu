import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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
import { Servidor, useSession } from '../../context/SessionContext';
import { DEMO_CPF, DEMO_SERVIDOR } from '../../lib/demoData';
import { supabase } from '../../lib/supabase';

const COLORS = {
  azul: '#1351B4',
  azulEscuro: '#0C3789',
  azulClaro: '#E8EEFA',
  branco: '#FFFFFF',
  cinzaFundo: '#F8F9FA',
  cinzaTexto: '#555A60',
  cinzaBorda: '#D9DDE8',
  texto: '#1A1A1A',
  verde: '#10B981',
  vermelho: '#EF4444',
  ouro: '#FFCD00',
};

export default function LoginPortalN2() {
  const router = useRouter();
  const { entrar } = useSession();
  const [telaAtual, setTelaAtual] = useState<'login' | 'status'>('login');
  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState('');
  const [status, setStatus] = useState<'buscando' | 'autorizado' | 'negado' | 'erro'>('buscando');

  const formatarCPF = (texto: string) => {
    const numeros = texto.replace(/\D/g, '').slice(0, 11);
    let formatado = numeros;
    if (numeros.length > 3) formatado = `${numeros.slice(0, 3)}.${numeros.slice(3)}`;
    if (numeros.length > 6) formatado = `${formatado.slice(0, 7)}.${formatado.slice(7)}`;
    if (numeros.length > 9) formatado = `${formatado.slice(0, 11)}-${formatado.slice(11)}`;
    setCpf(formatado);
    setErroCpf('');
  };

  const concluirLogin = (servidor: Servidor, atraso = 900) => {
    entrar(servidor);
    setStatus('autorizado');
    setTimeout(() => router.replace('/'), atraso);
  };

  const consultarCadastro = async (cpfLimpo: string) => {
    try {
      const { data, error } = await supabase
        .from('servidores')
        .select('cpf, nome, cargo, uorg, matricula')
        .eq('cpf', cpfLimpo)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setStatus('negado');
        return;
      }

      concluirLogin({
        cpf: String(data.cpf || cpfLimpo),
        nome: String(data.nome || 'Servidor(a)'),
        cargo: String(data.cargo || 'Cargo não informado'),
        uorg: String(data.uorg || 'Unidade não informada'),
        matricula: String(data.matricula || '000000'),
      });
    } catch (error) {
      console.error('Falha ao consultar o cadastro:', error);
      setStatus('erro');
    }
  };

  const handleContinuar = () => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroCpf('Digite o identificador completo com 11 números.');
      return;
    }

    setTelaAtual('status');
    setStatus('buscando');

    if (cpfLimpo === DEMO_CPF) {
      concluirLogin(DEMO_SERVIDOR);
      return;
    }

    if (process.env.EXPO_PUBLIC_ENABLE_REMOTE_LOOKUP !== 'true') {
      setStatus('negado');
      return;
    }

    consultarCadastro(cpfLimpo);
  };

  if (telaAtual === 'status') {
    const bloqueado = status === 'negado' || status === 'erro';
    return (
      <SafeAreaView style={[styles.safe, styles.statusScreen]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.cinzaFundo} />

        <MaterialIcons
          name={status === 'buscando' ? 'security' : status === 'autorizado' ? 'check-circle' : 'cancel'}
          size={60}
          color={status === 'buscando' ? COLORS.azul : status === 'autorizado' ? COLORS.verde : COLORS.vermelho}
          style={styles.statusIcon}
        />
        {status === 'buscando' && <ActivityIndicator size="large" color={COLORS.ouro} />}

        <Text style={styles.statusTitle}>
          {status === 'buscando' ? 'Validando o acesso ao protótipo...' : status === 'autorizado' ? 'Acesso confirmado' : 'Acesso bloqueado'}
        </Text>

        <View style={styles.terminal}>
          <Text style={[styles.terminalText, { color: bloqueado ? COLORS.vermelho : status === 'autorizado' ? COLORS.verde : '#CBD5E1' }]}>
            {'>'} {status === 'buscando'
              ? 'Consultando o cadastro do protótipo...'
              : status === 'autorizado'
                ? 'STATUS 200: cadastro confirmado.'
                : status === 'negado'
                  ? 'STATUS 403: cadastro não encontrado.'
                  : 'STATUS 500: falha de comunicação.'}
          </Text>
        </View>

        {bloqueado && (
          <TouchableOpacity style={[styles.primaryButton, styles.retryButton]} onPress={() => setTelaAtual('login')}>
            <Text style={styles.primaryButtonText}>Voltar e tentar novamente</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.branco} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Portal Integrado N2</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Acesse o protótipo</Text>

          <View style={styles.card}>
            <View style={styles.notice}>
              <MaterialIcons name="info-outline" size={20} color={COLORS.azul} />
              <Text style={styles.noticeText}>Ambiente acadêmico demonstrativo. Não informe dados pessoais reais.</Text>
            </View>

            <Text style={styles.label}>Identificador de teste</Text>
            <Text style={styles.helper}>Use 123.456.789-10 para entrar na demonstração</Text>
            <TextInput
              style={[styles.input, erroCpf ? styles.inputError : null]}
              placeholder="000.000.000-00"
              placeholderTextColor="#9EA3B0"
              keyboardType="numeric"
              maxLength={14}
              value={cpf}
              onChangeText={formatarCPF}
              onSubmitEditing={handleContinuar}
              returnKeyType="go"
              accessibilityLabel="Identificador de teste"
            />
            {erroCpf ? <Text style={styles.errorText}>{erroCpf}</Text> : null}

            <TouchableOpacity style={styles.primaryButton} onPress={handleContinuar} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: COLORS.cinzaFundo },
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: COLORS.branco, borderBottomWidth: 1, borderColor: COLORS.cinzaBorda },
  headerTitle: { fontSize: 24, fontWeight: '900', color: COLORS.azul, letterSpacing: -0.5 },
  scroll: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.texto, marginBottom: 20, marginTop: 10 },
  card: { backgroundColor: COLORS.branco, borderRadius: 12, padding: 24, borderWidth: 1, borderColor: COLORS.cinzaBorda },
  notice: { flexDirection: 'row', backgroundColor: COLORS.azulClaro, padding: 12, borderRadius: 8, marginBottom: 20, alignItems: 'center' },
  noticeText: { flex: 1, marginLeft: 10, fontSize: 13, color: COLORS.azulEscuro, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '700', color: COLORS.texto },
  helper: { fontSize: 12, color: COLORS.cinzaTexto, marginBottom: 8, marginTop: 2 },
  input: { borderWidth: 1, borderColor: COLORS.cinzaTexto, borderRadius: 6, height: 50, paddingHorizontal: 16, fontSize: 16, color: COLORS.texto, backgroundColor: COLORS.branco },
  inputError: { borderColor: COLORS.vermelho, borderWidth: 2 },
  errorText: { color: COLORS.vermelho, fontSize: 12, marginTop: 4, fontWeight: '600' },
  primaryButton: { backgroundColor: COLORS.azul, borderRadius: 25, minHeight: 50, justifyContent: 'center', alignItems: 'center', marginTop: 24, paddingHorizontal: 18 },
  primaryButtonText: { color: COLORS.branco, fontSize: 16, fontWeight: 'bold' },
  statusScreen: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  statusIcon: { marginBottom: 20 },
  statusTitle: { fontSize: 20, fontWeight: '800', color: COLORS.azulEscuro, marginTop: 20, marginBottom: 8, textAlign: 'center' },
  terminal: { backgroundColor: '#1E293B', padding: 16, borderRadius: 8, marginTop: 24, width: '100%', maxWidth: 560, borderWidth: 1, borderColor: '#334155' },
  terminalText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 12 },
  retryButton: { width: '100%', maxWidth: 460 },
});
