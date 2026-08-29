/**
 * Portal Integrado N2 — Assistente virtual demonstrativo
 */

import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../context/SessionContext';

const C = { 
  azulGov: '#1351B4', azulEscuro: '#0B2D66', fundo: '#F4F6F9', branco: '#FFFFFF',
  textoDestaque: '#111827', textoSecundario: '#6B7280', 
  borda: '#E5E7EB', ouro: '#F59E0B', bgUser: '#1351B4', bgAI: '#FFFFFF'
};

type Mensagem = { id: string; texto: string; isUser: boolean };

export default function IaCopilotScreen() {
  const router = useRouter();
  const { servidor } = useSession();
  const nome = servidor?.nome || 'Usuário de demonstração';
  const cargo = servidor?.cargo || 'servidor';
  const uorg = servidor?.uorg || 'unidade de demonstração';
  const scrollRef = useRef<ScrollView>(null);

  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { 
      id: '1', 
      texto: `Olá, ${nome}! Sou o Assistente N2 demonstrativo. Posso ajudar a explorar os recursos do protótipo para o cargo ${cargo} na unidade ${uorg}.`,
      isUser: false 
    }
  ]);
  const [inputTexto, setInputTexto] = useState('');
  const [carregando, setCarregando] = useState(false);

  // A função TEM que ser async aqui para o await funcionar lá embaixo
  const enviarMensagem = async () => {
    if (!inputTexto.trim()) return;

    const textoUsuario = inputTexto;
    setInputTexto(''); 
    setMensagens((prev) => [...prev, { id: Date.now().toString(), texto: textoUsuario, isUser: true }]);
    setCarregando(true);

    // MODO BLINDAGEM: RESPOSTA LOCAL E INSTANTÂNEA
    setTimeout(() => {
      setMensagens((prev) => [...prev, { id: Date.now().toString(), texto: `Esta é uma resposta simulada para ${nome}. O protótipo ainda não está conectado a um modelo de IA nem a uma rede interna.`, isUser: false }]);
      setCarregando(false);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.btnVoltar}>
          <MaterialIcons name="arrow-back-ios" size={18} color={C.branco} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assistente N2</Text>
        <MaterialCommunityIcons name="robot-outline" size={26} color={C.ouro} />
      </View>

      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scrollRef} contentContainerStyle={styles.chatContainer}>
          {mensagens.map((msg) => (
            <View key={msg.id} style={[styles.balaoWrapper, msg.isUser ? styles.wrapperDireita : styles.wrapperEsquerda]}>
              <View style={[styles.balao, msg.isUser ? styles.balaoUsuario : styles.balaoIA]}>
                <Text style={msg.isUser ? styles.textoUsuario : styles.textoIA}>{msg.texto}</Text>
              </View>
            </View>
          ))}
          {carregando && <ActivityIndicator size="small" color={C.azulGov} />}
        </ScrollView>

        <View style={styles.inputArea}>
          <TextInput style={styles.input} value={inputTexto} onChangeText={setInputTexto} placeholder="Digite aqui..." />
          <TouchableOpacity style={styles.btnEnviar} onPress={enviarMensagem}>
            <MaterialIcons name="send" size={20} color={C.branco} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.azulGov },
  container: { flex: 1, backgroundColor: C.fundo },
  header: { backgroundColor: C.azulGov, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  btnVoltar: { padding: 6 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: C.branco },
  chatContainer: { padding: 16 },
  balaoWrapper: { marginBottom: 16 },
  wrapperDireita: { alignSelf: 'flex-end' },
  wrapperEsquerda: { alignSelf: 'flex-start' },
  balao: { padding: 12, borderRadius: 18, maxWidth: '80%' },
  balaoUsuario: { backgroundColor: C.azulGov },
  balaoIA: { backgroundColor: C.branco, borderWidth: 1, borderColor: C.borda },
  textoUsuario: { color: C.branco },
  textoIA: { color: C.textoDestaque },
  inputArea: { flexDirection: 'row', padding: 12, backgroundColor: C.branco, borderTopWidth: 1, borderColor: C.borda },
  input: { flex: 1, backgroundColor: C.fundo, borderRadius: 20, paddingHorizontal: 16, height: 45, marginRight: 10 },
  btnEnviar: { width: 45, height: 45, borderRadius: 22, backgroundColor: C.azulGov, justifyContent: 'center', alignItems: 'center' }
});
