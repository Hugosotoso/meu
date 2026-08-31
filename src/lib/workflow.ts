export type Prioridade = 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';

export type AuditoriaEvento = {
  id: string | number;
  created_at: string;
  acao: string;
  status_anterior?: string | null;
  status_novo?: string | null;
  usuario_nome?: string | null;
  usuario_matricula?: string | null;
  detalhes?: Record<string, unknown> | null;
};

export const PRIORIDADES: Prioridade[] = ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'];

export const CORES_PRIORIDADE: Record<Prioridade, { fundo: string; texto: string; label: string }> = {
  BAIXA: { fundo: '#ECFDF5', texto: '#047857', label: 'Baixa' },
  NORMAL: { fundo: '#EFF6FF', texto: '#1D4ED8', label: 'Normal' },
  ALTA: { fundo: '#FFF7ED', texto: '#C2410C', label: 'Alta' },
  URGENTE: { fundo: '#FEF2F2', texto: '#B91C1C', label: 'Urgente' },
};

const STATUS_FINALIZADOS = new Set([
  'FINALIZADO',
  'FINALIZADA',
  'CONCLUIDO',
  'CONCLUIDA',
  'ENTREGUE',
  'ARQUIVADO',
  'ARQUIVADA',
]);

const STATUS_REJEITADOS = new Set(['REJEITADO', 'REJEITADA', 'INDEFERIDO', 'INDEFERIDA']);
const STATUS_APROVADOS = new Set(['APROVADO', 'APROVADA', 'DEFERIDO', 'DEFERIDA']);

export function normalizarStatus(status?: string | null) {
  return String(status || 'EM_ANALISE')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();
}

export function statusFinalizado(status?: string | null) {
  return STATUS_FINALIZADOS.has(normalizarStatus(status));
}

export function estiloStatus(status?: string | null) {
  const chave = normalizarStatus(status);
  if (STATUS_FINALIZADOS.has(chave)) return { fundo: '#ECFDF5', texto: '#047857', label: 'Concluído' };
  if (STATUS_REJEITADOS.has(chave)) return { fundo: '#FEF2F2', texto: '#B91C1C', label: 'Rejeitado' };
  if (STATUS_APROVADOS.has(chave)) return { fundo: '#ECFDF5', texto: '#047857', label: 'Aprovado' };
  if (chave.includes('ASSINATURA')) return { fundo: '#F3E8FF', texto: '#7E22CE', label: 'Aguardando assinatura' };
  if (chave.includes('SEPARAR')) return { fundo: '#FFF7ED', texto: '#C2410C', label: 'A separar' };
  if (chave.includes('TRANSITO')) return { fundo: '#EFF6FF', texto: '#1D4ED8', label: 'Em trânsito' };
  if (chave.includes('ANDAMENTO')) return { fundo: '#EFF6FF', texto: '#1D4ED8', label: 'Em andamento' };
  return { fundo: '#FFFBEB', texto: '#A16207', label: 'Em análise' };
}

export function prioridadeSegura(valor?: string | null): Prioridade {
  const prioridade = String(valor || 'NORMAL').toUpperCase() as Prioridade;
  return PRIORIDADES.includes(prioridade) ? prioridade : 'NORMAL';
}

export function formatarDataHora(valor?: string | null) {
  if (!valor) return 'Data não informada';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return valor;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function mascararCpf(cpf?: string | null) {
  const limpo = String(cpf || '').replace(/\D/g, '');
  if (limpo.length !== 11) return '***.***.***-**';
  return `${limpo.slice(0, 3)}.***.***-${limpo.slice(-2)}`;
}

export function gerarHashAssinatura(matricula?: string | string[]) {
  const base = `${String(matricula || 'N2')}-${Date.now()}-${Math.random()}`;
  let hash = 2166136261;
  for (let i = 0; i < base.length; i += 1) {
    hash ^= base.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `N2-${Date.now().toString(36).toUpperCase()}-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

