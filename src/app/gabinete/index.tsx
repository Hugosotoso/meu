/**
 * Super App Gov — Módulo Gabinete
 * Tela: src/app/gabinete/index.tsx
 */
import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, StatusBar, SafeAreaView, Platform, Alert, Modal
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

// ─── PALETA ───────────────────────────────────────────────────────────────────
const C = {
  azul: '#1351B4', azulEscuro: '#0C3789', azulClaro: '#E8EEFA',
  amarelo: '#FFCD00', branco: '#FFFFFF', fundo: '#F2F5F8',
  cinzaTexto: '#555770', cinzaMedio: '#9EA3B0', cinzaBorda: '#D9DDE8',
  vermelho: '#ef4444', vermelhoClaro: '#FEF2F2',
  amareloOrange: '#f59e0b', amareloOrangeClaro: '#FFFBEB',
  verde: '#10b981', verdeClaro: '#ECFDF5',
  roxo: '#7E22CE'
};

// ─── DATAS ────────────────────────────────────────────────────────────────────
const hoje = new Date();
hoje.setHours(0, 0, 0, 0);
const amanha = new Date(hoje);
amanha.setDate(amanha.getDate() + 1);

function parseData(str: string) {
  if (!str) return new Date();
  const [d, m, a] = str.split('/').map(Number);
  return new Date(a, m - 1, d);
}

function statusPrazo(dataStr: string) {
  if (!dataStr) return 'futuro';
  const d = parseData(dataStr);
  d.setHours(0, 0, 0, 0);
  if (d.getTime() === hoje.getTime()) return 'hoje';
  if (d.getTime() === amanha.getTime()) return 'amanha';
  return 'futuro';
}

// ─── DADOS INICIAIS ───────────────────────────────────────────────────────────
const DADOS_INICIAIS = [
  {
    id: '001',
    numero: 'OF.GAB-001/2026',
    orgao: 'TJAC',
    orgaoNome: 'Tribunal de Justiça do Acre',
    assunto: 'Solicitação de informações sobre servidores',
    vencimento: '20/06/2026',
    responsavel: 'André (Gabinete)',
    tipo: 'Requisição',
    status: 'andamento'
  }
];

const STATUS_CONFIG: any = {
  hoje:      { cor: C.vermelho,      corClaro: C.vermelhoClaro,      label: 'Vence Hoje',   icone: 'warning'       },
  amanha:    { cor: C.amareloOrange, corClaro: C.amareloOrangeClaro, label: 'Vence Amanhã', icone: 'schedule'      },
  futuro:    { cor: C.verde,         corClaro: C.verdeClaro,         label: 'No Prazo',     icone: 'check-circle'  },
  finalizado:{ cor: C.cinzaMedio,    corClaro: C.cinzaBorda,         label: 'Arquivado',    icone: 'inventory'     }
};

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS DE RESILIÊNCIA E REDE
// ─────────────────────────────────────────────────────────────────────────────
async function fetchComTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      throw new Error(`Timeout: a requisição para ${url} excedeu ${ms}ms`);
    }
    throw err;
  }
}

async function resolverIPPublico(): Promise<string> {
  const provedores = [
    { url: 'https://api.ipify.org?format=json',    extrator: (d: any) => d.ip },
    { url: 'https://api64.ipify.org?format=json',  extrator: (d: any) => d.ip },
    { url: 'https://api.my-ip.io/v2/ip.json',      extrator: (d: any) => d.ip },
  ];

  for (const provedor of provedores) {
    try {
      const res = await fetchComTimeout(provedor.url, 4000);
      if (!res.ok) continue;
      const dados = await res.json();
      const ip = provedor.extrator(dados);
      if (ip && typeof ip === 'string' && ip.trim().length > 0) return ip.trim();
    } catch (_) {
      continue;
    }
  }
  return 'IP Indisponível';
}

