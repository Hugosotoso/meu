import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Modal, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPortalProfile, supabase } from '../../lib/supabase';
import { escaparHtml, exportarHtml } from '../../lib/exportHtml';
import {
  AuditoriaEvento, CORES_PRIORIDADE, formatarDataHora, gerarHashAssinatura,
  mascararCpf, prioridadeSegura, statusFinalizado,
} from '../../lib/workflow';
import PrioritySelector from '../../components/PrioritySelector';
import WorkflowTimeline from '../../components/WorkflowTimeline';

const C = {
  azul: '#1351B4', azulEscuro: '#0C326F', azulClaro: '#E8EEFA', amarelo: '#FFCD00',
  branco: '#FFFFFF', fundo: '#F4F6F9', texto: '#1F2937', secundario: '#64748B',
  borda: '#D9DDE8', verde: '#047857', vermelho: '#B91C1C', laranja: '#C2410C', roxo: '#7E22CE',
};

type Oficio = {
  id: string | number; created_at?: string | null; updated_at?: string | null;
  numero: string; protocolo?: string | null; orgao: string; orgaoNome?: string | null;
  assunto: string; descricao?: string | null; interessado?: string | null; vencimento: string;
  responsavel?: string | null; tipo: string; status: string; prioridade?: string | null;
  etapa?: string | null; sigilo?: string | null; justificativa_gestor?: string | null;
  assinado_em?: string | null; assinatura_hash?: string | null;
};

type Formulario = {
  orgao: string; orgaoNome: string; assunto: string; descricao: string; interessado: string;
  tipo: string; vencimento: string; prioridade: 'BAIXA' | 'NORMAL' | 'ALTA' | 'URGENTE';
  sigilo: 'PUBLICO' | 'RESTRITO';
};

const FORM_VAZIO: Formulario = {
  orgao: '', orgaoNome: '', assunto: '', descricao: '', interessado: '', tipo: 'OFICIO',
  vencimento: '', prioridade: 'NORMAL', sigilo: 'PUBLICO',
};

const TIPOS = [
  { valor: 'OFICIO', label: 'Ofício' }, { valor: 'REQUISICAO', label: 'Requisição' },
  { valor: 'DESPACHO', label: 'Despacho' }, { valor: 'NOTA_TECNICA', label: 'Nota técnica' },
];

function somenteTexto(valor: unknown, fallback = 'Não informado') {
  const resultado = String(valor ?? '').trim();
  return resultado || fallback;
}

function formatarTipo(tipo?: string | null) {
  return somenteTexto(tipo, 'Documento').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function parseDataBr(valor?: string | null) {
  const [dia, mes, ano] = String(valor || '').split('/').map(Number);
  if (!dia || !mes || !ano) return null;
  const data = new Date(ano, mes - 1, dia);
  return Number.isNaN(data.getTime()) ? null : data;
}

function situacaoPrazo(oficio: Oficio) {
  if (statusFinalizado(oficio.status)) return { label: 'Concluído', cor: C.verde, fundo: '#ECFDF5', icone: 'task-alt' as const };
  const data = parseDataBr(oficio.vencimento);
  if (!data) return { label: 'Sem prazo', cor: C.secundario, fundo: '#F1F5F9', icone: 'event-busy' as const };
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0); data.setHours(0, 0, 0, 0);
  const dias = Math.ceil((data.getTime() - hoje.getTime()) / 86400000);
  if (dias < 0) return { label: `${Math.abs(dias)}d atrasado`, cor: C.vermelho, fundo: '#FEF2F2', icone: 'warning' as const };
  if (dias === 0) return { label: 'Vence hoje', cor: C.vermelho, fundo: '#FEF2F2', icone: 'notification-important' as const };
  if (dias <= 2) return { label: `Vence em ${dias}d`, cor: C.laranja, fundo: '#FFF7ED', icone: 'schedule' as const };
  return { label: `${dias} dias`, cor: C.verde, fundo: '#ECFDF5', icone: 'event-available' as const };
}

function statusGabinete(status?: string | null) {
  const valor = somenteTexto(status, 'andamento').toUpperCase();
  if (valor === 'FINALIZADO') return { label: 'Finalizado', cor: C.verde, fundo: '#ECFDF5' };
  if (valor.includes('ASSINATURA')) return { label: 'Aguardando assinatura', cor: C.roxo, fundo: '#F3E8FF' };
  if (valor.includes('ANALISE')) return { label: 'Em análise', cor: C.laranja, fundo: '#FFF7ED' };
  return { label: 'Em andamento', cor: C.azul, fundo: C.azulClaro };
}

function Campo({ label, value, onChangeText, placeholder, multiline = false, editable = true }: {
  label: string; value: string; onChangeText: (valor: string) => void; placeholder: string;
  multiline?: boolean; editable?: boolean;
}) {
  return <View style={styles.campoGrupo}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#9EA3B0"
      multiline={multiline} editable={editable}
      style={[styles.input, multiline && styles.textarea, !editable && styles.inputDesabilitado]} />
  </View>;
}

function Indicador({ valor, label, cor, icone }: { valor: number; label: string; cor: string; icone: any }) {
  return <View style={styles.indicador}>
    <MaterialIcons name={icone} size={20} color={cor} /><Text style={styles.indicadorValor}>{valor}</Text>
    <Text style={styles.indicadorLabel}>{label}</Text>
  </View>;
}

