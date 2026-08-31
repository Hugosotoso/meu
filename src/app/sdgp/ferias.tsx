import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Switch,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { CORES_PRIORIDADE, estiloStatus, prioridadeSegura, Prioridade } from '../../lib/workflow';
import PrioritySelector from '../../components/PrioritySelector';

const C = {
  azul: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', fundo: '#F4F6F9',
  texto: '#1F2937', secundario: '#64748B', borda: '#D9DDE8', ouro: '#FFCD00', verde: '#047857', vermelho: '#B91C1C',
};

type Ferias = {
  id: string | number; protocolo?: string | null; data_inicio: string; data_fim: string;
  data_retorno: string; quantidade_dias: number; status: string; prioridade?: string | null;
  justificativa_gestor?: string | null; created_at?: string | null;
};

function calcularPeriodo(inicio: string, dias: number) {
  const [d, m, a] = inicio.split('/').map(Number);
  const data = new Date(a, m - 1, d);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  if (!d || !m || !a || Number.isNaN(data.getTime()) || data.getDate() !== d || data.getMonth() !== m - 1) return { erro: 'Data inválida.', fim: '', retorno: '' };
  if (data < hoje) return { erro: 'Não é possível solicitar férias no passado.', fim: '', retorno: '' };
  const fim = new Date(data); fim.setDate(data.getDate() + dias - 1);
  const retorno = new Date(fim); retorno.setDate(fim.getDate() + 1);
  return { erro: '', fim: fim.toLocaleDateString('pt-BR'), retorno: retorno.toLocaleDateString('pt-BR') };
}

