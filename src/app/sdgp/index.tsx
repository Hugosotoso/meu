/**
 * Super App Gov — Módulo SDGP (Recursos Humanos)
 * Ficheiro: src/app/sdgp/index.tsx
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';


const G_COLORS = { 
  azulPrincipal: '#1351B4', 
  azulEscuro: '#0C3789', 
  branco: '#FFFFFF', 
  cinzaFundo: '#F0F2F5', 
  textoPreto: '#1A1A1A', 
  cinzaTexto: '#555A60', 
  ouro: '#FFCD00', 
  cinzaBorda: '#E0E0E0', 
  verde: '#10b981' 
};

export default function SdgpHome() {
  const router = useRouter();
  const { nome, cargo, uorg, matricula, cpf } = useLocalSearchParams<{ nome: string; cargo: string; uorg: string; matricula: string; cpf: string }>();

  const [salarioVisivel, setSalarioVisivel] = useState(false);
  const [ultimoContracheque, setUltimoContracheque] = useState<any>(null);
  const [carregandoCc, setCarregandoCc] = useState(true);

  useEffect(() => {
    const buscarResumoFinanceiro = async () => {
      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setUltimoContracheque(data[0]);
        }
      } catch (error) {
        console.error("Erro ao buscar resumo no Supabase:", error);
      } finally {
        setCarregandoCc(false);
      }
    };

    if (matricula) buscarResumoFinanceiro();
    else setCarregandoCc(false);
  }, [matricula]);

  const formatarMoeda = (valor: number) => `R$ ${Number(valor || 0).toFixed(2).replace('.', ',')}`;

  const ServiceCard = ({ icon, title, subtitle, onPress, isExternal = false, color = G_COLORS.azulPrincipal }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.iconContainer, { backgroundColor: color + '10' }]}>
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      </View>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle && <Text style={styles.cardSubtitle}>{subtitle}</Text>}
      </View>
      <MaterialIcons name={isExternal ? "open-in-new" : "chevron-right"} size={22} color={G_COLORS.cinzaTexto} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={G_COLORS.azulPrincipal} />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color={G_COLORS.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SDGP Digital</Text>
        <MaterialIcons name="account-circle" size={30} color={G_COLORS.branco} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.perfilCard}>
          <Text style={styles.olaText}>{nome || 'Servidor Público'}</Text>
          <Text style={styles.subText}>{cargo || 'Cargo não especificado'}</Text>
          <Text style={styles.matriculaText}>Matrícula: {matricula || 'Não informada'}</Text>
          
          <View style={styles.uorgBadge}>
            <MaterialIcons name="business" size={14} color={G_COLORS.branco} />
            <Text style={styles.uorgText}>{uorg || 'Unidade não especificada'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Financeiro</Text>
        <View style={styles.contrachequeCard}>
          <View style={styles.contrachequeHeader}>
            <View>
              <Text style={styles.ccMes}>Último Contracheque</Text>
              <Text style={styles.ccData}>{carregandoCc ? 'Carregando...' : (ultimoContracheque?.mes_referencia || 'Indisponível')}</Text>
            </View>
            <MaterialCommunityIcons name="finance" size={32} color={G_COLORS.verde} />
          </View>
          
          <View style={styles.ccDivider} />
          
          <View style={styles.ccInfoRow}>
            <Text style={styles.ccLabel}>Rendimento Líquido:</Text>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {carregandoCc ? (
                <ActivityIndicator size="small" color={G_COLORS.verde} />
              ) : (
                <Text style={styles.ccValor}>
                  {salarioVisivel && ultimoContracheque ? formatarMoeda(ultimoContracheque.liquido) : 'R$ •••••••'}
                </Text>
              )}
              <TouchableOpacity onPress={() => setSalarioVisivel(!salarioVisivel)} style={{marginLeft: 8}}>
                <MaterialIcons name={salarioVisivel ? "visibility" : "visibility-off"} size={20} color={G_COLORS.cinzaTexto} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.ccBotaoRow}>
            <TouchableOpacity 
              style={styles.btnCcPrincipal}
              onPress={() => router.push({ pathname: '/sdgp/contracheque', params: { nome, cargo, uorg, matricula, cpf } })}
            >
              <MaterialCommunityIcons name="file-pdf-box" size={20} color={G_COLORS.branco} />
              <Text style={styles.btnCcTexto}>Visualizar Detalhes</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Gestão e Vida Funcional</Text>
        <View style={styles.serviceGroup}>
          <ServiceCard icon="folder-account" title="Assentamento Funcional Digital" subtitle="Dossiê, portarias e documentos" color="#FF9800" onPress={() => router.push('/sdgp/afd')} />
          <ServiceCard icon="palm-tree" title="Férias e Recessos" subtitle="Programar, alterar ou consultar" color="#00BCD4" onPress={() => router.push({ pathname: '/sdgp/ferias', params: { nome, matricula } })} />
          <ServiceCard icon="calculator-variant" title="Simular Aposentadoria" subtitle="Tempo de contribuição e regras" color="#9C27B0" onPress={() => router.push({ pathname: '/sdgp/aposentadoria', params: { nome, matricula } })} />
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
  sectionTitle: { fontSize: 16, fontWeight: '700', color: G_COLORS.azulEscuro, marginTop: 25, marginBottom: 12, marginLeft: 5 }, 
  perfilCard: { backgroundColor: G_COLORS.azulPrincipal, padding: 20, borderRadius: 12, elevation: 3, marginBottom: 5 }, 
  olaText: { fontSize: 22, fontWeight: '800', color: G_COLORS.branco }, 
  subText: { fontSize: 14, color: '#FFFFFFCC', marginTop: 3 }, 
  matriculaText: { fontSize: 14, color: G_COLORS.ouro, marginTop: 3, fontWeight: 'bold' }, 
  uorgBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF20', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 15, alignSelf: 'flex-start', marginTop: 12 }, 
  uorgText: { color: G_COLORS.branco, fontSize: 12, marginLeft: 5, fontWeight: '600' }, 
  contrachequeCard: { backgroundColor: G_COLORS.branco, borderRadius: 12, padding: 18, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, elevation: 2 }, 
  contrachequeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }, 
  ccMes: { fontSize: 13, color: G_COLORS.cinzaTexto }, 
  ccData: { fontSize: 18, fontWeight: '800', color: G_COLORS.textoPreto }, 
  ccDivider: { height: 1, backgroundColor: G_COLORS.cinzaBorda, marginBottom: 15 }, 
  ccInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }, 
  ccLabel: { fontSize: 15, fontWeight: '600', color: G_COLORS.cinzaTexto }, 
  ccValor: { fontSize: 18, fontWeight: '800', color: G_COLORS.verde }, 
  ccBotaoRow: { flexDirection: 'row', gap: 10 }, 
  btnCcPrincipal: { flex: 1, flexDirection: 'row', backgroundColor: G_COLORS.azulPrincipal, height: 45, borderRadius: 25, justifyContent: 'center', alignItems: 'center', gap: 8 }, 
  btnCcTexto: { color: G_COLORS.branco, fontSize: 14, fontWeight: 'bold' }, 
  serviceGroup: { backgroundColor: G_COLORS.branco, borderRadius: 12, borderWidth: 1, borderColor: G_COLORS.cinzaBorda, elevation: 2, overflow: 'hidden' }, 
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: G_COLORS.cinzaFundo }, 
  iconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' }, 
  cardTextContainer: { flex: 1, marginLeft: 16 }, 
  cardTitle: { fontSize: 15, fontWeight: '700', color: G_COLORS.textoPreto }, 
  cardSubtitle: { fontSize: 12, color: G_COLORS.cinzaTexto, marginTop: 2 } 
});