export default function Gabinete() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [identidade, setIdentidade] = useState({
    nome: somenteTexto(params.nome, 'Servidor'),
    matricula: somenteTexto(params.matricula, 'N/D'),
    cpf: somenteTexto(params.cpf, ''),
    nivel_acesso: '',
  });
  const { nome, matricula, cpf } = identidade;
  const acessoDiamante = identidade.nivel_acesso.toUpperCase() === 'DIAMANTE';
  const [oficios, setOficios] = useState<Oficio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState<'ATIVOS' | 'FINALIZADOS'>('ATIVOS');
  const [modalVisivel, setModalVisivel] = useState(false);
  const [oficioAtual, setOficioAtual] = useState<Oficio | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VAZIO);
  const [eventos, setEventos] = useState<AuditoriaEvento[]>([]);
  const [assinaturaVisivel, setAssinaturaVisivel] = useState(false);

  const carregarOficios = async () => {
    setCarregando(true); setErro('');
    const { data, error } = await supabase.from('oficios').select('*').order('id', { ascending: false });
    if (error) { setErro(error.message); setOficios([]); } else setOficios((data || []) as Oficio[]);
    setCarregando(false);
  };

  useEffect(() => {
    let ativo = true;

    const iniciar = async () => {
      try {
        const perfil = await getPortalProfile();
        if (!ativo || !perfil) return;
        setIdentidade({
          nome: perfil.nome,
          matricula: perfil.matricula,
          cpf: perfil.cpf,
          nivel_acesso: perfil.nivel_acesso,
        });
      } catch (error: any) {
        if (ativo) setErro(error?.message || 'Não foi possível validar a sessão.');
      }
    };

    iniciar();
    carregarOficios();
    return () => { ativo = false; };
  }, []);

  const carregarAuditoria = async (oficio: Oficio) => {
    const { data } = await supabase.from('auditoria_eventos').select('*').eq('tabela', 'oficios')
      .eq('registro_id', String(oficio.id)).order('created_at', { ascending: false });
    setEventos((data || []) as AuditoriaEvento[]);
  };

  const abrirNovo = () => {
    if (!acessoDiamante) return;
    setOficioAtual(null); setForm(FORM_VAZIO); setEventos([]); setAssinaturaVisivel(false); setModalVisivel(true);
  };

  const abrirDetalhes = (oficio: Oficio) => {
    setOficioAtual(oficio);
    setForm({ orgao: somenteTexto(oficio.orgao, ''), orgaoNome: somenteTexto(oficio.orgaoNome, ''),
      assunto: somenteTexto(oficio.assunto, ''), descricao: somenteTexto(oficio.descricao, ''),
      interessado: somenteTexto(oficio.interessado, ''), tipo: somenteTexto(oficio.tipo, 'OFICIO').toUpperCase().replaceAll(' ', '_'),
      vencimento: somenteTexto(oficio.vencimento, ''), prioridade: prioridadeSegura(oficio.prioridade),
      sigilo: oficio.sigilo === 'RESTRITO' ? 'RESTRITO' : 'PUBLICO' });
    setAssinaturaVisivel(false); setModalVisivel(true); carregarAuditoria(oficio);
  };

  const mascaraData = (valor: string) => {
    const numeros = valor.replace(/\D/g, '').slice(0, 8);
    const partes = [numeros.slice(0, 2), numeros.slice(2, 4), numeros.slice(4, 8)].filter(Boolean);
    setForm((anterior) => ({ ...anterior, vencimento: partes.join('/') }));
  };

  const validar = () => {
    if (!form.orgao.trim() || !form.assunto.trim() || !form.interessado.trim()) {
      Alert.alert('Campos obrigatórios', 'Informe órgão, interessado e assunto.'); return false;
    }
    if (!parseDataBr(form.vencimento)) { Alert.alert('Prazo inválido', 'Informe o prazo no formato DD/MM/AAAA.'); return false; }
    return true;
  };

  const salvar = async () => {
    if (!acessoDiamante || !validar()) return;
    setSalvando(true);
    const payload = { orgao: form.orgao.trim().toUpperCase(), orgaoNome: form.orgaoNome.trim() || form.orgao.trim().toUpperCase(),
      assunto: form.assunto.trim(), descricao: form.descricao.trim() || null, interessado: form.interessado.trim(),
      tipo: form.tipo, vencimento: form.vencimento, prioridade: form.prioridade, sigilo: form.sigilo,
      responsavel: nome, atualizado_por_matricula: matricula, atualizado_por_nome: nome };
    if (oficioAtual) {
      const { data, error } = await supabase.from('oficios').update(payload).eq('id', oficioAtual.id).select('*').single();
      setSalvando(false);
      if (error) return Alert.alert('Erro ao atualizar', error.message);
      setOficioAtual(data as Oficio); await carregarAuditoria(data as Oficio); await carregarOficios();
      Alert.alert('Alterações salvas', 'A atualização foi registrada na trilha de auditoria.'); return;
    }
    const numero = `OF.GAB-${String(Date.now()).slice(-6)}/${new Date().getFullYear()}`;
    const { data, error } = await supabase.from('oficios').insert([{ ...payload, numero, status: 'andamento', etapa: 'TRIAGEM', criado_por_matricula: matricula }]).select('*').single();
    setSalvando(false);
    if (error) return Alert.alert('Erro ao protocolar', error.message);
    setModalVisivel(false); await carregarOficios();
    Alert.alert('Documento protocolado', `Protocolo ${data.protocolo || numero} criado com sucesso.`);
  };

  const movimentar = async (status: string, etapa: string, mensagem: string) => {
    if (!oficioAtual || !acessoDiamante) return;
    setSalvando(true);
    const { data, error } = await supabase.from('oficios').update({ status, etapa, atualizado_por_matricula: matricula, atualizado_por_nome: nome })
      .eq('id', oficioAtual.id).select('*').single();
    setSalvando(false);
    if (error) return Alert.alert('Erro na tramitação', error.message);
    setOficioAtual(data as Oficio); await carregarAuditoria(data as Oficio); await carregarOficios();
    Alert.alert('Tramitação registrada', mensagem);
  };

  const assinar = async () => {
    if (!oficioAtual || !acessoDiamante) return;
    const hash = gerarHashAssinatura(matricula); setSalvando(true);
    const { data, error } = await supabase.from('oficios').update({ status: 'finalizado', etapa: 'ARQUIVADO',
      responsavel: `${nome} • Matrícula ${matricula}`, assinado_em: new Date().toISOString(), assinatura_hash: hash,
      atualizado_por_matricula: matricula, atualizado_por_nome: nome }).eq('id', oficioAtual.id).select('*').single();
    setSalvando(false);
    if (error) return Alert.alert('Erro ao assinar', error.message);
    setAssinaturaVisivel(false); setOficioAtual(data as Oficio); await carregarAuditoria(data as Oficio); await carregarOficios();
    Alert.alert('Documento assinado', `Assinatura eletrônica registrada sob o código ${hash}.`);
  };

  const imprimir = async (oficio: Oficio) => {
    const status = statusGabinete(oficio.status).label;
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
      body{font-family:Arial,sans-serif;color:#1f2937;margin:48px;line-height:1.55}.topo{border-bottom:4px solid #1351B4;padding-bottom:18px;margin-bottom:30px}
      .marca{font-size:28px;font-weight:900;color:#1351B4}.orgao{font-size:12px;color:#64748b;margin-top:4px}h1{font-size:20px;text-align:center;margin:35px 0}
      .meta{background:#f4f6f9;border:1px solid #d9dde8;padding:16px;border-radius:8px}.linha{margin:7px 0}.rotulo{font-weight:700;color:#0c326f}
      .texto{margin-top:28px;white-space:pre-wrap}.assinatura{margin-top:55px;padding-top:18px;border-top:1px solid #94a3b8;text-align:center}
      .hash{font-family:monospace;font-size:10px;color:#64748b;margin-top:8px}.rodape{font-size:10px;color:#64748b;margin-top:55px;text-align:center}</style></head><body>
      <div class="topo"><div class="marca">gov<span style="color:#FFCD00">.</span>br</div><div class="orgao">Secretaria de Administração e Gestão Digital • Gabinete Institucional</div></div>
      <h1>${escaparHtml(formatarTipo(oficio.tipo))} ${escaparHtml(oficio.numero)}</h1><div class="meta">
      <div class="linha"><span class="rotulo">Protocolo:</span> ${escaparHtml(oficio.protocolo)}</div><div class="linha"><span class="rotulo">Órgão:</span> ${escaparHtml(oficio.orgaoNome || oficio.orgao)}</div>
      <div class="linha"><span class="rotulo">Interessado:</span> ${escaparHtml(oficio.interessado)}</div><div class="linha"><span class="rotulo">Assunto:</span> ${escaparHtml(oficio.assunto)}</div>
      <div class="linha"><span class="rotulo">Prazo:</span> ${escaparHtml(oficio.vencimento)} • <span class="rotulo">Status:</span> ${escaparHtml(status)}</div></div>
      <div class="texto">${escaparHtml(oficio.descricao || 'Documento registrado no Portal Integrado N2.')}</div>
      ${oficio.assinatura_hash ? `<div class="assinatura"><strong>${escaparHtml(oficio.responsavel)}</strong><br>Assinado eletronicamente em ${escaparHtml(formatarDataHora(oficio.assinado_em))}<div class="hash">${escaparHtml(oficio.assinatura_hash)}</div></div>` : ''}
      <div class="rodape">Documento emitido pelo Portal Integrado N2 • Verifique a autenticidade pelo código de assinatura.</div></body></html>`;
    try { await exportarHtml(html); } catch (error: any) { Alert.alert('Erro ao gerar documento', error?.message || 'Não foi possível abrir a impressão.'); }
  };

  const filtrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    return oficios.filter((oficio) => {
      const naAba = aba === 'ATIVOS' ? !statusFinalizado(oficio.status) : statusFinalizado(oficio.status);
      const noTexto = !termo || `${oficio.protocolo} ${oficio.numero} ${oficio.orgao} ${oficio.assunto} ${oficio.interessado}`.toLowerCase().includes(termo);
      return naAba && noTexto;
    });
  }, [aba, busca, oficios]);

  const ativos = oficios.filter((oficio) => !statusFinalizado(oficio.status));
  const urgentes = ativos.filter((oficio) => prioridadeSegura(oficio.prioridade) === 'URGENTE');
  const vencidos = ativos.filter((oficio) => situacaoPrazo(oficio).label.includes('atrasado'));
  const aguardandoAssinatura = ativos.filter((oficio) => oficio.status?.toUpperCase().includes('ASSINATURA'));
  const atualFinalizado = Boolean(oficioAtual && statusFinalizado(oficioAtual.status));

  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}>
      <TouchableOpacity style={styles.voltar} onPress={() => router.back()}><MaterialIcons name="arrow-back" size={22} color={C.branco} /></TouchableOpacity>
      <View style={styles.headerCentro}><Text style={styles.marca}>gov<Text style={{ color: C.amarelo }}>.</Text>br</Text><Text style={styles.headerTitulo}>Gabinete Institucional</Text></View>
      <View style={styles.acessoTag}><MaterialIcons name={acessoDiamante ? 'verified-user' : 'visibility'} size={14} color={C.amarelo} /><Text style={styles.acessoTexto}>{acessoDiamante ? 'GESTOR' : 'CONSULTA'}</Text></View>
    </View>
    <ScrollView contentContainerStyle={styles.conteudo} showsVerticalScrollIndicator={false}>
      <View style={styles.identificacao}>
        <View style={{ flex: 1 }}><Text style={styles.identificacaoSuper}>UNIDADE RESPONSÁVEL</Text><Text style={styles.identificacaoTitulo}>Gabinete e Assessoria Executiva</Text><Text style={styles.identificacaoMeta}>{nome} • Matrícula {matricula}</Text></View>
        <TouchableOpacity style={styles.iaBtn} onPress={() => router.push({ pathname: '/gabinete/ia', params: { nome, matricula } })}><MaterialCommunityIcons name="robot-outline" size={19} color={C.branco} /><Text style={styles.iaBtnTexto}>Assistente</Text></TouchableOpacity>
      </View>
      <View style={styles.indicadores}>
        <Indicador valor={ativos.length} label="Em tramitação" cor={C.azul} icone="folder-open" /><Indicador valor={urgentes.length} label="Urgentes" cor={C.vermelho} icone="priority-high" />
        <Indicador valor={vencidos.length} label="Fora do prazo" cor={C.laranja} icone="event-busy" /><Indicador valor={aguardandoAssinatura.length} label="Para assinar" cor={C.roxo} icone="draw" />
      </View>
      <View style={styles.acoesLinha}>
        <View style={styles.busca}><MaterialIcons name="search" size={20} color={C.secundario} /><TextInput value={busca} onChangeText={setBusca} placeholder="Buscar processo, protocolo ou órgão" placeholderTextColor="#9EA3B0" style={styles.buscaInput} /></View>
        {acessoDiamante ? <TouchableOpacity style={styles.novoBtn} onPress={abrirNovo}><MaterialIcons name="add" size={21} color={C.branco} /><Text style={styles.novoBtnTexto}>Protocolar</Text></TouchableOpacity> : null}
      </View>
      <View style={styles.abas}>
        <TouchableOpacity style={[styles.aba, aba === 'ATIVOS' && styles.abaAtiva]} onPress={() => setAba('ATIVOS')}><Text style={[styles.abaTexto, aba === 'ATIVOS' && styles.abaTextoAtivo]}>Em tramitação ({ativos.length})</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.aba, aba === 'FINALIZADOS' && styles.abaAtiva]} onPress={() => setAba('FINALIZADOS')}><Text style={[styles.abaTexto, aba === 'FINALIZADOS' && styles.abaTextoAtivo]}>Finalizados</Text></TouchableOpacity>
      </View>
      {carregando ? <ActivityIndicator size="large" color={C.azul} style={{ marginTop: 45 }} /> : erro ? <View style={styles.estadoVazio}>
        <MaterialIcons name="cloud-off" size={40} color={C.vermelho} /><Text style={styles.estadoTitulo}>Não foi possível carregar o Gabinete</Text><Text style={styles.estadoTexto}>{erro}</Text>
        <TouchableOpacity onPress={carregarOficios} style={styles.tentarBtn}><Text style={styles.tentarTexto}>Tentar novamente</Text></TouchableOpacity></View>
        : filtrados.length === 0 ? <View style={styles.estadoVazio}><MaterialCommunityIcons name="file-check-outline" size={42} color={C.borda} /><Text style={styles.estadoTitulo}>Nenhum processo nesta visualização</Text><Text style={styles.estadoTexto}>Utilize a busca ou altere a situação selecionada.</Text></View>
        : filtrados.map((oficio) => {
          const prazo = situacaoPrazo(oficio); const status = statusGabinete(oficio.status); const prioridade = CORES_PRIORIDADE[prioridadeSegura(oficio.prioridade)];
          return <TouchableOpacity key={String(oficio.id)} style={styles.card} onPress={() => abrirDetalhes(oficio)} activeOpacity={0.82}>
            <View style={[styles.faixaPrioridade, { backgroundColor: prioridade.texto }]} /><View style={styles.cardConteudo}>
              <View style={styles.cardTopo}><Text style={styles.protocolo}>{oficio.protocolo || oficio.numero}</Text><View style={[styles.prazoTag, { backgroundColor: prazo.fundo }]}><MaterialIcons name={prazo.icone} size={12} color={prazo.cor} /><Text style={[styles.prazoTexto, { color: prazo.cor }]}>{prazo.label}</Text></View></View>
              <Text style={styles.cardTitulo} numberOfLines={2}>{oficio.assunto}</Text><Text style={styles.cardOrgao}>{oficio.orgao} • {oficio.orgaoNome || 'Órgão demandante'}</Text>
              <View style={styles.cardTags}><View style={[styles.statusTag, { backgroundColor: status.fundo }]}><Text style={[styles.statusTexto, { color: status.cor }]}>{status.label}</Text></View>
                <View style={[styles.statusTag, { backgroundColor: prioridade.fundo }]}><Text style={[styles.statusTexto, { color: prioridade.texto }]}>{prioridade.label}</Text></View><Text style={styles.cardMeta}>{formatarTipo(oficio.tipo)} • {oficio.interessado || 'Sem interessado'}</Text></View>
            </View><MaterialIcons name="chevron-right" size={22} color={C.azul} /></TouchableOpacity>;
        })}
    </ScrollView>

    <Modal visible={modalVisivel} animationType="slide" onRequestClose={() => setModalVisivel(false)}><SafeAreaView style={styles.modalSafe}>
      <View style={styles.modalHeader}><TouchableOpacity onPress={() => setModalVisivel(false)} style={styles.modalVoltar}><MaterialIcons name="close" size={23} color={C.texto} /></TouchableOpacity>
        <View style={{ flex: 1 }}><Text style={styles.modalSuper}>{oficioAtual ? 'PROCESSO ADMINISTRATIVO' : 'NOVO DOCUMENTO'}</Text><Text style={styles.modalTitulo}>{oficioAtual?.protocolo || 'Protocolar no Gabinete'}</Text></View>
        {oficioAtual ? <TouchableOpacity style={styles.imprimirBtn} onPress={() => imprimir(oficioAtual)}><MaterialIcons name="picture-as-pdf" size={20} color={C.azul} /><Text style={styles.imprimirTexto}>Documento</Text></TouchableOpacity> : null}
      </View>
      <ScrollView contentContainerStyle={styles.modalConteudo} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {oficioAtual ? <View style={styles.resumoProcesso}><View style={{ flex: 1 }}><Text style={styles.resumoNumero}>{oficioAtual.numero}</Text><Text style={styles.resumoMeta}>Etapa: {formatarTipo(oficioAtual.etapa || 'TRIAGEM')}</Text></View>
          <View style={[styles.statusTag, { backgroundColor: statusGabinete(oficioAtual.status).fundo }]}><Text style={[styles.statusTexto, { color: statusGabinete(oficioAtual.status).cor }]}>{statusGabinete(oficioAtual.status).label}</Text></View></View> : null}
        <View style={styles.secaoCard}><Text style={styles.secaoTitulo}>Identificação e classificação</Text>
          <Campo label="Órgão / sigla *" value={form.orgao} onChangeText={(orgao) => setForm((f) => ({ ...f, orgao }))} placeholder="Ex.: TJAC" editable={acessoDiamante && !atualFinalizado} />
          <Campo label="Nome do órgão" value={form.orgaoNome} onChangeText={(orgaoNome) => setForm((f) => ({ ...f, orgaoNome }))} placeholder="Ex.: Tribunal de Justiça do Acre" editable={acessoDiamante && !atualFinalizado} />
          <Campo label="Interessado *" value={form.interessado} onChangeText={(interessado) => setForm((f) => ({ ...f, interessado }))} placeholder="Servidor, unidade ou instituição" editable={acessoDiamante && !atualFinalizado} />
          <Text style={styles.label}>Tipo de documento</Text><View style={styles.opcoesLinha}>{TIPOS.map((tipo) => <TouchableOpacity key={tipo.valor} disabled={!acessoDiamante || atualFinalizado} onPress={() => setForm((f) => ({ ...f, tipo: tipo.valor }))} style={[styles.opcao, form.tipo === tipo.valor && styles.opcaoAtiva]}><Text style={[styles.opcaoTexto, form.tipo === tipo.valor && styles.opcaoTextoAtivo]}>{tipo.label}</Text></TouchableOpacity>)}</View>
          <Text style={styles.label}>Prioridade</Text><PrioritySelector value={form.prioridade} onChange={(prioridade) => acessoDiamante && !atualFinalizado && setForm((f) => ({ ...f, prioridade }))} />
          <Text style={[styles.label, { marginTop: 14 }]}>Classificação da informação</Text><View style={styles.opcoesLinha}>{(['PUBLICO', 'RESTRITO'] as const).map((sigilo) => <TouchableOpacity key={sigilo} disabled={!acessoDiamante || atualFinalizado} onPress={() => setForm((f) => ({ ...f, sigilo }))} style={[styles.opcao, form.sigilo === sigilo && styles.opcaoAtiva]}><MaterialIcons name={sigilo === 'PUBLICO' ? 'public' : 'lock'} size={15} color={form.sigilo === sigilo ? C.branco : C.secundario} /><Text style={[styles.opcaoTexto, form.sigilo === sigilo && styles.opcaoTextoAtivo]}>{sigilo === 'PUBLICO' ? 'Público' : 'Restrito'}</Text></TouchableOpacity>)}</View>
        </View>
        <View style={styles.secaoCard}><Text style={styles.secaoTitulo}>Conteúdo e prazo</Text>
          <Campo label="Assunto *" value={form.assunto} onChangeText={(assunto) => setForm((f) => ({ ...f, assunto }))} placeholder="Resumo objetivo da demanda" editable={acessoDiamante && !atualFinalizado} />
          <Campo label="Descrição / minuta" value={form.descricao} onChangeText={(descricao) => setForm((f) => ({ ...f, descricao }))} placeholder="Contexto, fundamentação e providência solicitada" multiline editable={acessoDiamante && !atualFinalizado} />
          <Campo label="Prazo (DD/MM/AAAA) *" value={form.vencimento} onChangeText={mascaraData} placeholder="30/09/2026" editable={acessoDiamante && !atualFinalizado} />
        </View>
        {oficioAtual ? <View style={styles.secaoCard}><View style={styles.secaoTituloLinha}><Text style={styles.secaoTitulo}>Trilha de auditoria</Text><MaterialIcons name="verified" size={18} color={C.azul} /></View><WorkflowTimeline eventos={eventos} /></View> : null}
        {oficioAtual?.assinatura_hash ? <View style={styles.assinaturaRegistrada}><MaterialIcons name="verified" size={28} color={C.verde} /><View style={{ flex: 1 }}><Text style={styles.assinaturaTitulo}>Assinatura eletrônica registrada</Text><Text style={styles.assinaturaMeta}>{oficioAtual.responsavel}</Text><Text style={styles.assinaturaHash}>{oficioAtual.assinatura_hash}</Text></View></View> : null}
        {acessoDiamante && !atualFinalizado ? <View style={styles.acoesProcesso}>
          <TouchableOpacity style={styles.salvarBtn} onPress={salvar} disabled={salvando}>{salvando ? <ActivityIndicator color={C.branco} /> : <><MaterialIcons name="save" size={19} color={C.branco} /><Text style={styles.salvarTexto}>{oficioAtual ? 'Salvar alterações' : 'Protocolar documento'}</Text></>}</TouchableOpacity>
          {oficioAtual ? <><View style={styles.tramitacaoTituloLinha}><Text style={styles.tramitacaoTitulo}>Movimentar processo</Text><Text style={styles.tramitacaoSub}>Cada ação gera auditoria</Text></View><View style={styles.tramitacaoAcoes}>
            <TouchableOpacity style={styles.acaoSecundaria} onPress={() => movimentar('EM_ANALISE', 'ANALISE_TECNICA', 'Processo encaminhado para análise técnica.')}><MaterialIcons name="fact-check" size={18} color={C.azul} /><Text style={styles.acaoSecundariaTexto}>Enviar para análise</Text></TouchableOpacity>
            <TouchableOpacity style={styles.acaoSecundaria} onPress={() => movimentar('AGUARDANDO_ASSINATURA', 'ASSINATURA', 'Processo encaminhado para assinatura do Gabinete.')}><MaterialIcons name="draw" size={18} color={C.roxo} /><Text style={[styles.acaoSecundariaTexto, { color: C.roxo }]}>Solicitar assinatura</Text></TouchableOpacity></View>
            {oficioAtual.status?.toUpperCase().includes('ASSINATURA') ? <TouchableOpacity style={styles.assinarBtn} onPress={() => setAssinaturaVisivel(true)}><MaterialIcons name="verified" size={20} color={C.branco} /><Text style={styles.assinarTexto}>Assinar e concluir</Text></TouchableOpacity> : null}</> : null}
        </View> : !acessoDiamante ? <View style={styles.somenteLeitura}><MaterialIcons name="visibility" size={19} color={C.azul} /><Text style={styles.somenteLeituraTexto}>Perfil OURO: consulta permitida; movimentações são exclusivas do Gabinete.</Text></View> : null}
      </ScrollView>
    </SafeAreaView></Modal>

    <Modal visible={assinaturaVisivel} transparent animationType="fade" onRequestClose={() => setAssinaturaVisivel(false)}><View style={styles.confirmacaoFundo}><View style={styles.confirmacaoCard}>
      <View style={styles.assinaturaIcone}><MaterialIcons name="draw" size={34} color={C.roxo} /></View><Text style={styles.confirmacaoTitulo}>Assinatura eletrônica</Text><Text style={styles.confirmacaoTexto}>Você confirma a assinatura e o encerramento do processo {oficioAtual?.protocolo}?</Text>
      <View style={styles.signatario}><Text style={styles.signatarioLabel}>SIGNATÁRIO AUTENTICADO</Text><Text style={styles.signatarioNome}>{nome}</Text><Text style={styles.signatarioMeta}>Matrícula {matricula} • CPF {mascararCpf(cpf)}</Text></View>
      <Text style={styles.confirmacaoAviso}>A confirmação gera código de integridade, data/hora e evento permanente de auditoria.</Text><TouchableOpacity style={styles.assinarConfirmar} onPress={assinar} disabled={salvando}>{salvando ? <ActivityIndicator color={C.branco} /> : <Text style={styles.assinarConfirmarTexto}>Confirmar assinatura</Text>}</TouchableOpacity>
      <TouchableOpacity style={styles.cancelar} onPress={() => setAssinaturaVisivel(false)}><Text style={styles.cancelarTexto}>Cancelar</Text></TouchableOpacity>
    </View></View></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:C.fundo},header:{backgroundColor:C.azul,minHeight:72,paddingHorizontal:16,paddingVertical:12,flexDirection:'row',alignItems:'center',gap:12},
  voltar:{width:40,height:40,borderRadius:12,backgroundColor:'#FFFFFF18',alignItems:'center',justifyContent:'center'},headerCentro:{flex:1},marca:{color:C.branco,fontSize:13,fontWeight:'900'},headerTitulo:{color:C.branco,fontSize:20,fontWeight:'800'},
  acessoTag:{flexDirection:'row',alignItems:'center',gap:5,borderRadius:14,paddingHorizontal:9,paddingVertical:6,backgroundColor:'#FFFFFF18'},acessoTexto:{color:C.branco,fontSize:10,fontWeight:'900'},conteudo:{padding:16,paddingBottom:60},
  identificacao:{backgroundColor:C.azulEscuro,borderRadius:18,padding:18,flexDirection:'row',alignItems:'center',marginBottom:12},identificacaoSuper:{color:C.amarelo,fontSize:9,fontWeight:'900',letterSpacing:1},identificacaoTitulo:{color:C.branco,fontSize:18,fontWeight:'800',marginTop:4},identificacaoMeta:{color:'#FFFFFFB8',fontSize:11,marginTop:4},
  iaBtn:{flexDirection:'row',alignItems:'center',gap:7,backgroundColor:C.roxo,paddingHorizontal:13,paddingVertical:11,borderRadius:12},iaBtnTexto:{color:C.branco,fontSize:11,fontWeight:'800'},indicadores:{flexDirection:'row',flexWrap:'wrap',gap:9,marginBottom:14},
  indicador:{width:'47%',flexGrow:1,backgroundColor:C.branco,borderRadius:13,borderWidth:1,borderColor:'#E5E7EB',padding:13},indicadorValor:{color:C.texto,fontSize:22,fontWeight:'900',marginTop:6},indicadorLabel:{color:C.secundario,fontSize:10,fontWeight:'600'},
  acoesLinha:{flexDirection:'row',gap:9,marginBottom:12},busca:{flex:1,flexDirection:'row',alignItems:'center',backgroundColor:C.branco,borderWidth:1,borderColor:C.borda,borderRadius:12,paddingHorizontal:12},buscaInput:{flex:1,height:48,paddingLeft:8,color:C.texto,fontSize:12},novoBtn:{flexDirection:'row',alignItems:'center',gap:5,backgroundColor:C.azul,borderRadius:12,paddingHorizontal:13},novoBtnTexto:{color:C.branco,fontSize:11,fontWeight:'800'},
  abas:{flexDirection:'row',backgroundColor:'#E9EDF3',borderRadius:12,padding:4,marginBottom:12},aba:{flex:1,alignItems:'center',paddingVertical:10,borderRadius:9},abaAtiva:{backgroundColor:C.branco},abaTexto:{color:C.secundario,fontSize:11,fontWeight:'700'},abaTextoAtivo:{color:C.azul,fontWeight:'900'},
  card:{backgroundColor:C.branco,borderRadius:15,borderWidth:1,borderColor:'#E5E7EB',marginBottom:10,flexDirection:'row',alignItems:'center',overflow:'hidden'},faixaPrioridade:{width:5,alignSelf:'stretch'},cardConteudo:{flex:1,padding:14},cardTopo:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},protocolo:{color:C.azul,fontSize:10,fontWeight:'900',letterSpacing:.3},
  prazoTag:{flexDirection:'row',alignItems:'center',gap:4,paddingHorizontal:7,paddingVertical:4,borderRadius:10},prazoTexto:{fontSize:9,fontWeight:'800'},cardTitulo:{color:C.texto,fontSize:15,fontWeight:'800',marginTop:7},cardOrgao:{color:C.secundario,fontSize:11,marginTop:3},cardTags:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:6,marginTop:10},statusTag:{paddingHorizontal:8,paddingVertical:5,borderRadius:10},statusTexto:{fontSize:9,fontWeight:'900'},cardMeta:{color:'#9EA3B0',fontSize:9,flexShrink:1},
  estadoVazio:{alignItems:'center',backgroundColor:C.branco,borderRadius:15,borderWidth:1,borderStyle:'dashed',borderColor:C.borda,padding:32,marginTop:14},estadoTitulo:{color:C.texto,fontSize:14,fontWeight:'800',marginTop:10,textAlign:'center'},estadoTexto:{color:C.secundario,fontSize:11,marginTop:4,textAlign:'center'},tentarBtn:{backgroundColor:C.azul,paddingHorizontal:16,paddingVertical:9,borderRadius:16,marginTop:14},tentarTexto:{color:C.branco,fontWeight:'800',fontSize:11},
  modalSafe:{flex:1,backgroundColor:C.fundo},modalHeader:{backgroundColor:C.branco,minHeight:72,borderBottomWidth:1,borderBottomColor:C.borda,paddingHorizontal:16,paddingVertical:11,flexDirection:'row',alignItems:'center',gap:11},modalVoltar:{width:40,height:40,borderRadius:20,backgroundColor:C.fundo,alignItems:'center',justifyContent:'center'},modalSuper:{color:C.azul,fontSize:9,fontWeight:'900',letterSpacing:1},modalTitulo:{color:C.texto,fontSize:17,fontWeight:'900',marginTop:2},
  imprimirBtn:{flexDirection:'row',alignItems:'center',gap:5,padding:9,borderRadius:10,backgroundColor:C.azulClaro},imprimirTexto:{color:C.azul,fontSize:10,fontWeight:'800'},modalConteudo:{width:'100%',maxWidth:820,alignSelf:'center',padding:16,paddingBottom:60},resumoProcesso:{flexDirection:'row',alignItems:'center',backgroundColor:C.azulEscuro,borderRadius:15,padding:16,marginBottom:12},resumoNumero:{color:C.branco,fontSize:16,fontWeight:'800'},resumoMeta:{color:'#FFFFFFB8',fontSize:10,marginTop:3},
  secaoCard:{backgroundColor:C.branco,borderRadius:16,borderWidth:1,borderColor:'#E5E7EB',padding:16,marginBottom:12},secaoTitulo:{color:C.texto,fontSize:15,fontWeight:'900',marginBottom:14},secaoTituloLinha:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},campoGrupo:{marginBottom:14},label:{color:C.texto,fontSize:11,fontWeight:'800',marginBottom:7},input:{minHeight:46,borderWidth:1,borderColor:C.borda,borderRadius:10,paddingHorizontal:12,color:C.texto,backgroundColor:'#FAFBFC',fontSize:13},textarea:{minHeight:120,paddingTop:12,textAlignVertical:'top'},inputDesabilitado:{backgroundColor:'#EEF0F3',color:C.secundario},
  opcoesLinha:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14},opcao:{flexDirection:'row',alignItems:'center',gap:5,borderWidth:1,borderColor:C.borda,borderRadius:18,paddingHorizontal:11,paddingVertical:8},opcaoAtiva:{backgroundColor:C.azul,borderColor:C.azul},opcaoTexto:{color:C.secundario,fontSize:10,fontWeight:'700'},opcaoTextoAtivo:{color:C.branco},
  assinaturaRegistrada:{flexDirection:'row',alignItems:'center',gap:12,borderWidth:1,borderColor:'#A7F3D0',backgroundColor:'#ECFDF5',borderRadius:14,padding:15,marginBottom:12},assinaturaTitulo:{color:C.verde,fontSize:13,fontWeight:'900'},assinaturaMeta:{color:C.secundario,fontSize:10,marginTop:2},assinaturaHash:{color:C.verde,fontSize:9,fontFamily:'monospace',marginTop:4},acoesProcesso:{marginBottom:30},
  salvarBtn:{minHeight:50,borderRadius:12,backgroundColor:C.azul,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},salvarTexto:{color:C.branco,fontSize:13,fontWeight:'900'},tramitacaoTituloLinha:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:20,marginBottom:9},tramitacaoTitulo:{color:C.texto,fontSize:13,fontWeight:'900'},tramitacaoSub:{color:C.secundario,fontSize:9},tramitacaoAcoes:{flexDirection:'row',gap:9},acaoSecundaria:{flex:1,minHeight:48,borderRadius:11,borderWidth:1,borderColor:C.borda,backgroundColor:C.branco,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,paddingHorizontal:8},acaoSecundariaTexto:{color:C.azul,fontSize:10,fontWeight:'800',textAlign:'center'},
  assinarBtn:{minHeight:51,borderRadius:12,backgroundColor:C.roxo,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:10},assinarTexto:{color:C.branco,fontSize:13,fontWeight:'900'},somenteLeitura:{flexDirection:'row',alignItems:'center',gap:8,backgroundColor:C.azulClaro,borderRadius:12,padding:14,marginBottom:20},somenteLeituraTexto:{flex:1,color:C.azulEscuro,fontSize:11,lineHeight:16},
  confirmacaoFundo:{flex:1,backgroundColor:'#0F172A99',justifyContent:'center',padding:18},confirmacaoCard:{width:'100%',maxWidth:480,alignSelf:'center',backgroundColor:C.branco,borderRadius:20,padding:22,alignItems:'center'},assinaturaIcone:{width:66,height:66,borderRadius:33,backgroundColor:'#F3E8FF',alignItems:'center',justifyContent:'center'},confirmacaoTitulo:{color:C.texto,fontSize:20,fontWeight:'900',marginTop:14},confirmacaoTexto:{color:C.secundario,fontSize:12,lineHeight:18,textAlign:'center',marginTop:6},
  signatario:{width:'100%',backgroundColor:C.fundo,borderRadius:12,padding:14,marginTop:16},signatarioLabel:{color:C.roxo,fontSize:9,fontWeight:'900',letterSpacing:.8},signatarioNome:{color:C.texto,fontSize:15,fontWeight:'900',marginTop:4},signatarioMeta:{color:C.secundario,fontSize:10,marginTop:2},confirmacaoAviso:{color:C.secundario,fontSize:10,lineHeight:15,textAlign:'center',marginTop:14},assinarConfirmar:{width:'100%',minHeight:50,backgroundColor:C.roxo,borderRadius:12,alignItems:'center',justifyContent:'center',marginTop:16},assinarConfirmarTexto:{color:C.branco,fontSize:13,fontWeight:'900'},cancelar:{padding:12,marginTop:4},cancelarTexto:{color:C.secundario,fontSize:12,fontWeight:'700'},
});
