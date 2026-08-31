import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const PORTAL_SESSION_KEY = 'portal-n2-session';

let portalSessionToken = '';

if (typeof window !== 'undefined') {
  portalSessionToken = window.sessionStorage.getItem(PORTAL_SESSION_KEY) || '';
}

const portalFetch: typeof fetch = (input, init = {}) => {
  const headers = new Headers(init.headers);

  if (portalSessionToken) {
    headers.set('x-portal-session', portalSessionToken);
  }

  return fetch(input, { ...init, headers });
};

export const supabaseConfigurado = Boolean(supabaseUrl && supabaseKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-publishable-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      fetch: portalFetch,
    },
  },
);

export type PortalProfile = {
  cpf: string;
  nome: string;
  cargo: string;
  uorg_id: string;
  matricula: string;
  nivel_acesso: string;
};

export function setPortalSession(token?: string | null) {
  portalSessionToken = String(token || '').trim();

  if (typeof window === 'undefined') return;

  if (portalSessionToken) {
    window.sessionStorage.setItem(PORTAL_SESSION_KEY, portalSessionToken);
  } else {
    window.sessionStorage.removeItem(PORTAL_SESSION_KEY);
  }
}

export async function getPortalProfile(): Promise<PortalProfile | null> {
  const { data, error } = await supabase.rpc('portal_perfil_atual');
  if (error) throw error;

  const profile = Array.isArray(data) ? data[0] : data;
  return profile ? (profile as PortalProfile) : null;
}
