/**
 * Super App Gov — Logística / Gestão de Frota (MAPA, TECLADO RESPONSIVO E HISTÓRICO)
 * Ficheiro: src/app/logistica/frota.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../context/SessionContext';
import { isDemoCpf } from '../../lib/demoData';

// 🛡️ IMPORTAÇÃO DINÂMICA DO MAPA
let MapView: any = null;
let Marker: any = null;

if (Platform.OS !== 'web') {
  try {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Marker = Maps.Marker;
  } catch (e) {
    console.log("react-native-maps não suportado neste ambiente.");
  }
}

const G_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F0F2F5', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', ouro: '#FFCD00', cinzaBorda: '#E0E0E0', verde: '#10b981', laranja: '#F59E0B', vermelho: '#EF4444' };

export default function FrotaScreen() {
  const router = useRouter();
  const { servidor } = useSession();
  const { nome, matricula, uorg, cpf } = servidor || {};

  // Estados do formulário
  const [destino, setDestino] = useState('');
  const [dataIda, setDataIda] = useState('');
  const [motivo, setMotivo] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados do Mapa e Histórico
  const [localizacao, setLocalizacao] = useState<any>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);

  // 📡 INICIA O GPS E BUSCA O HISTÓRICO
  useEffect(() => {
    buscarHistorico(); // Puxa as pendências assim que abre a tela

    if (Platform.OS === 'web') return; 

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({});
          setLocalizacao({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.015,
            longitudeDelta: 0.015,
          });
        }
      } catch (error) {
        console.log("Erro ao buscar GPS:", error);
      }
    })();
  }, [cpf, matricula]);

  // 🔍 BUSCA AS PENDÊNCIAS GRAVADAS NO SUPABASE
  const buscarHistorico = async () => {
    setCarregandoHistorico(true);
    if (isDemoCpf(cpf)) {
      setCarregandoHistorico(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('solicitacoes_frota')
        .select('*')
        .eq('matricula', String(matricula))
        .order('id', { ascending: false }); // Traz os mais novos primeiro

      if (error) throw error;
      if (data) setHistorico(data);
    } catch (error) {
      console.log("Erro ao buscar histórico:", error);
    } finally {
      setCarregandoHistorico(false);
    }
  };

  // ☁️ ENVIA PARA O SUPABASE
  const handleSolicitar = async () => {
    if (!destino || !dataIda || !motivo) {
      Alert.alert('Atenção', 'Preencha todos os campos para solicitar um veículo.');
      return;
    }

    setCarregando(true);

    if (isDemoCpf(cpf)) {
      setHistorico((atual) => [{ id: `DEMO-${Date.now()}`, destino, data_ida: dataIda, motivo, status: 'Simulado' }, ...atual]);
      setDestino('');
      setDataIda('');
      setMotivo('');
      setCarregando(false);
      Alert.alert('Demonstração', 'Solicitação simulada. Nenhum dado foi enviado.');
      return;
    }

    try {
      const { error } = await supabase.from('solicitacoes_frota').insert([
        {
          matricula: matricula || 'N/D',
          nome_servidor: nome || 'Servidor',
          destino: destino,
          data_ida: dataIda,
          motivo: motivo,
          status: 'Em Análise',
          lat_partida: localizacao?.latitude || null,
          lng_partida: localizacao?.longitude || null
        }
      ]);

      if (error) throw error;

      Alert.alert('Sucesso!', 'Veículo solicitado com sucesso.');
      setDestino(''); setDataIda(''); setMotivo('');
      
      // Atualiza a lista de pendências na hora!
      buscarHistorico(); 

    } catch (error: any) {
      console.error('Erro ao salvar no Supabase:', error);
      Alert.alert('Aviso', 'Erro ao conectar com a nuvem.');
    } finally {
      setCarregando(false);
    }
  };

  // 🎨 Função para dar cor à tag de status
  const getCorStatus = (status: string) => {
    if (status === 'Aprovado') return G_COLORS.verde;
    if (status === 'Rejeitado') return G_COLORS.vermelho;
    return G_COLORS.laranja; // Em Análise
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 5 }}>
          <MaterialIcons name="arrow-back" size={24} color={G_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gestão de Frota</Text>
        <View style={{ width: 34 }} />
      </View>

      {/* 🛡️ KEYBOARD AVOIDING VIEW PARA O TECLADO NÃO COBRIR O FORMULÁRIO */}
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          style={{ flex: 1, padding: 16 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" // Permite clicar no botão mesmo com teclado aberto
        >
          
          {/* IDENTIFICAÇÃO DO SOLICITANTE */}
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Solicitante Vinculado</Text>
            <Text style={styles.infoValor}>{nome || 'Servidor Público'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <MaterialIcons name="badge" size={14} color={G_COLORS.cinzaTexto} />
              <Text style={styles.infoSub}> {matricula || 'N/D'}   •   </Text>
              <MaterialIcons name="business" size={14} color={G_COLORS.cinzaTexto} />
              <Text style={styles.infoSub}> {uorg || 'N/D'}</Text>
            </View>
          </View>

          {/* 🗺️ MAPA AO VIVO DO GOOGLE/APPLE MAPS */}
          <Text style={styles.sectionTitle}>Ponto de Embarque (GPS)</Text>
          <View style={styles.mapContainer}>
            {Platform.OS !== 'web' && MapView && localizacao ? (
              <MapView style={styles.mapa} initialRegion={localizacao} showsUserLocation={true}>
                <Marker coordinate={localizacao} title="Sua Localização Atual" pinColor={G_COLORS.azulPrincipal} />
              </MapView>
            ) : (
              <View style={styles.loadingMap}>
                <MaterialIcons name={Platform.OS === 'web' ? "desktop-windows" : "satellite"} size={40} color={G_COLORS.azulPrincipal} />
                <Text style={{ marginTop: 10, color: G_COLORS.cinzaTexto, textAlign: 'center', fontSize: 12 }}>
                  {Platform.OS === 'web' ? 'O mapa 3D está disponível\napenas no App móvel.' : 'Buscando satélites GPS...'}
                </Text>
              </View>
            )}
          </View>

          {/* FORMULÁRIO DE SOLICITAÇÃO (VISUAL MELHORADO) */}
          <Text style={styles.sectionTitle}>Nova Solicitação</Text>
          <View style={styles.formCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Destino da Viagem</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="place" size={20} color={G_COLORS.azulPrincipal} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Ex: Cruzeiro do Sul - AC" placeholderTextColor="#A0A0A0" value={destino} onChangeText={setDestino} />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Data da Ida</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="event" size={20} color={G_COLORS.azulPrincipal} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="DD/MM/AAAA" placeholderTextColor="#A0A0A0" value={dataIda} onChangeText={setDataIda} keyboardType="numbers-and-punctuation" />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Motivo / Justificativa</Text>
              <View style={styles.inputContainer}>
                <MaterialIcons name="edit-note" size={20} color={G_COLORS.azulPrincipal} style={styles.inputIcon} />
                <TextInput style={styles.input} placeholder="Qual a finalidade da demonstração?" placeholderTextColor="#A0A0A0" value={motivo} onChangeText={setMotivo} />
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrincipal} onPress={handleSolicitar} disabled={carregando}>
              {carregando ? (
                <ActivityIndicator size="small" color={G_COLORS.branco} />
              ) : (
                <>
                  <MaterialCommunityIcons name="car-connected" size={22} color={G_COLORS.branco} />
                  <Text style={styles.textoBtnPrincipal}>Confirmar Pedido de Frota</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* 📋 ACOMPANHAMENTO DE PENDÊNCIAS (PUXANDO DO BANCO) */}
          <Text style={styles.sectionTitle}>Meus Pedidos Recentes</Text>
          <View style={{ marginBottom: 40 }}>
            {carregandoHistorico ? (
              <ActivityIndicator size="large" color={G_COLORS.azulPrincipal} style={{ marginTop: 20 }} />
            ) : historico.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialIcons name="inbox" size={40} color={G_COLORS.cinzaBorda} />
                <Text style={styles.emptyText}>Nenhuma solicitação encontrada.</Text>
              </View>
            ) : (
              historico.map((item, index) => (
                <View key={index} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyDestino} numberOfLines={1}>{item.destino}</Text>
                    <View style={[styles.badge, { backgroundColor: getCorStatus(item.status) + '15' }]}>
                      <Text style={[styles.badgeText, { color: getCorStatus(item.status) }]}>{item.status}</Text>
                    </View>
                  </View>
                  <View style={styles.historyRow}>
                    <MaterialIcons name="calendar-today" size={14} color={G_COLORS.cinzaTexto} />
                    <Text style={styles.historyData}>Data: {item.data_ida}</Text>
                  </View>
                  <View style={styles.historyRow}>
                    <MaterialIcons name="info-outline" size={14} color={G_COLORS.cinzaTexto} />
                    <Text style={styles.historyData} numberOfLines={1}>Motivo: {item.motivo}</Text>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G_COLORS.cinzaFundo },
  header: { backgroundColor: G_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, elevation: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: G_COLORS.branco },
  
  infoBox: { backgroundColor: G_COLORS.branco, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, marginBottom: 20, elevation: 1 },
  infoLabel: { fontSize: 10, color: G_COLORS.azulPrincipal, textTransform: 'uppercase', fontWeight: '800', letterSpacing: 0.5 },
  infoValor: { fontSize: 18, fontWeight: '900', color: G_COLORS.textoPreto, marginTop: 4 },
  infoSub: { fontSize: 13, color: G_COLORS.cinzaTexto, fontWeight: '500' },
  
  sectionTitle: { fontSize: 16, fontWeight: '800', color: G_COLORS.azulEscuro, marginBottom: 12, marginLeft: 4 },
  
  mapContainer: { height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 25, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, backgroundColor: G_COLORS.branco, elevation: 2 },
  mapa: { width: '100%', height: '100%' },
  loadingMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: G_COLORS.branco, padding: 20 },

  formCard: { backgroundColor: G_COLORS.branco, padding: 18, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, marginBottom: 30, elevation: 2 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: G_COLORS.textoPreto, marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10, backgroundColor: '#F9FAFB' },
  inputIcon: { paddingHorizontal: 14 },
  input: { flex: 1, height: 48, fontSize: 15, color: G_COLORS.textoPreto, fontWeight: '500' },
  btnPrincipal: { flexDirection: 'row', backgroundColor: G_COLORS.azulPrincipal, height: 52, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 10, elevation: 3 },
  textoBtnPrincipal: { color: G_COLORS.branco, fontSize: 16, fontWeight: 'bold' },

  historyCard: { backgroundColor: G_COLORS.branco, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, marginBottom: 12, elevation: 1 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyDestino: { fontSize: 15, fontWeight: 'bold', color: G_COLORS.textoPreto, flex: 1, marginRight: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  historyData: { fontSize: 13, color: G_COLORS.cinzaTexto, fontWeight: '500' },
  
  emptyState: { alignItems: 'center', padding: 30, backgroundColor: G_COLORS.branco, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, borderStyle: 'dashed' },
  emptyText: { marginTop: 10, color: G_COLORS.cinzaTexto, fontSize: 14, fontWeight: '500' }
});
