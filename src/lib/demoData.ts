import type { Servidor } from '../context/SessionContext';

export const DEMO_CPF = '12345678910';

export const DEMO_SERVIDOR: Servidor = {
  cpf: DEMO_CPF,
  nome: 'SERVIDOR TESTE',
  cargo: 'USUÁRIO DE DEMONSTRAÇÃO',
  uorg: 'UNIDADE ACADÊMICA N2',
  matricula: '1234567',
};

export const DEMO_CONTRACHEQUES = [
  {
    id: 'demo-1',
    matricula: DEMO_SERVIDOR.matricula,
    mes_referencia: 'Agosto/2026',
    bruto: 5600,
    descontos: 1176,
    liquido: 4424,
    rendimentos: [
      { rubrica: '001', desc: 'Vencimento básico demonstrativo', valor: 4800 },
      { rubrica: '101', desc: 'Gratificação demonstrativa', valor: 800 },
    ],
    lista_descontos: [
      { rubrica: '201', desc: 'Previdência demonstrativa', valor: 616 },
      { rubrica: '202', desc: 'Imposto demonstrativo', valor: 560 },
    ],
  },
  {
    id: 'demo-2',
    matricula: DEMO_SERVIDOR.matricula,
    mes_referencia: 'Julho/2026',
    bruto: 5600,
    descontos: 1142,
    liquido: 4458,
    rendimentos: [
      { rubrica: '001', desc: 'Vencimento básico demonstrativo', valor: 4800 },
      { rubrica: '101', desc: 'Gratificação demonstrativa', valor: 800 },
    ],
    lista_descontos: [
      { rubrica: '201', desc: 'Previdência demonstrativa', valor: 616 },
      { rubrica: '202', desc: 'Imposto demonstrativo', valor: 526 },
    ],
  },
  {
    id: 'demo-3',
    matricula: DEMO_SERVIDOR.matricula,
    mes_referencia: 'Junho/2026',
    bruto: 5450,
    descontos: 1089,
    liquido: 4361,
    rendimentos: [
      { rubrica: '001', desc: 'Vencimento básico demonstrativo', valor: 4800 },
      { rubrica: '101', desc: 'Gratificação demonstrativa', valor: 650 },
    ],
    lista_descontos: [
      { rubrica: '201', desc: 'Previdência demonstrativa', valor: 600 },
      { rubrica: '202', desc: 'Imposto demonstrativo', valor: 489 },
    ],
  },
];

export const isDemoCpf = (cpf?: string | null) => cpf === DEMO_CPF;

