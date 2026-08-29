import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, StatusBar } from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#1351B4" barStyle="light-content" />
      
      {/* Cabeçalho Estilo GOV.BR */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.govLogo}>gov<Text style={styles.govPonto}>.</Text>br</Text>
          <MaterialIcons name="account-circle" size={36} color="#FFFFFF" />
        </View>
        <Text style={styles.headerWelcome}>Olá, Servidor</Text>
        <Text style={styles.headerSubtitle}>Painel Integrado de Gestão</Text>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>Módulos Disponíveis</Text>

        {/* Card 1 - GABINETE (Funcional) */}
        <TouchableOpacity style={styles.cardActive} activeOpacity={0.7}>
          <View style={styles.cardIconBox}>
            <FontAwesome5 name="file-signature" size={22} color="#1351B4" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Gabinete</Text>
            <Text style={styles.cardDescription}>Gestão de Prazos e Ofícios</Text>
          </View>
          <MaterialIcons name="chevron-right" size={28} color="#1351B4" />
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Em Implantação (Fase 2)</Text>

        {/* Card 2 - SDGP (Bloqueado) */}
        <TouchableOpacity style={styles.cardInactive} activeOpacity={1}>
          <View style={styles.cardIconBoxInactive}>
            <FontAwesome5 name="users" size={20} color="#9E9E9E" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitleInactive}>SDGP</Text>
            <Text style={styles.cardDescriptionInactive}>Férias, AFD e Licenças</Text>
          </View>
          <MaterialIcons name="lock-outline" size={24} color="#9E9E9E" />
        </TouchableOpacity>

        {/* Card 3 - IA (Bloqueado) */}
        <TouchableOpacity style={styles.cardInactive} activeOpacity={1}>
          <View style={styles.cardIconBoxInactive}>
            <FontAwesome5 name="robot" size={20} color="#9E9E9E" />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitleInactive}>Assistente IA</Text>
            <Text style={styles.cardDescriptionInactive}>Leitura e Triagem de PDF</Text>
          </View>
          <MaterialIcons name="lock-outline" size={24} color="#9E9E9E" />
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F5F8', // Fundo cinza bem claro, padrão corporativo
  },
  header: {
    backgroundColor: '#1351B4', // Azul oficial gov.br
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  govLogo: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  govPonto: {
    color: '#FFCD00', // Amarelo do Brasil no ponto
  },
  headerWelcome: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#E0E0E0',
    fontSize: 15,
    marginTop: 5,
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    textTransform: 'uppercase',
    marginBottom: 15,
    marginLeft: 5,
  },
  // ESTILOS DO CARD ATIVO
  cardActive: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 3, // Sombra Android
    shadowColor: '#000', // Sombra iOS
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  cardIconBox: {
    backgroundColor: '#E8F0FE', // Fundo azulzinho para o ícone
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  cardDescription: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  // ESTILOS DOS CARDS INATIVOS
  cardInactive: {
    backgroundColor: '#F5F5F5',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardIconBoxInactive: {
    backgroundColor: '#E0E0E0',
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  cardTitleInactive: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#9E9E9E',
  },
  cardDescriptionInactive: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 2,
  },
});