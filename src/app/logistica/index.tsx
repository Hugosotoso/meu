/**
 * Super App Gov — Módulo Logística e Frota
 * Ficheiro: src/app/logistica/index.tsx
 */

import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

const G_COLORS = { azulPrincipal: '#1351B4', azulEscuro: '#0C3789', branco: '#FFFFFF', cinzaFundo: '#F0F2F5', textoPreto: '#1A1A1A', cinzaTexto: '#555A60', ouro: '#FFCD00', cinzaBorda: '#E0E0E0', verde: '#10b981' };

export default function LogisticaHome() {
  const router = useRouter();
  
  // 🎒 ABRINDO A MOCHILA DE DADOS (Parâmetros vindos do Index Principal)
  const { nome, cargo, uorg, matricula, cpf } = useLocalSearchParams<{ nome: string; cargo: string; uorg: string; matricula: string; cpf: string }>();

  const ServiceCard = ({ icon, title, subtitle, onPress, color = G_COLORS.azulPrincipal }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={G_COLORS.cinzaTexto} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={G_COLORS.azulPrincipal} />
      
      {/* HEADER PADRÃO GOV */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={G_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Logística e Frota</Text>
        <MaterialIcons name="local-shipping" size={26} color={G_COLORS.branco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* 🪪 PERFIL DO SOLICITANTE */}
        <View style={styles.perfilCard}>
          <Text style={styles.olaText}>{nome || 'Servidor Público'}</Text>
          <Text style={styles.subText}>{cargo || 'Cargo não especificado'}</Text>
          <View style={{ flexDirection: 'row', gap: 15, marginTop: 4 }}>
            <Text style={styles.matriculaText}>Matrícula: {matricula || 'N/D'}</Text>
            <Text style={styles.matriculaText}>CPF: {cpf || 'N/D'}</Text>
          </View>
          
          <View style={styles.uorgBadge}>
            <MaterialIcons name="business" size={14} color={G_COLORS.branco} />
            <Text style={styles.uorgText}>{uorg || 'Unidade de Lotação não especificada'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Módulos Operacionais</Text>
        
        {/* 📦 SERVIÇOS DE LOGÍSTICA */}
        <View style={styles.serviceGroup}>
         <ServiceCard 
            icon="directions-car" 
            title="Gestão de Frota" 
            subtitle="Solicitação de veículos, roteiros e manutenções" 
            color="#00BCD4" 
            onPress={() => router.push({
              pathname: '/logistica/frota',
              params: { nome, cargo, uorg, matricula, cpf }
            })} 
          />
          <ServiceCard 
            icon="inventory" 
            title="Almoxarifado" 
            subtitle="Requisição de materiais de consumo e suprimentos" 
            color="#FF9800" 
            onPress={() => router.push({
              pathname: '/logistica/almoxarifado',
              params: { nome, cargo, uorg, matricula, cpf }
            })} 
          />
          <ServiceCard 
            icon="domain" 
            title="Patrimônio" 
            subtitle="Controle de bens, cautelas e transferências" 
            color="#9C27B0" 
           onPress={() => router.push({
              pathname: '/logistica/patrimonio',
              params: { nome, cargo, uorg, matricula, cpf }
            })} 
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: G_COLORS.cinzaFundo },
  header: { backgroundColor: G_COLORS.azulPrincipal, height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, elevation: 4 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: G_COLORS.branco, letterSpacing: 0.5 },
  scrollContent: { padding: 15, paddingBottom: 30 },
  
  perfilCard: { backgroundColor: G_COLORS.azulPrincipal, padding: 20, borderRadius: 12, elevation: 3, marginBottom: 5 },
  olaText: { fontSize: 20, fontWeight: '800', color: G_COLORS.branco },
  subText: { fontSize: 14, color: '#FFFFFFCC', marginTop: 3 },
  matriculaText: { fontSize: 13, color: G_COLORS.ouro, fontWeight: 'bold' },
  uorgBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF20', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 15, alignSelf: 'flex-start', marginTop: 12 },
  uorgText: { color: G_COLORS.branco, fontSize: 12, marginLeft: 5, fontWeight: '600' },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: G_COLORS.azulEscuro, marginTop: 25, marginBottom: 12, marginLeft: 5 },
  
  serviceGroup: { backgroundColor: G_COLORS.branco, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, elevation: 2, overflow: 'hidden' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: G_COLORS.cinzaFundo },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  cardTextContainer: { flex: 1, marginLeft: 16 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: G_COLORS.textoPreto, marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: G_COLORS.cinzaTexto }
});