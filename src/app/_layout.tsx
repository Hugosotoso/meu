/**
 * Super App Gov — Estrutura de Rotas Principal (Stack Router)
 * Arquivo: src/app/_layout.tsx
 */

import React from 'react';
import { Stack } from 'expo-router';

export default function LayoutRaiz() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Esconde a barra cinza feia padrão do Expo no topo
        animation: 'slide_from_right', // Animação bonita de transição de tela
      }}
    >
      {/* Define o Login como a primeira tela padrão quando o app abre */}
      <Stack.Screen name="login/index" />
      
      {/* Define o Dashboard Principal como a rota raiz de destino */}
      <Stack.Screen name="index" />
      
      {/* Mapeamento dos outros módulos ativos */}
      <Stack.Screen name="central/index" />
      <Stack.Screen name="gabinete/index" />
      <Stack.Screen name="ia-copilot/index" />
    </Stack>
  );
}
