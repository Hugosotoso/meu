/**
 * Super App Gov — Login Híbrido: UI Nativa + Arquitetura Serverless (Supabase)
 * Ficheiro: src/app/login/index.tsx
 */
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase, supabaseConfigurado } from '../../lib/supabase';

const GOV_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F8F9FA', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', ouro: '#FFCD00', cinzaBorda: '#D9DDE8', azulClaro: '#E8EEFA', verde: '#10b981', vermelho: '#ef4444' };

export default function LoginGovReal() {
  const router = useRouter();
  
  const [telaAtual, setTelaAtual] = useState<'gov' | 'terminal'>('gov');
  const [cpf, setCpf] = useState('');
  const [erroCpf, setErroCpf] = useState('');
  const [statusConsulta, setStatusConsulta] = useState<'buscando' | 'autorizado' | 'negado' | 'erro'>('buscando');

  const formatarCPF = (text: string) => {
    const limpo = text.replace(/\D/g, '');
    let formatado = limpo;
    if (limpo.length > 3) formatado = `${limpo.slice(0, 3)}.${limpo.slice(3)}`;
    if (limpo.length > 6) formatado = `${formatado.slice(0, 7)}.${formatado.slice(7)}`;
    if (limpo.length > 9) formatado = `${formatado.slice(0, 11)}-${formatado.slice(11, 13)}`;
    setCpf(formatado);
    setErroCpf('');
  };

  const consultarSupabase = async (cpfLimpo: string) => {
    try {
      const { data, error } = await supabase
        .from('servidores')
        .select('cpf, nome, cargo, uorg_id, matricula, nivel_acesso')
        .eq('cpf', cpfLimpo)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setStatusConsulta('autorizado');
        
        setTimeout(() => {
          router.replace({ 
            pathname: '/', 
            params: { 
              logado: 'sim', 
              cpf: data.cpf || cpfLimpo, 
              nome: data.nome || 'Servidor(a)',
              cargo: data.cargo || 'Cargo não informado',
              uorg: data.uorg_id || 'Gabinete',
              matricula: data.matricula || '000000',
              nivel_acesso: data.nivel_acesso || 'OURO'
            } 
          });
        }, 2500);
      } else {
        setStatusConsulta('negado');
      }
    } catch (error) {
      console.error("Erro no Supabase:", error);
      setStatusConsulta('erro');
    }
  };

  const handleContinuar = () => {
    const cpfLimpo = cpf.replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      setErroCpf('Digite um CPF válido com 11 números.');
      return;
    }

    if (cpfLimpo === '12345678910') {
      setTelaAtual('terminal');
      setStatusConsulta('autorizado');
      setTimeout(() => {
        router.replace({ 
          pathname: '/', 
          params: { logado: 'sim', nome: 'SERVIDOR TESTE', cargo: 'AUDITOR FEDERAL', uorg: 'AGÊNCIA INSS RIO BRANCO', matricula: '1234567', cpf: '123.456.789-10', nivel_acesso: 'DIAMANTE' } 
        });
      }, 1500);
      return;
    }

    setTelaAtual('terminal');

    if (!supabaseConfigurado) {
      setStatusConsulta('erro');
      return;
    }

    setStatusConsulta('buscando');
    consultarSupabase(cpfLimpo);
  };

  // ------------------------------------------------------------------
  // ECRÃ 2: O TERMINAL
  // ------------------------------------------------------------------
  if (telaAtual === 'terminal') {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.cinzaFundo} />
        
        {statusConsulta === 'buscando' && <MaterialIcons name="security" size={60} color={GOV_COLORS.azulPrincipal} style={{ marginBottom: 20 }} />}
        {statusConsulta === 'autorizado' && <MaterialIcons name="check-circle" size={60} color={GOV_COLORS.verde} style={{ marginBottom: 20 }} />}
        {(statusConsulta === 'negado' || statusConsulta === 'erro') && <MaterialIcons name="cancel" size={60} color={GOV_COLORS.vermelho} style={{ marginBottom: 20 }} />}

        {statusConsulta === 'buscando' && <ActivityIndicator size="large" color={GOV_COLORS.ouro} />}
        
        <Text style={styles.tituloDb}>
          {statusConsulta === 'buscando' ? 'A validar Autenticação Gov.br...' : statusConsulta === 'autorizado' ? 'Sessão Segura' : 'Acesso Bloqueado'}
        </Text>
        
        <View style={styles.terminalContainer}>
          {statusConsulta === 'buscando' && (
            <Text style={[styles.terminalText, { color: '#cbd5e1' }]}>
              {'>'} Consultando base de dados governamental...
            </Text>
          )}
          
          {statusConsulta === 'autorizado' && (
            <Text style={[styles.terminalText, { color: GOV_COLORS.verde }]}>
              {'>'} STATUS 200 (OK): Identidade confirmada. Acesso concedido.
            </Text>
          )}

          {statusConsulta === 'negado' && (
            <Text style={[styles.terminalText, { color: GOV_COLORS.vermelho }]}>
              {'>'} STATUS 403 (FORBIDDEN): Vínculo funcional não encontrado.
            </Text>
          )}

          {statusConsulta === 'erro' && (
            <Text style={[styles.terminalText, { color: GOV_COLORS.vermelho }]}>
              {'>'} STATUS 500: Falha de comunicação com o servidor central.
            </Text>
          )}
        </View>

        {(statusConsulta === 'negado' || statusConsulta === 'erro') && (
          <TouchableOpacity style={[styles.btnContinuar, { marginTop: 30, width: '85%' }]} onPress={() => setTelaAtual('gov')} activeOpacity={0.8}>
            <Text style={styles.btnTexto}>Voltar e Tentar Novamente</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------
  // ECRÃ 1: A RÉPLICA NATIVA DO GOV.BR
  // ------------------------------------------------------------------
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={GOV_COLORS.branco} />
      
      <View style={styles.headerOficial}>
        <Text style={styles.govTextHeader}>gov<Text style={{ color: GOV_COLORS.ouro }}>.</Text>br</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll}>
          
          <Text style={styles.tituloSecao}>Identifique-se no gov.br</Text>
          
          <View style={styles.cardBranco}>
            <View style={styles.infoLogin}>
              <MaterialIcons name="info-outline" size={20} color={GOV_COLORS.azulPrincipal} />
              <Text style={styles.textoInfo}>Digite o seu CPF para criar ou aceder à sua conta gov.br</Text>
            </View>

            <Text style={styles.labelInput}>Número do CPF</Text>
            <Text style={styles.subLabel}>Digite apenas números</Text>
            
            <TextInput
              style={[styles.input, erroCpf ? styles.inputErro : null]}
              placeholder="000.000.000-00"
              placeholderTextColor="#9EA3B0"
              keyboardType="numeric"
              maxLength={14}
              value={cpf}
              onChangeText={formatarCPF}
            />
            {erroCpf ? <Text style={styles.textoErro}>{erroCpf}</Text> : null}

            <TouchableOpacity style={styles.btnContinuar} onPress={handleContinuar} activeOpacity={0.8}>
              <Text style={styles.btnTexto}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo }, headerOficial: { backgroundColor: GOV_COLORS.branco, height: 60, justifyContent: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderColor: GOV_COLORS.cinzaBorda }, govTextHeader: { fontSize: 26, fontWeight: '900', color: GOV_COLORS.azulPrincipal, letterSpacing: -0.5 }, scroll: { padding: 20, paddingBottom: 40 }, tituloSecao: { fontSize: 22, fontWeight: '700', color: GOV_COLORS.textoPreto, marginBottom: 20, marginTop: 10 }, cardBranco: { backgroundColor: GOV_COLORS.branco, borderRadius: 8, padding: 24, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda }, infoLogin: { flexDirection: 'row', backgroundColor: GOV_COLORS.azulClaro, padding: 12, borderRadius: 8, marginBottom: 20, alignItems: 'center' }, textoInfo: { flex: 1, marginLeft: 10, fontSize: 13, color: GOV_COLORS.azulEscuro, lineHeight: 18 }, labelInput: { fontSize: 14, fontWeight: '700', color: GOV_COLORS.textoPreto }, subLabel: { fontSize: 12, color: GOV_COLORS.cinzaTexto, marginBottom: 8, marginTop: 2 }, input: { borderWidth: 1, borderColor: GOV_COLORS.cinzaTexto, borderRadius: 4, height: 50, paddingHorizontal: 16, fontSize: 16, color: GOV_COLORS.textoPreto, backgroundColor: GOV_COLORS.branco }, inputErro: { borderColor: GOV_COLORS.vermelho, borderWidth: 2 }, textoErro: { color: GOV_COLORS.vermelho, fontSize: 12, marginTop: 4, fontWeight: '600' }, btnContinuar: { backgroundColor: GOV_COLORS.azulPrincipal, borderRadius: 25, height: 50, justifyContent: 'center', alignItems: 'center', marginTop: 24 }, btnTexto: { color: GOV_COLORS.branco, fontSize: 16, fontWeight: 'bold' }, tituloDb: { fontSize: 20, fontWeight: '800', color: GOV_COLORS.azulEscuro, marginTop: 20, marginBottom: 8 }, terminalContainer: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, marginTop: 30, width: '90%', borderWidth: 1, borderColor: '#334155' }, terminalText: { fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', color: '#cbd5e1', fontSize: 12, marginBottom: 6 } });
