/**
 * Super App Gov — Dashboard Central (Cores Desacopladas / Manuais)
 * Ficheiro: src/app/index.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, Redirect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase'; // 🛡️ Conexão com o banco de dados!

const NOTICIAS_API = [
  "INSS: Nova portaria acelera concessão via Atestmed em todo o país.",
  "SEAD-AC: Recadastramento funcional obrigatório encerra nesta sexta-feira.",
  "Dataprev: Manutenção programada do sistema SIBE ocorrerá na madrugada de domingo."
];

// Cores individuais inseridas direto no badgeCor
const MODULOS_ATIVOS = [
  { id: 'gabinete', titulo: 'Módulo Gabinete', subtitulo: 'Processos, ofícios, prazos e assinatura', icone: 'gavel', rota: '/gabinete', badge: 'Prioritário', badgeCor: '#7E22CE' },
  { id: 'sdgp', titulo: 'Módulo SDGP', subtitulo: 'Gestão de Pessoal e RH', icone: 'people', rota: '/sdgp', badge: 'Ativo', badgeCor: '#118643' },
  { id: 'logistica', titulo: 'Logística e Frota', subtitulo: 'Controle de Patrimônio', icone: 'local-shipping', rota: '/logistica', badge: 'Ativo', badgeCor: '#118643' },
  { id: 'ia-copilot', titulo: 'Assistente Gov.ia', subtitulo: 'Inteligência e Suporte INSS', icone: 'auto-awesome', rota: '/ia-copilot', badge: 'Cloud API', badgeCor: '#FFCD00' }
];

const MODULO_GESTAO = {
  id: 'central',
  titulo: 'Central de Gestão',
  subtitulo: 'Pendências, decisões, auditoria e indicadores',
  icone: 'dashboard',
  rota: '/central',
  badge: 'Gestor',
  badgeCor: '#0C3789',
};

export default function Dashboard() {
  const router = useRouter();
  
  // 📡 APANHANDO OS DADOS ENVIADOS PELO LOGIN (CRACHÁ VIP)
  const params = useLocalSearchParams();
  
  // Extraindo as variáveis do banco de dados (com fallback de segurança)
  const isLogado = params.logado === 'sim';
  const nomeServidor = (params.nome as string) || 'SERVIDOR AUTENTICADO';
  const cargoServidor = (params.cargo as string) || 'A carregar cargo...';
  const uorgServidor = (params.uorg as string) || 'A carregar lotação...';
  const nivelAcesso = (params.nivel_acesso as string) || 'OURO';
  
  // Máscara simples de CPF (ex: 111.***.***-44)
  const cpfServidor = params.cpf as string;
  const cpfMascarado = cpfServidor ? `${cpfServidor.slice(0,3)}.***.***-${cpfServidor.slice(-2)}` : '***.***.***-**';

  const [indiceNoticia, setIndiceNoticia] = useState(0);

  // 💰 ESTADOS DO CONTRACHEQUE DA TELA INICIAL
  const [ultimoSalario, setUltimoSalario] = useState<number | null>(null);
  const [mesSalario, setMesSalario] = useState<string>('');
  const [carregandoSalario, setCarregandoSalario] = useState(true);
  const [salarioVisivel, setSalarioVisivel] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);
  const modulosVisiveis = nivelAcesso.toUpperCase() === 'DIAMANTE'
    ? [MODULO_GESTAO, ...MODULOS_ATIVOS]
    : MODULOS_ATIVOS;

  // Gira o carrossel de notícias
  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceNoticia((prev) => (prev + 1) % NOTICIAS_API.length);
    }, 4000);
    return () => clearInterval(intervalo);
  }, []);

  // 📡 BUSCA O ÚLTIMO SALÁRIO DIRETO DO SUPABASE
  useEffect(() => {
    const buscarSalario = async () => {
      if (!isLogado || !params.matricula) {
        setCarregandoSalario(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('liquido, mes_referencia')
          .eq('matricula', String(params.matricula))
          .order('id', { ascending: false }) // Mais recente no topo
          .limit(1)
          .single(); // Pega só um registro exato

        if (error) throw error;

        if (data) {
          setUltimoSalario(Number(data.liquido));
          setMesSalario(data.mes_referencia);
        }
      } catch (error) {
        console.error("Erro ao buscar salário na Home:", error);
      } finally {
        setCarregandoSalario(false);
      }
    };

    buscarSalario();
  }, [isLogado, params.matricula]);

  useEffect(() => {
    const buscarNotificacoes = async () => {
      if (!params.matricula) return;
      const { count } = await supabase
        .from('notificacoes')
        .select('id', { count: 'exact', head: true })
        .eq('matricula', String(params.matricula))
        .eq('lida', false);
      setNotificacoesNaoLidas(count || 0);
    };
    buscarNotificacoes();
  }, [params.matricula]);

  if (!isLogado) {
    return <Redirect href="/login" />;
  }

  const formatarMoeda = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1351B4" />
      
      {/* HEADER GOV.BR */}
      <View style={styles.govBar}>
        <View style={styles.logoContainer}>
          <Text style={styles.govText}>gov<Text style={{ color: '#FFCD00' }}>.</Text>br</Text>
          <View style={styles.separadorVertical} />
          <Text style={styles.subTituloGov}>Portal Integrado de Gestão Pública</Text>
        </View>
        <TouchableOpacity
          style={styles.acessibilidadeContainer}
          onPress={() => nivelAcesso.toUpperCase() === 'DIAMANTE' && router.push({ pathname: '/central', params: { ...params } })}
        >
          <MaterialIcons name="notifications" size={18} color="#FFCD00" />
          {notificacoesNaoLidas > 0 ? (
            <View style={styles.contadorNotificacao}>
              <Text style={styles.contadorNotificacaoTexto}>{Math.min(notificacoesNaoLidas, 9)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 💳 PAINEL DO SERVIDOR */}
        <View style={styles.painelUsuario}>
          <View style={styles.usuarioHeader}>
            <View style={styles.avatarCirculo}>
              <MaterialIcons name="person" size={28} color="#FFCD00" />
            </View>
            <View style={styles.usuarioInfo}>
              <Text style={styles.nomeServidor}>{nomeServidor.toUpperCase()}</Text>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="badge" size={12} color="#FFCD00" />
                <Text style={styles.dadosServidor}>CPF: <Text style={{fontWeight:'bold'}}>{cpfMascarado}</Text></Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="work" size={12} color="#FFCD00" />
                <Text style={styles.dadosServidor}>Cargo: {cargoServidor}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <MaterialIcons name="business" size={12} color="#FFCD00" />
                <Text style={styles.dadosServidor}>Lotação: {uorgServidor}</Text>
              </View>

            </View>
          </View>
          <View style={styles.seloVerificacao}>
            <MaterialIcons name="verified" size={14} color="#FFCD00" />
            <Text style={styles.seloTexto}>Perfil {nivelAcesso.toUpperCase()} • Sessão registrada</Text>
          </View>
        </View>

        {/* ALERTA DE NOTÍCIAS */}
        <View style={styles.containerNoticia}>
          <MaterialIcons name="campaign" size={20} color="#B45309" style={{ marginRight: 8 }} />
          <Text style={styles.textoNoticia} numberOfLines={2}>{NOTICIAS_API[indiceNoticia]}</Text>
        </View>

        {/* 💰 WIDGET FINANCEIRO: O ÚLTIMO CONTRACHEQUE */}
        <View style={styles.conteudoSessao}>
          <Text style={styles.tituloSessao}>Resumo Financeiro</Text>
          <View style={styles.cardFinanceiro}>
            <View style={styles.cardFinHeader}>
              <View>
                <Text style={styles.cardFinLabel}>Último Salário Líquido</Text>
                <Text style={styles.cardFinMes}>
                  {carregandoSalario ? 'Buscando...' : (mesSalario ? `Referência: ${mesSalario}` : 'Dados indisponíveis')}
                </Text>
              </View>
              <MaterialIcons name="account-balance-wallet" size={28} color="#FFFFFF" />
            </View>
            <View style={styles.cardFinValorRow}>
              {carregandoSalario ? (
                <ActivityIndicator size="small" color="#F54927" />
              ) : (
                <Text style={styles.cardFinValor}>
                  {salarioVisivel && ultimoSalario !== null ? formatarMoeda(ultimoSalario) : 'R$ •••••••'}
                </Text>
              )}
              <TouchableOpacity onPress={() => setSalarioVisivel(!salarioVisivel)} style={styles.btnVisibilidade}>
                <MaterialIcons name={salarioVisivel ? "visibility" : "visibility-off"} size={22} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MÓDULOS DE SISTEMA */}
        <View style={styles.conteudoSessao}>
          <Text style={styles.tituloSessao}>Módulos Integrados</Text>
          <Text style={styles.subtitSessao}>Acesse os sistemas administrativos abaixo:</Text>
          
          {modulosVisiveis.map((mod) => (
            <TouchableOpacity 
              key={mod.id} 
              style={styles.cardGov} 
              activeOpacity={0.85}
              // 🎒 AQUI ESTÁ A MAGIA: ENVIANDO A MOCHILA COM OS DADOS PARA A NOVA TELA!
              onPress={() => router.push({
                pathname: mod.rota as any,
                params: {
                  nome: params.nome,
                  cargo: params.cargo,
                  uorg: params.uorg,
                  matricula: params.matricula,
                  cpf: params.cpf,
                  nivel_acesso: nivelAcesso
                }
              })}
            >
              <View style={styles.cardIconeContainer}>
                <MaterialIcons name={mod.icone as any} size={22} color="#1351B4" />
              </View>
              <View style={styles.cardTextoContainer}>
                <View style={styles.cardLinhaSuperior}>
                  <Text style={styles.cardTitulo}>{mod.titulo}</Text>
                  <View style={[styles.badgeGov, { backgroundColor: mod.badgeCor }]}>
                    <Text style={styles.badgeTexto}>{mod.badge}</Text>
                  </View>
                </View>
                <Text style={styles.cardSubtitulo}>{mod.subtitulo}</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color="#1351B4" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rodapeGov}>
          <Text style={styles.rodapeTexto}>© 2026 Secretaria de Administração e Gestão Digital</Text>
          <Text style={styles.rodapeSub}>Portal N2 • Dados rastreáveis e serviços integrados</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ 
  safe: { flex: 1, backgroundColor: '#1351B4' }, 
  scroll: { flex: 1, backgroundColor: '#F8F9FA' }, 
  scrollContent: { paddingBottom: 40 }, 
  //HEADER DO SERVIÇOS DIGITAIS
  govBar: { height: 60, backgroundColor: '#1351B4', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }, 
  //HEADER DO SERVIÇOS DIGITAIS
  logoContainer: { flexDirection: 'row', alignItems: 'center' }, 
  govText: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 }, 
  separadorVertical: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: 12 }, 
  subTituloGov: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }, 
  acessibilidadeContainer: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }, 
  contadorNotificacao: { position: 'absolute', top: 2, right: 1, minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3, backgroundColor: '#D32F2F', alignItems: 'center', justifyContent: 'center' },
  contadorNotificacaoTexto: { color: '#FFFFFF', fontSize: 9, fontWeight: '900' },
  //PAINEL INFORMAÇÔIES DO SERVIDOR
  painelUsuario: { backgroundColor: '#0C3789', padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, 
  //
  usuarioHeader: { flexDirection: 'row', alignItems: 'center' }, 
  avatarCirculo: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }, 
  usuarioInfo: { flex: 1, gap: 2 }, 
  nomeServidor: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3, marginBottom: 4 }, 
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 }, 
  dadosServidor: { fontSize: 11, color: 'rgba(255,255,255,0.85)' }, 
  seloVerificacao: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 14, gap: 6 }, 
  seloTexto: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }, 
  containerNoticia: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', marginHorizontal: 16, marginTop: 16, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A' }, 
  textoNoticia: { flex: 1, fontSize: 12, color: '#B45309', fontWeight: '600', lineHeight: 18 }, 
  conteudoSessao: { paddingHorizontal: 16, marginTop: 24 }, 
  tituloSessao: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 }, 
  subtitSessao: { fontSize: 12, color: '#555A60', marginBottom: 16 }, 
  //FINANCEIRO CONTRACHEUQE
  cardFinanceiro: { backgroundColor: '#1351B4', borderRadius: 12, padding: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 }, 
  //FINANCEIRO
  cardFinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }, 
  cardFinLabel: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' }, 
  cardFinMes: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }, 
  cardFinValorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingTop: 12 }, 
  cardFinValor: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' }, 
  btnVisibilidade: { padding: 4 },
  cardGov: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E0E0E0' }, 
  cardIconeContainer: { width: 42, height: 42, borderRadius: 8, backgroundColor: '#F0F4FA', alignItems: 'center', justifyContent: 'center', marginRight: 14 }, 
  cardTextoContainer: { flex: 1 }, 
  cardLinhaSuperior: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }, 
  cardTitulo: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' }, 
  cardSubtitulo: { fontSize: 11, color: '#555A60' }, 
  badgeGov: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }, 
  badgeTexto: { color: '#FFFFFF', fontSize: 9, fontWeight: 'bold' }, 
  rodapeGov: { marginTop: 30, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 }, 
  rodapeTexto: { fontSize: 10, color: '#555A60', textAlign: 'center', fontWeight: '500' }, 
  rodapeSub: { fontSize: 9, color: '#9E9E9E', textAlign: 'center', marginTop: 4 } 
});