async function comRetry<T>(operacao: () => Promise<T>, tentativas = 3, delayBase = 600): Promise<T> {
  let ultimoErro: Error = new Error('Operação falhou');
  for (let i = 0; i < tentativas; i++) {
    try {
      return await operacao();
    } catch (err: any) {
      ultimoErro = err;
      if (i < tentativas - 1) {
        await new Promise(resolve => setTimeout(resolve, delayBase * Math.pow(2, i)));
      }
    }
  }
  throw ultimoErro;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: CartaoOficio
// ─────────────────────────────────────────────────────────────────────────────
const CartaoOficio = ({ item }: { item: any }) => {
  const isFinalizado = item.status === 'finalizado';
  const status = isFinalizado ? 'finalizado' : statusPrazo(item.vencimento);
  const cfg = STATUS_CONFIG[status];

  return (
    <View style={[styles.card, { borderLeftColor: cfg.cor, opacity: isFinalizado ? 0.7 : 1 }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.orgaoChip, isFinalizado && { backgroundColor: C.cinzaBorda }]}>
          <Text style={[styles.orgaoChipText, isFinalizado && { color: C.cinzaTexto }]}>{item.orgao}</Text>
        </View>
        <View style={[styles.statusTag, { backgroundColor: cfg.corClaro }]}>
          <MaterialIcons name={cfg.icone} size={11} color={cfg.cor} />
          <Text style={[styles.statusTagText, { color: cfg.cor }]}>{cfg.label}</Text>
        </View>
      </View>
      <Text style={[styles.cardNumero, isFinalizado && { textDecorationLine: 'line-through', color: C.cinzaMedio }]}>
        {item.numero}
      </Text>
      <Text style={styles.cardOrgaoNome}>{item.orgaoNome}</Text>
      <Text style={styles.cardAssunto} numberOfLines={2}>{item.assunto}</Text>
      <View style={styles.cardRodape}>
        <View style={styles.cardRodapeItem}>
          <MaterialIcons name="event" size={13} color={cfg.cor} />
          <Text style={[styles.cardRodapeText, { color: cfg.cor, fontWeight: '600' }]}>{item.vencimento}</Text>
        </View>
        <View style={styles.cardRodapeSep} />
        <View style={styles.cardRodapeItem}>
          <MaterialIcons name="person" size={13} color={C.cinzaMedio} />
          <Text style={styles.cardRodapeText} numberOfLines={1}>{item.responsavel}</Text>
        </View>
        <View style={styles.cardRodapeSep} />
        <View style={styles.tipoTag}>
          <Text style={styles.tipoTagText}>{item.tipo}</Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TELA PRINCIPAL: Gabinete
// ─────────────────────────────────────────────────────────────────────────────
export default function Gabinete() {
  const router = useRouter();
  const { nome, nivel_acesso } = useLocalSearchParams();
  const [busca, setBusca] = useState('');
  const [bancoDeProcessos, setBancoDeProcessos] = useState<any[]>(DADOS_INICIAIS);
  const [usuarioLogado, setUsuarioLogado] = useState(String(nome || 'Servidor'));
  const [abaAtiva, setAbaAtiva] = useState('andamento');
  const MASTER_CPF = '123.456.789-09';

  const possuiPermissaoGabinete = String(nivel_acesso || '').toUpperCase() === 'DIAMANTE';
  
  const [modalVisivel, setModalVisivel] = useState(false);
  const [processoEditando, setProcessoEditando] = useState<any>(null);
  const [form, setForm] = useState({ orgao: '', assunto: '', tipo: '', vencimento: '' });

  const [modoAssinatura, setModoAssinatura] = useState(false);
  const [cpfAssinatura, setCpfAssinatura] = useState('');
  const [tentativasAssinatura, setTentativasAssinatura] = useState(0);
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);

  useEffect(() => {
    setUsuarioLogado(String(nome || 'Servidor'));
    buscarProcessosDoSupabase();
  }, [nome]);

  const buscarProcessosDoSupabase = async () => {
    try {
      const data = await comRetry(async () => {
        const { data: resData, error } = await supabase
          .from('oficios')
          .select('*')
          .order('id', { ascending: false });
        if (error) throw new Error(error.message);
        return resData;
      }, 3, 500);

      if (data && data.length > 0) {
        setBancoDeProcessos(data);
      } else {
        setBancoDeProcessos(DADOS_INICIAIS);
      }
    } catch {
      setBancoDeProcessos(DADOS_INICIAIS);
    }
  };

  const aplicarMascaraData = (texto: string) => {
    let t = texto.replace(/\D/g, '');
    if (t.length > 2) t = t.replace(/^(\d{2})(\d)/, '$1/$2');
    if (t.length > 5) t = t.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setForm({ ...form, vencimento: t.substring(0, 10) });
  };

  const aplicarMascaraCPF = (texto: string) => {
    let v = texto.replace(/\D/g, '');
    if (v.length > 3) v = v.replace(/^(\d{3})(\d)/, '$1.$2');
    if (v.length > 6) v = v.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3');
    if (v.length > 9) v = v.replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    setCpfAssinatura(v.substring(0, 14));
  };

  const abrirParaCriacao = () => {
    setProcessoEditando(null);
    setModoAssinatura(false);
    setForm({
      orgao: '',
      assunto: '',
      tipo: '',
      vencimento: ''
    });
    setModalVisivel(true);
  };

  const abrirParaEdicao = (item: any) => {
    if (!possuiPermissaoGabinete) {
      Alert.alert(
        'Visualização',
        'Você possui acesso somente para consulta.'
      );
    }

    setProcessoEditando(item);
    setModoAssinatura(false);

    setForm({
      orgao: item?.orgao ?? '',
      assunto: item?.assunto ?? '',
      tipo: item?.tipo ?? '',
      vencimento: item?.vencimento ?? ''
    });

    setModalVisivel(true);
  };

  const salvarOuAtualizarProcesso = async () => {
    // CORREÇÃO 2: Faltava o return para impedir o código de continuar executando!
    if (!possuiPermissaoGabinete) {
      Alert.alert(
        'Acesso Negado',
        'Somente o servidor autorizado pode criar ou editar processos.'
      );
      return; 
    }

    const dataRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[012])\/(20\d\d)$/;
    if (!dataRegex.test(form.vencimento)) {
      Alert.alert('Data Inválida', 'A data do prazo deve estar no formato correto: DD/MM/AAAA (ex: 15/10/2026).');
      return;
    }

    if (processoEditando) {
      try {
        await comRetry(async () => {
          const { error } = await supabase
            .from('oficios')
            .update({ orgao: form.orgao, assunto: form.assunto, tipo: form.tipo, vencimento: form.vencimento })
            .eq('id', processoEditando.id);
          if (error) throw new Error(error.message);
        });
        Alert.alert('Sucesso', 'Registro atualizado.');
        buscarProcessosDoSupabase();
      } catch (e: any) {
        Alert.alert('Erro de Conexão', e.message ?? 'Não foi possível comunicar com o servidor.');
      }
    } else {
      const novoItem = {
        numero: `OF.GAB-${Math.floor(Math.random() * 900) + 100}/2026`,
        orgao: form.orgao.toUpperCase(),
        orgaoNome: 'Autuado via Mobile',
        assunto: form.assunto,
        vencimento: form.vencimento,
        responsavel: usuarioLogado,
        tipo: form.tipo,
        status: 'andamento'
      };
      try {
        await comRetry(async () => {
          const { error } = await supabase.from('oficios').insert([novoItem]);
          if (error) throw new Error(error.message);
        });
        Alert.alert('Sucesso', 'Novo processo registrado.');
        buscarProcessosDoSupabase();
      } catch (e: any) {
        Alert.alert('Erro de Conexão', e.message ?? 'Não foi possível comunicar com o servidor.');
      }
    }
    setModalVisivel(false);
  };

  const arquivarProcesso = async () => {
    if (bloqueadoAte !== null) {
      const agora = Date.now();
      if (agora < bloqueadoAte) {
        const minutosRestantes = Math.ceil((bloqueadoAte - agora) / 60000);
        Alert.alert('Bloqueio de Segurança', `Operação suspensa. Tente novamente em ${minutosRestantes} minuto(s).`);
        return;
      }
      setBloqueadoAte(null);
      setTentativasAssinatura(0);
    }

    if (cpfAssinatura.length !== 14) {
      Alert.alert('Validação', 'O CPF deve ter 11 dígitos.');
      return;
    }

    if (cpfAssinatura !== MASTER_CPF) {
      const ip = await resolverIPPublico();
      const novasTentativas = tentativasAssinatura + 1;
      setTentativasAssinatura(novasTentativas);

      if (novasTentativas >= 3) {
        setBloqueadoAte(Date.now() + 5 * 60 * 1000);
        Alert.alert(
          'Acesso Bloqueado',
          `Tentativas excedidas.\nIP: ${ip}\nBloqueado por 5 minutos.`
        );
        return;
      }

      Alert.alert(
        'Falha na Autenticação',
        `CPF inválido. Tentativas restantes: ${3 - novasTentativas}`
      );
      return;
    }

    const ipDispositivo = await resolverIPPublico();
    setTentativasAssinatura(0);

    try {
      const trilhaAuditoria =
        `[Assinado] CPF: ${cpfAssinatura}` +
        ` | IP: ${ipDispositivo}` +
        ` | Autor: ${usuarioLogado}` +
        ` | Data: ${new Date().toISOString()}`;

      await comRetry(async () => {
        const { error } = await supabase
          .from('oficios')
          .update({ status: 'finalizado', responsavel: trilhaAuditoria })
          .eq('id', processoEditando.id);
        if (error) throw new Error(error.message);
      }, 3, 800);

      Alert.alert('Sucesso', 'Processo assinado eletronicamente pelo Gabinete.');
      await buscarProcessosDoSupabase();
      setModalVisivel(false);
      setModoAssinatura(false);
      setCpfAssinatura('');
    } catch (e: any) {
      Alert.alert('Erro', 'Falha ao gravar no banco. Tente novamente.');
    }
  };

  const oficiosFiltrados = useMemo(() => {
    const termo = busca.toLowerCase().trim();
    const bancoSeguro = Array.isArray(bancoDeProcessos) ? bancoDeProcessos : [];

    let listaAba = bancoSeguro.filter((o: any) => {
      if (!o) return false;
      if (abaAtiva === 'andamento') return o.status !== 'finalizado';
      return o.status === 'finalizado';
    });

    if (!termo) return listaAba;
    
    return listaAba.filter((o: any) => 
      (o?.orgao   || '').toLowerCase().includes(termo) || 
      (o?.numero  || '').toLowerCase().includes(termo) || 
      (o?.assunto || '').toLowerCase().includes(termo)
    );
  }, [busca, bancoDeProcessos, abaAtiva]);

  const pedirAssinatura = () => {
    if (bloqueadoAte && Date.now() < bloqueadoAte) {
      const minutosRestantes = Math.ceil((bloqueadoAte - Date.now()) / 60000);
      Alert.alert('Bloqueio de Segurança', `Operação suspensa. Tente novamente em ${minutosRestantes} minuto(s).`);
      return;
    }
    setModoAssinatura(true);
  };

  const temPermissaoDeEdicao = possuiPermissaoGabinete;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.azul} />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.voltarBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <MaterialIcons name="arrow-back-ios" size={18} color={C.branco} style={{ paddingLeft: 5 }} />
          </TouchableOpacity>
          <View style={styles.headerTitulos}>
            <Text style={styles.headerSuper}>gov<Text style={{ color: C.amarelo }}>.</Text>br</Text>
            <Text style={styles.headerTitulo}>Gabinete</Text>
          </View>
        </View>
        <View style={styles.buscaContainer}>
          <MaterialIcons name="search" size={20} color={C.cinzaMedio} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.buscaInput}
            placeholder="Buscar processo..."
            placeholderTextColor={C.cinzaMedio}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      <View style={styles.abasContainer}>
        <TouchableOpacity
          style={[styles.abaBtn, abaAtiva === 'andamento' && styles.abaBtnAtiva]}
          onPress={() => setAbaAtiva('andamento')}
        >
          <MaterialCommunityIcons
            name="file-document-outline"
            size={18}
            color={abaAtiva === 'andamento' ? C.azul : C.cinzaMedio}
          />
          <Text style={[styles.abaTexto, abaAtiva === 'andamento' && styles.abaTextoAtiva]}>Em Andamento</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.abaBtn, abaAtiva === 'finalizados' && styles.abaBtnAtiva]}
          onPress={() => setAbaAtiva('finalizados')}
        >
          <MaterialIcons
            name="inventory"
            size={18}
            color={abaAtiva === 'finalizados' ? C.azul : C.cinzaMedio}
          />
          <Text style={[styles.abaTexto, abaAtiva === 'finalizados' && styles.abaTextoAtiva]}>Finalizados</Text>
        </TouchableOpacity>
      </View>

      {abaAtiva === 'andamento' && (
        <TouchableOpacity style={styles.btnIA} onPress={() => router.push('/gabinete/ia')}>
          <MaterialCommunityIcons name="robot-outline" size={24} color="#FFFFFF" style={{ marginRight: 10 }} />
          <Text style={styles.btnIAText}>Analisar Processos</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={oficiosFiltrados || []}
        keyExtractor={(item) => (item?.id ? item.id.toString() : Math.random().toString())}
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.8} onPress={() => abrirParaEdicao(item)}>
            <CartaoOficio item={item} />
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, paddingTop: 4 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={() => (
          <Text style={{ textAlign: 'center', marginTop: 30, color: C.cinzaMedio }}>
            Nenhum registro encontrado.
          </Text>
        )}
      />

      {abaAtiva === 'andamento' && temPermissaoDeEdicao && (
        <TouchableOpacity style={styles.fab} onPress={abrirParaCriacao} activeOpacity={0.9}>
          <MaterialIcons name="add" size={32} color={C.branco} />
        </TouchableOpacity>
      )}

      <Modal visible={modalVisivel} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>

            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modoAssinatura
                  ? 'Autenticação Mestra'
                  : processoEditando
                    ? (processoEditando.status === 'finalizado' ? 'Auditoria do Processo' : 'Detalhes do Processo')
                    : 'Novo Processo'}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisivel(false); setModoAssinatura(false); }}>
                <MaterialIcons name="close" size={24} color={C.cinzaTexto} />
              </TouchableOpacity>
            </View>

            {modoAssinatura ? (
              <View style={styles.assinaturaBox}>
                <MaterialIcons name="admin-panel-settings" size={50} color={C.azul} style={{ alignSelf: 'center', marginBottom: 15 }} />
                <Text style={{ textAlign: 'center', fontSize: 14, color: C.cinzaTexto, marginBottom: 20 }}>
                  Informe a credencial para confirmar a operação. O IP será registrado para fins de auditoria.
                </Text>

                <Text style={styles.inputLabel}>CPF Autorizado</Text>
                <TextInput
                  style={[styles.input, { fontSize: 18, textAlign: 'center', letterSpacing: 2 }]}
                  placeholder="000.000.000-00"
                  value={cpfAssinatura}
                  onChangeText={aplicarMascaraCPF}
                  maxLength={14}
                  keyboardType="numeric"
                />

                <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: C.azul, marginTop: 20 }]} onPress={arquivarProcesso}>
                  <Text style={styles.btnSalvarTxt}>Confirmar e Finalizar</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setModoAssinatura(false)}>
                  <Text style={{ color: C.vermelho, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>
              </View>

            ) : (
              <View>
                <Text style={styles.inputLabel}>Sigla do Órgão</Text>
                <TextInput
                  style={styles.input}
                  value={form.orgao}
                  onChangeText={(t) => setForm({ ...form, orgao: t })}
                  maxLength={10}
                  editable={temPermissaoDeEdicao && (!processoEditando || processoEditando.status !== 'finalizado')}
                />

                <Text style={styles.inputLabel}>Tipo de Documento</Text>
                <TextInput
                  style={styles.input}
                  value={form.tipo}
                  onChangeText={(t) => setForm({ ...form, tipo: t })}
                  editable={temPermissaoDeEdicao && (!processoEditando || processoEditando.status !== 'finalizado')}
                />

                <Text style={styles.inputLabel}>Resumo</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  value={form.assunto}
                  onChangeText={(t) => setForm({ ...form, assunto: t })}
                  multiline={true}
                  editable={temPermissaoDeEdicao && (!processoEditando || processoEditando.status !== 'finalizado')}
                />

                <Text style={styles.inputLabel}>Prazo Previsto</Text>
                <TextInput
                  style={styles.input}
                  value={form.vencimento}
                  onChangeText={aplicarMascaraData}
                  maxLength={10}
                  keyboardType="numeric"
                  editable={temPermissaoDeEdicao && (!processoEditando || processoEditando.status !== 'finalizado')}
                />

                {(!processoEditando || processoEditando.status !== 'finalizado') ? (
                  <>
                    {temPermissaoDeEdicao ? (
                      <>
                        <TouchableOpacity style={styles.btnSalvar} onPress={salvarOuAtualizarProcesso}>
                          <Text style={styles.btnSalvarTxt}>
                            {processoEditando ? 'Salvar Alterações' : 'Confirmar Inserção'}
                          </Text>
                        </TouchableOpacity>

                        {processoEditando && (
                          <TouchableOpacity style={styles.btnFinalizar} onPress={pedirAssinatura}>
                            <MaterialIcons name="how-to-reg" size={20} color={C.branco} style={{ marginRight: 8 }} />
                            <Text style={styles.btnSalvarTxt}>Assinatura Eletrônica</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <View style={{ backgroundColor: C.vermelhoClaro, padding: 15, borderRadius: 10, marginTop: 20 }}>
                        <Text style={{ fontWeight: 'bold', color: C.vermelho, marginBottom: 5 }}>🛑 Acesso Restrito</Text>
                        <Text style={{ fontSize: 12, color: C.vermelho }}>
                          Você não tem permissão. Apenas o criador do processo ou a Chefia de Gabinete podem alterar este ofício.
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <View style={{ backgroundColor: '#1e293b', padding: 15, borderRadius: 10, marginTop: 20 }}>
                    <Text style={{ fontWeight: 'bold', color: C.verde, marginBottom: 5 }}>Status: Finalizado</Text>
                    <Text style={{ fontSize: 12, color: '#94a3b8' }}>
                      Este registro encontra-se selado. Modificações adicionais estão restritas por diretrizes de auditoria.
                    </Text>
                  </View>
                )}
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.fundo },
  header: { backgroundColor: C.azul, paddingTop: Platform.OS === 'android' ? 16 : 8, paddingBottom: 16, paddingHorizontal: 16, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  voltarBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerTitulos: { flex: 1 },
  headerSuper: { fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: '600' },
  headerTitulo: { fontSize: 22, fontWeight: '800', color: C.branco },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.branco, borderRadius: 12, height: 46 },
  buscaInput: { flex: 1, fontSize: 14, color: '#333', paddingLeft: 8, height: '100%' },
  abasContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 15, marginBottom: 5, backgroundColor: '#E4E9F2', borderRadius: 10, padding: 4 },
  abaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 6 },
  abaBtnAtiva: { backgroundColor: C.branco, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  abaTexto: { fontSize: 13, fontWeight: '600', color: C.cinzaMedio },
  abaTextoAtiva: { color: C.azul },
  btnIA: { backgroundColor: C.roxo, marginHorizontal: 16, marginBottom: 15, padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  btnIAText: { color: C.branco, fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: C.branco, borderRadius: 13, padding: 14, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orgaoChip: { backgroundColor: C.azulClaro, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  orgaoChipText: { fontSize: 12, fontWeight: '800', color: C.azul },
  statusTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, gap: 4 },
  statusTagText: { fontSize: 10, fontWeight: '700' },
  cardNumero: { fontSize: 13, fontWeight: '700', color: '#333', marginBottom: 2 },
  cardOrgaoNome: { fontSize: 11, color: C.cinzaMedio, marginBottom: 6 },
  cardAssunto: { fontSize: 13, color: C.cinzaTexto, lineHeight: 19, marginBottom: 10 },
  cardRodape: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, borderTopWidth: 1, borderTopColor: C.cinzaBorda, paddingTop: 8 },
  cardRodapeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 }, cardRodapeText: { fontSize: 11, color: C.cinzaMedio },
  cardRodapeSep: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.cinzaBorda },
  tipoTag: { backgroundColor: C.fundo, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 }, tipoTagText: { fontSize: 10, color: C.cinzaMedio },
  fab: { position: 'absolute', right: 20, bottom: 30, backgroundColor: C.azul, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.branco, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, minHeight: 400, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.azulEscuro },
  inputLabel: { fontSize: 12, fontWeight: '700', color: C.cinzaTexto, marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: C.fundo, borderWidth: 1, borderColor: C.cinzaBorda, borderRadius: 10, padding: 12, fontSize: 14, color: '#333' },
  btnSalvar: { backgroundColor: C.verde, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 25 },
  btnFinalizar: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center' },
  btnSalvarTxt: { color: C.branco, fontWeight: '700', fontSize: 16 },
  assinaturaBox: { backgroundColor: C.azulClaro, padding: 20, borderRadius: 16, marginTop: 10 }
});
