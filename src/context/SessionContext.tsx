import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export type Servidor = {
  cpf: string;
  nome: string;
  cargo: string;
  uorg: string;
  matricula: string;
};

type SessionContextValue = {
  carregando: boolean;
  servidor: Servidor | null;
  entrar: (dados: Servidor) => void;
  sair: () => void;
};

const STORAGE_KEY = 'portal-n2:servidor';
const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [servidor, setServidor] = useState<Servidor | null>(null);
  const [carregando, setCarregando] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    try {
      const salvo = globalThis.sessionStorage?.getItem(STORAGE_KEY);
      if (salvo) setServidor(JSON.parse(salvo) as Servidor);
    } catch {
      globalThis.sessionStorage?.removeItem(STORAGE_KEY);
    } finally {
      setCarregando(false);
    }
  }, []);

  const entrar = useCallback((dados: Servidor) => {
    setServidor(dados);
    if (Platform.OS === 'web') {
      globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(dados));
    }
  }, []);

  const sair = useCallback(() => {
    setServidor(null);
    if (Platform.OS === 'web') globalThis.sessionStorage?.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({ carregando, servidor, entrar, sair }),
    [carregando, servidor, entrar, sair],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession deve ser usado dentro de SessionProvider.');
  return context;
}