export default function FeriasScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const nome = String(params.nome || 'Servidor');
  const matricula = String(params.matricula || 'N/D');
  const uorg = String(params.uorg || 'Unidade não informada');
  const [dataInicio, setDataInicio] = useState('');
  const [dias, setDias] = useState(15);
  const [isChefia, setIsChefia] = useState(false);
  const [prioridade, setPrioridade] = useState<Prioridade>('NORMAL');
  const [historico, setHistorico] = useState<Ferias[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const info = useMemo(() => calcularPeriodo(dataInicio, dias), [dataInicio, dias]);

  const carregar = async () => {
    setCarregando(true);
    const { data } = await supabase.from('solicitacoes_ferias').select('*').eq('matricula', matricula).order('id', { ascending: false });
    setHistorico((data || []) as Ferias[]); setCarregando(false);
  };

  useEffect(() => { carregar(); }, [matricula]);

  const mascararData = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 8);
    setDataInicio([numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4, 8)].filter(Boolean).join('/'));
  };

  const enviar = async () => {
    if (info.erro || !info.fim) return Alert.alert('Revise o período', info.erro || 'Informe a data inicial.');
    setEnviando(true);
    const { data, error } = await supabase.from('solicitacoes_ferias').insert([{
      matricula, nome_servidor: nome, uorg, data_inicio: dataInicio, data_fim: info.fim,
      data_retorno: info.retorno, quantidade_dias: dias, funcao_chefia: isChefia,
      prioridade, status: 'EM_ANALISE', atualizado_por_matricula: matricula, atualizado_por_nome: nome,
    }]).select('protocolo').single();
    setEnviando(false);
    if (error) return Alert.alert('Erro ao enviar', error.message);
    setDataInicio(''); await carregar();
    Alert.alert('Solicitação protocolada', `Protocolo ${data.protocolo}. A chefia poderá acompanhar e decidir pela Central de Gestão.`);
  };

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} style={styles.voltar}><MaterialIcons name="arrow-back" size={22} color={C.branco} /></TouchableOpacity><View style={{ flex: 1 }}><Text style={styles.marca}>gov<Text style={{ color: C.ouro }}>.</Text>br</Text><Text style={styles.headerTitulo}>Gestão de Férias</Text></View><MaterialIcons name="beach-access" size={27} color={C.ouro} /></View>
    <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
      <View style={styles.saldo}><View><Text style={styles.saldoLabel}>SALDO DISPONÍVEL</Text><Text style={styles.saldoValor}>15 <Text style={styles.saldoUnidade}>dias</Text></Text><Text style={styles.saldoMeta}>Exercício 2026 • sujeito à homologação</Text></View><View style={styles.saldoIcone}><MaterialIcons name="event-available" size={29} color={C.azulEscuro} /></View></View>
      <View style={styles.card}><Text style={styles.cardTitulo}>Nova programação</Text><Text style={styles.label}>Data de início</Text><TextInput style={[styles.input, Boolean(dataInicio && info.erro) && styles.inputErro]} placeholder="DD/MM/AAAA" placeholderTextColor="#9EA3B0" keyboardType="number-pad" maxLength={10} value={dataInicio} onChangeText={mascararData} />
        {dataInicio && info.erro ? <Text style={styles.erro}>{info.erro}</Text> : null}<Text style={styles.label}>Quantidade de dias</Text><View style={styles.diasLinha}>{[10, 15, 20].map((valor) => <TouchableOpacity key={valor} onPress={() => setDias(valor)} style={[styles.dia, dias === valor && styles.diaAtivo]}><Text style={[styles.diaTexto, dias === valor && styles.diaTextoAtivo]}>{valor} dias</Text></TouchableOpacity>)}</View>
        <Text style={styles.label}>Prioridade administrativa</Text><PrioritySelector value={prioridade} onChange={setPrioridade} compact />
        {info.fim ? <View style={styles.resumo}><View style={styles.resumoLinha}><Text style={styles.resumoLabel}>Último dia</Text><Text style={styles.resumoValor}>{info.fim}</Text></View><View style={styles.resumoLinha}><Text style={styles.resumoLabel}>Retorno previsto</Text><Text style={[styles.resumoValor, { color: C.verde }]}>{info.retorno}</Text></View></View> : null}
        <View style={styles.switchLinha}><View style={{ flex: 1 }}><Text style={styles.switchTitulo}>Exerce função de chefia</Text><Text style={styles.switchSub}>Ativa validação de substituição temporária</Text></View><Switch value={isChefia} onValueChange={setIsChefia} trackColor={{ true: C.azul }} /></View>
        <View style={styles.legal}><MaterialIcons name="gavel" size={17} color={C.azul} /><Text style={styles.legalTexto}>Solicitação sujeita à conveniência administrativa e concordância da chefia, conforme legislação aplicável.</Text></View>
        <TouchableOpacity style={styles.enviar} onPress={enviar} disabled={enviando}>{enviando ? <ActivityIndicator color={C.branco} /> : <><MaterialIcons name="send" size={18} color={C.branco} /><Text style={styles.enviarTexto}>Assinar e enviar</Text></>}</TouchableOpacity>
      </View>
      <Text style={styles.secaoTitulo}>Minhas solicitações</Text>
      {carregando ? <ActivityIndicator color={C.azul} /> : historico.length === 0 ? <View style={styles.vazio}><MaterialIcons name="inbox" size={36} color={C.borda} /><Text style={styles.vazioTexto}>Nenhuma solicitação registrada.</Text></View> : historico.map((item) => {
        const status = estiloStatus(item.status); const pri = CORES_PRIORIDADE[prioridadeSegura(item.prioridade)];
        return <View key={String(item.id)} style={styles.historico}><View style={styles.historicoTopo}><Text style={styles.protocolo}>{item.protocolo || `FER-${item.id}`}</Text><View style={[styles.tag, { backgroundColor: status.fundo }]}><Text style={[styles.tagTexto, { color: status.texto }]}>{status.label}</Text></View></View><Text style={styles.periodo}>{item.data_inicio} a {item.data_fim}</Text><View style={styles.historicoRodape}><Text style={styles.historicoMeta}>{item.quantidade_dias} dias • retorno {item.data_retorno}</Text><View style={[styles.tag, { backgroundColor: pri.fundo }]}><Text style={[styles.tagTexto, { color: pri.texto }]}>{pri.label}</Text></View></View>{item.justificativa_gestor ? <Text style={styles.despacho}>Despacho: {item.justificativa_gestor}</Text> : null}</View>;
      })}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.fundo},header:{backgroundColor:C.azul,minHeight:70,paddingHorizontal:16,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:12},voltar:{width:38,height:38,borderRadius:12,backgroundColor:'#FFFFFF18',alignItems:'center',justifyContent:'center'},marca:{color:C.branco,fontSize:11,fontWeight:'900'},headerTitulo:{color:C.branco,fontSize:19,fontWeight:'800'},conteudo:{padding:16,paddingBottom:50},
  saldo:{backgroundColor:C.azulEscuro,borderRadius:18,padding:20,marginBottom:13,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},saldoLabel:{color:C.ouro,fontSize:9,fontWeight:'900',letterSpacing:1},saldoValor:{color:C.branco,fontSize:37,fontWeight:'900',marginTop:3},saldoUnidade:{fontSize:17},saldoMeta:{color:'#FFFFFFB8',fontSize:10},saldoIcone:{width:56,height:56,borderRadius:28,backgroundColor:C.ouro,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:C.branco,borderRadius:16,borderWidth:1,borderColor:'#E5E7EB',padding:17,marginBottom:22},cardTitulo:{color:C.texto,fontSize:17,fontWeight:'900',marginBottom:16},label:{color:C.texto,fontSize:11,fontWeight:'800',marginBottom:7,marginTop:3},input:{height:48,borderWidth:1,borderColor:C.borda,borderRadius:10,paddingHorizontal:12,color:C.texto,fontSize:14,marginBottom:14},inputErro:{borderColor:C.vermelho},erro:{color:C.vermelho,fontSize:10,marginTop:-10,marginBottom:12},diasLinha:{flexDirection:'row',gap:8,marginBottom:16},dia:{flex:1,alignItems:'center',paddingVertical:10,borderWidth:1,borderColor:C.borda,borderRadius:18},diaAtivo:{backgroundColor:C.azul,borderColor:C.azul},diaTexto:{color:C.secundario,fontSize:11,fontWeight:'700'},diaTextoAtivo:{color:C.branco},
  resumo:{backgroundColor:'#EFF6FF',borderRadius:12,padding:13,marginTop:15},resumoLinha:{flexDirection:'row',justifyContent:'space-between',marginVertical:3},resumoLabel:{color:C.secundario,fontSize:11},resumoValor:{color:C.azulEscuro,fontSize:11,fontWeight:'900'},switchLinha:{flexDirection:'row',alignItems:'center',marginTop:15},switchTitulo:{color:C.texto,fontSize:12,fontWeight:'800'},switchSub:{color:C.secundario,fontSize:9,marginTop:2},legal:{flexDirection:'row',alignItems:'flex-start',gap:8,backgroundColor:C.fundo,borderRadius:10,padding:11,marginTop:14},legalTexto:{flex:1,color:C.secundario,fontSize:9,lineHeight:14},enviar:{minHeight:50,borderRadius:12,backgroundColor:C.azul,flexDirection:'row',gap:8,alignItems:'center',justifyContent:'center',marginTop:16},enviarTexto:{color:C.branco,fontSize:13,fontWeight:'900'},
  secaoTitulo:{color:C.texto,fontSize:16,fontWeight:'900',marginBottom:10},vazio:{alignItems:'center',backgroundColor:C.branco,borderWidth:1,borderStyle:'dashed',borderColor:C.borda,borderRadius:14,padding:28},vazioTexto:{color:C.secundario,fontSize:11,marginTop:8},historico:{backgroundColor:C.branco,borderRadius:14,borderWidth:1,borderColor:'#E5E7EB',padding:14,marginBottom:10},historicoTopo:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},protocolo:{color:C.azul,fontSize:10,fontWeight:'900'},tag:{paddingHorizontal:8,paddingVertical:4,borderRadius:10},tagTexto:{fontSize:9,fontWeight:'900'},periodo:{color:C.texto,fontSize:14,fontWeight:'800',marginTop:9},historicoRodape:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:6},historicoMeta:{color:C.secundario,fontSize:10},despacho:{color:C.azulEscuro,fontSize:10,lineHeight:15,backgroundColor:'#EFF6FF',borderRadius:8,padding:9,marginTop:9},
});
