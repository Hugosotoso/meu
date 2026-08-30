/**
 * Super App Gov — Módulo Gestão de Férias (Versão Blindada e Otimizada)
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const GOV_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F0F2F5', textoPreto: '#1A1A1A', cinzaTexto: '#64748B', verde: '#059669', vermelho: '#DC2626', cinzaBorda: '#E2E8F0', azulClaro: '#EFF6FF', ouro: '#FFCD00' };

export default function FeriasScreen() {
  const router = useRouter();
  const [dataInicio, setDataInicio] = useState('');
  const [dias, setDias] = useState(15);
  const [isChefia, setIsChefia] = useState(false);

  // 🧠 Lógica de Máscara de Data
  const handleDataChange = (texto: string) => {
    let f = texto.replace(/\D/g, '');
    if (f.length > 2) f = f.replace(/^(\d{2})/, '$1/');
    if (f.length > 5) f = f.replace(/^(\d{2})\/(\d{2})/, '$1/$2/');
    setDataInicio(f.substring(0, 10));
  };

  // 🛡️ Lógica Blindada com useMemo para evitar erro #301
  const info = useMemo(() => {
    if (dataInicio.length !== 10) return { erro: null, fim: '', retorno: '' };
    
    const [d, m, a] = dataInicio.split('/').map(Number);
    const dataObj = new Date(a, m - 1, d);
    const hoje = new Date(); hoje.setHours(0,0,0,0);

    if (isNaN(dataObj.getTime())) return { erro: "Data inválida.", fim: '', retorno: '' };
    if (dataObj < hoje) return { erro: "Não é possível agendar no passado.", fim: '', retorno: '' };
    if (a !== 2026) return { erro: "Apenas agendamentos para 2026.", fim: '', retorno: '' };

    const dataFim = new Date(dataObj); dataFim.setDate(dataObj.getDate() + (dias - 1));
    const retorno = new Date(dataFim); retorno.setDate(dataFim.getDate() + 1);
    
    return { 
      erro: null, 
      fim: dataFim.toLocaleDateString('pt-BR'), 
      retorno: retorno.toLocaleDateString('pt-BR') 
    };
  }, [dataInicio, dias]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={GOV_COLORS.branco} /></TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão de Férias</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cardSaldo}>
          <Text style={styles.saldoText}>Saldo Disponível</Text>
          <Text style={styles.saldoDias}>15 <Text style={{fontSize: 20}}>dias</Text></Text>
          <View style={styles.progressBar}><View style={styles.progressFill} /></View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>Data de Início (DD/MM/AAAA)</Text>
          <TextInput 
            style={[styles.input, info.erro && {borderColor: GOV_COLORS.vermelho}]} 
            placeholder="Ex: 15/08/2026" 
            keyboardType="number-pad" 
            maxLength={10}
            value={dataInicio}
            onChangeText={handleDataChange}
          />
          {info.erro && <Text style={styles.txtErro}>{info.erro}</Text>}

          <Text style={styles.label}>Quantidade de Dias</Text>
          <View style={styles.row}>
            {[10, 15, 20].map((d) => (
              <TouchableOpacity key={d} onPress={() => setDias(d)} style={[styles.pill, dias === d && styles.pillActive]}>
                <Text style={[styles.pillText, dias === d && styles.pillTextActive]}>{d}d</Text>
              </TouchableOpacity>
            ))}
          </View>

          {info.retorno ? (
            <View style={styles.cardLegal}>
              <View style={styles.linhaResumo}>
                <Text style={styles.resumoTxt}>Retorno previsto:</Text>
                <Text style={{fontWeight: 'bold', color: GOV_COLORS.verde}}>{info.retorno}</Text>
              </View>
              
              <View style={styles.divisor} />
              
              <View style={{flexDirection: 'row', alignItems: 'flex-start', gap: 8}}>
                <MaterialIcons name="gavel" size={16} color={GOV_COLORS.azulEscuro} style={{marginTop: 2}} />
                <Text style={styles.textoLei}>
                  <Text style={{fontWeight: 'bold'}}>Base Legal:</Text> Art. 77 da Lei 8.112/90. As férias deverão ser gozadas em até 03 períodos, desde que haja concordância da chefia e interesse da administração.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.labelSwitch}>Função de Chefia</Text>
            <Switch value={isChefia} onValueChange={setIsChefia} trackColor={{true: GOV_COLORS.azulPrincipal}} />
          </View>
        </View>

        <TouchableOpacity style={styles.btnSubmit} onPress={() => Alert.alert("Sucesso", "Solicitação enviada!")}>
          <Text style={styles.btnText}>Assinar e Enviar Solicitação</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { backgroundColor: GOV_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  headerTitle: { color: GOV_COLORS.branco, fontWeight: '700', fontSize: 18 },
  scroll: { padding: 20 },
  cardSaldo: { backgroundColor: GOV_COLORS.azulEscuro, padding: 25, borderRadius: 20, marginBottom: 20, elevation: 5 },
  saldoText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  saldoDias: { color: GOV_COLORS.branco, fontSize: 40, fontWeight: '800' },
  progressBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginTop: 15 },
  progressFill: { height: '100%', width: '50%', backgroundColor: GOV_COLORS.ouro, borderRadius: 3 },
  formCard: { backgroundColor: GOV_COLORS.branco, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda },
  label: { fontSize: 13, fontWeight: '600', color: GOV_COLORS.cinzaTexto, marginBottom: 8 },
  input: { backgroundColor: GOV_COLORS.cinzaFundo, borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 20, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda },
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pill: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda },
  pillActive: { backgroundColor: GOV_COLORS.azulPrincipal, borderColor: GOV_COLORS.azulPrincipal },
  pillText: { color: GOV_COLORS.cinzaTexto, fontWeight: '600' },
  pillTextActive: { color: GOV_COLORS.branco },
  resumoDatas: { backgroundColor: GOV_COLORS.azulClaro, padding: 15, borderRadius: 12, marginBottom: 20 },
  resumoTxt: { color: GOV_COLORS.azulPrincipal, fontSize: 14 },
  cardLegal: { backgroundColor: GOV_COLORS.azulClaro, padding: 15, borderRadius: 12, marginBottom: 20 },
  linhaResumo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divisor: { height: 1, backgroundColor: GOV_COLORS.cinzaBorda, marginVertical: 12 },
  textoLei: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 12, lineHeight: 18 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  labelSwitch: { fontSize: 14, fontWeight: '600' },
  txtErro: { color: GOV_COLORS.vermelho, fontSize: 12, marginTop: -15, marginBottom: 15 },
  btnSubmit: { backgroundColor: GOV_COLORS.verde, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 2 },
  btnText: { color: GOV_COLORS.branco, fontWeight: '700', fontSize: 16 }
});
