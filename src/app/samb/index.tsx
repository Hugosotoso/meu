import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const C = { azul: '#1351B4', azulEscuro: '#0C3789', verde: '#10b981', branco: '#FFFFFF', fundo: '#F2F5F8', cinzaMedio: '#9EA3B0', cinzaBorda: '#D9DDE8' };

export default function SAMB() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.voltarBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.branco} />
        </TouchableOpacity>
        <View style={styles.headerTitulos}>
          <Text style={styles.headerTitulo}>Sistema de Arrecadação</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.padding}>
        <View style={styles.resumoCard}>
          <Text style={styles.resumoLabel}>Arrecadação do Dia</Text>
          <Text style={styles.resumoValor}>R$ 45.230,00</Text>
          <View style={styles.tagWrap}><MaterialIcons name="trending-up" size={14} color={C.verde} /><Text style={styles.tagText}>+12% que ontem</Text></View>
        </View>

        <Text style={styles.secaoTitulo}>Ações de Arrecadação</Text>
        <View style={styles.grid}>
          <TouchableOpacity style={styles.gridItem}>
            <MaterialIcons name="receipt-long" size={32} color={C.azul} />
            <Text style={styles.gridText}>Emitir Guias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <MaterialIcons name="account-balance-wallet" size={32} color={C.azul} />
            <Text style={styles.gridText}>Baixa de Pagamento</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <MaterialIcons name="pie-chart" size={32} color={C.azul} />
            <Text style={styles.gridText}>Relatórios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <MaterialIcons name="search" size={32} color={C.azul} />
            <Text style={styles.gridText}>Consultar CPF/CNPJ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo }, scroll: { flex: 1 }, padding: { padding: 20 },
  header: { backgroundColor: C.azul, flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'android' ? 16 : 8, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  voltarBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitulos: { flex: 1, alignItems: 'center' }, headerTitulo: { fontSize: 18, fontWeight: '800', color: C.branco },
  resumoCard: { backgroundColor: C.azulEscuro, padding: 20, borderRadius: 16, marginBottom: 24 },
  resumoLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 4 },
  resumoValor: { color: C.branco, fontSize: 32, fontWeight: 'bold', marginBottom: 10 },
  tagWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  tagText: { color: C.verde, fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  secaoTitulo: { fontSize: 16, fontWeight: 'bold', color: C.azulEscuro, marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  gridItem: { width: '48%', backgroundColor: C.branco, padding: 20, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: C.cinzaBorda },
  gridText: { marginTop: 10, fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' }
});