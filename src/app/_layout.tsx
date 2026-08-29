/**
 * Super App Gov — Estrutura de Rotas Principal (Stack Router)
 * Arquivo: src/app/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SessionProvider } from '../context/SessionContext';

export default function LayoutRaiz() {
  return (
    <SessionProvider>
      <View style={styles.container}>
        <View style={styles.prototypeBanner}>
          <Text style={styles.prototypeText}>PROTÓTIPO ACADÊMICO — NÃO É UM SERVIÇO OFICIAL</Text>
        </View>
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="login/index" />
          <Stack.Screen name="index" />
          <Stack.Screen name="gabinete/index" />
          <Stack.Screen name="ia-copilot/index" />
        </Stack>
      </View>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  prototypeBanner: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF4CC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5B700',
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  prototypeText: { color: '#5C4600', fontSize: 10, fontWeight: '800', textAlign: 'center' },
});
