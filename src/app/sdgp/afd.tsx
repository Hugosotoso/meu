/**
 * Super App Gov — Módulo Assentamento Funcional Digital (AFD)
 * Arquivo: src/app/sdgp/afd.tsx
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';

const GOV_COLORS = {
  azulPrincipal: '#1351B4',
  azulEscuro: '#0C3789',
  branco: '#FFFFFF',
  cinzaFundo: '#F0F2F5',
  cinzaTexto: '#64748B',
  texto: '#1E293B',
  borda: '#E2E8F0',
  destaque: '#EFF6FF',
  verde: '#047857',
  verdeFundo: '#ECFDF5',
  fundoModal: '#0F172A99',
};

type RegistroAFD = {
  id: string;
  data: string;
  evento: string;
  categoria: string;
  origem: string;
  baseLegal: string;
  descricao: string;
  status: string;
  url: string | null;
};

const HISTORICO_AFD: RegistroAFD[] = [
  {
    id: 'afd-2026-001',
    data: '15/03/2026',
    evento: 'Progressão Funcional',
    categoria: 'Desenvolvimento na carreira',
    origem: 'Gestão de Pessoas / SIAPE',
    baseLegal: 'Lei nº 8.112/1990 e regras específicas da carreira',
    descricao:
      'Registro demonstrativo de progressão funcional decorrente do cumprimento dos requisitos de desenvolvimento na carreira.',
    status: 'Registrado',
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8112cons.htm',
  },
  {
    id: 'afd-2025-002',
    data: '10/01/2025',
    evento: 'Adicional de Qualificação',
    categoria: 'Vantagem funcional',
    origem: 'Unidade de Gestão de Pessoas',
    baseLegal: 'Normas da carreira e ato administrativo de concessão',
    descricao:
      'Registro demonstrativo de vantagem funcional relacionada à qualificação apresentada pelo servidor.',
    status: 'Registrado',
    url: 'https://www.gov.br/servidor/pt-br',
  },
  {
    id: 'afd-2023-003',
    data: '05/02/2023',
    evento: 'Nomeação — Cargo Efetivo',
    categoria: 'Ingresso no serviço público',
    origem: 'Diário Oficial da União',
    baseLegal: 'Ato de nomeação publicado no Diário Oficial da União',
    descricao:
      'Registro demonstrativo do ato de nomeação para cargo público efetivo.',
    status: 'Registrado',
    url: 'https://www.in.gov.br/',
  },
];

export default function AfdScreen() {
  const router = useRouter();

  const [selecionado, setSelecionado] = useState<RegistroAFD | null>(null);
  const [abrindoDocumento, setAbrindoDocumento] = useState(false);

  const abrirFonteOficial = async (url: string | null) => {
    if (!url) {
      Alert.alert(
        'Fonte indisponível',
        'Este registro ainda não possui uma fonte oficial cadastrada.',
      );
      return;
    }

    try {
      setAbrindoDocumento(true);

      const podeAbrir = await Linking.canOpenURL(url);

      if (!podeAbrir) {
        Alert.alert(
          'Link indisponível',
          'Não foi possível reconhecer o endereço da fonte oficial.',
        );
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(
        'Erro',
        'Não foi possível abrir a fonte oficial neste dispositivo.',
      );
    } finally {
      setAbrindoDocumento(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.voltar}
          accessibilityLabel="Voltar"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={GOV_COLORS.branco}
          />
        </TouchableOpacity>

        <View style={styles.headerTexto}>
          <Text style={styles.headerTitle}>Assentamento Digital</Text>
          <Text style={styles.headerSubtitulo}>
            Histórico funcional — AFD
          </Text>
        </View>

        <MaterialCommunityIcons
          name="file-document-check-outline"
          size={26}
          color={GOV_COLORS.branco}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.cardInfo}>
          <MaterialIcons
            name="info-outline"
            size={22}
            color={GOV_COLORS.azulPrincipal}
          />

          <View style={styles.cardInfoTexto}>
            <Text style={styles.infoTitulo}>Vida funcional consolidada</Text>

            <Text style={styles.infoTxt}>
              Consulte os principais registros funcionais e suas fontes de
              referência. A confirmação oficial deve ser realizada no AFD,
              SIAPE ou na unidade de Gestão de Pessoas.
            </Text>
          </View>
        </View>

        <View style={styles.resumo}>
          <View>
            <Text style={styles.resumoLabel}>REGISTROS LOCALIZADOS</Text>
            <Text style={styles.resumoValor}>{HISTORICO_AFD.length}</Text>
          </View>

          <View style={styles.resumoIcone}>
            <MaterialIcons
              name="history"
              size={24}
              color={GOV_COLORS.azulPrincipal}
            />
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Linha do tempo funcional</Text>

        {HISTORICO_AFD.map((item) => (
          <View key={item.id} style={styles.itemEvento}>
            <View style={styles.linhaData}>
              <View style={styles.bolinha} />

              <Text style={styles.dataTxt}>{item.data}</Text>

              <View style={styles.statusTag}>
                <MaterialIcons
                  name="check-circle"
                  size={13}
                  color={GOV_COLORS.verde}
                />
                <Text style={styles.statusTxt}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.eventoConteudo}>
              <View style={styles.eventoCabecalho}>
                <View style={styles.eventoIcone}>
                  <MaterialCommunityIcons
                    name="file-document-outline"
                    size={21}
                    color={GOV_COLORS.azulPrincipal}
                  />
                </View>

                <View style={styles.eventoTextos}>
                  <Text style={styles.eventoTitulo}>{item.evento}</Text>
                  <Text style={styles.categoriaTxt}>{item.categoria}</Text>
                </View>
              </View>

              <View style={styles.origemLinha}>
                <MaterialIcons
                  name="account-balance"
                  size={16}
                  color={GOV_COLORS.cinzaTexto}
                />
                <Text style={styles.origemTxt}>{item.origem}</Text>
              </View>

              <TouchableOpacity
                style={styles.btnVer}
                onPress={() => setSelecionado(item)}
                accessibilityLabel={`Ver detalhes de ${item.evento}`}
              >
                <MaterialIcons
                  name="visibility"
                  size={17}
                  color={GOV_COLORS.azulPrincipal}
                />
                <Text style={styles.btnVerTxt}>Ver detalhes</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={styles.avisoFinal}>
          <MaterialIcons
            name="verified-user"
            size={19}
            color={GOV_COLORS.azulEscuro}
          />

          <Text style={styles.avisoFinalTxt}>
            Os registros apresentados fazem parte do protótipo. Documentos e
            dados oficiais devem ser confirmados nos sistemas institucionais.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(selecionado)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelecionado(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIcone}>
                <MaterialCommunityIcons
                  name="file-document-check-outline"
                  size={25}
                  color={GOV_COLORS.azulPrincipal}
                />
              </View>

              <View style={styles.modalHeaderTexto}>
                <Text style={styles.modalSuperTitulo}>REGISTRO FUNCIONAL</Text>
                <Text style={styles.modalTitulo}>{selecionado?.evento}</Text>
              </View>

              <TouchableOpacity
                onPress={() => setSelecionado(null)}
                style={styles.fechar}
                accessibilityLabel="Fechar detalhes"
              >
                <MaterialIcons
                  name="close"
                  size={21}
                  color={GOV_COLORS.texto}
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalStatusLinha}>
                <View style={styles.statusTag}>
                  <MaterialIcons
                    name="check-circle"
                    size={13}
                    color={GOV_COLORS.verde}
                  />
                  <Text style={styles.statusTxt}>
                    {selecionado?.status}
                  </Text>
                </View>

                <Text style={styles.modalData}>{selecionado?.data}</Text>
              </View>

              <Text style={styles.detalheLabel}>Categoria</Text>
              <Text style={styles.detalheValor}>
                {selecionado?.categoria}
              </Text>

              <Text style={styles.detalheLabel}>Origem do registro</Text>
              <Text style={styles.detalheValor}>{selecionado?.origem}</Text>

              <Text style={styles.detalheLabel}>Base de referência</Text>
              <Text style={styles.detalheValor}>
                {selecionado?.baseLegal}
              </Text>

              <Text style={styles.detalheLabel}>Descrição</Text>
              <Text style={styles.descricaoTxt}>
                {selecionado?.descricao}
              </Text>

              <View style={styles.fonteAviso}>
                <MaterialIcons
                  name="open-in-new"
                  size={18}
                  color={GOV_COLORS.azulPrincipal}
                />

                <Text style={styles.fonteAvisoTxt}>
                  O botão abaixo abre uma fonte institucional de referência. Ele
                  não representa o documento individual do servidor.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.btnFonte,
                abrindoDocumento && styles.btnFonteDesativado,
              ]}
              disabled={abrindoDocumento}
              onPress={() =>
                abrirFonteOficial(selecionado?.url ?? null)
              }
            >
              {abrindoDocumento ? (
                <ActivityIndicator color={GOV_COLORS.branco} />
              ) : (
                <>
                  <MaterialIcons
                    name="launch"
                    size={19}
                    color={GOV_COLORS.branco}
                  />
                  <Text style={styles.btnFonteTxt}>
                    Abrir fonte oficial
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GOV_COLORS.cinzaFundo,
  },

  header: {
    minHeight: 70,
    backgroundColor: GOV_COLORS.azulPrincipal,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },

  voltar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FFFFFF18',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTexto: {
    flex: 1,
  },

  headerTitle: {
    color: GOV_COLORS.branco,
    fontWeight: '800',
    fontSize: 18,
  },

  headerSubtitulo: {
    color: '#FFFFFFB8',
    fontSize: 11,
    marginTop: 2,
  },

  scrollContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 16,
    paddingBottom: 50,
  },

  cardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    backgroundColor: GOV_COLORS.destaque,
    padding: 15,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },

  cardInfoTexto: {
    flex: 1,
  },

  infoTitulo: {
    color: GOV_COLORS.azulEscuro,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },

  infoTxt: {
    fontSize: 12,
    color: GOV_COLORS.azulEscuro,
    lineHeight: 18,
  },

  resumo: {
    backgroundColor: GOV_COLORS.branco,
    borderWidth: 1,
    borderColor: GOV_COLORS.borda,
    borderRadius: 14,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  resumoLabel: {
    color: GOV_COLORS.cinzaTexto,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },

  resumoValor: {
    color: GOV_COLORS.texto,
    fontSize: 25,
    fontWeight: '900',
    marginTop: 3,
  },

  resumoIcone: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: GOV_COLORS.destaque,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secaoTitulo: {
    color: GOV_COLORS.texto,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 13,
  },

  itemEvento: {
    marginLeft: 9,
    borderLeftWidth: 2,
    borderColor: GOV_COLORS.borda,
    paddingLeft: 20,
    paddingBottom: 22,
  },

  linhaData: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
  },

  bolinha: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: GOV_COLORS.azulPrincipal,
    borderWidth: 2,
    borderColor: GOV_COLORS.cinzaFundo,
    position: 'absolute',
    left: -26,
  },

  dataTxt: {
    flex: 1,
    fontWeight: '800',
    color: GOV_COLORS.cinzaTexto,
    fontSize: 12,
  },

  statusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: GOV_COLORS.verdeFundo,
  },

  statusTxt: {
    color: GOV_COLORS.verde,
    fontSize: 10,
    fontWeight: '800',
  },

  eventoConteudo: {
    backgroundColor: GOV_COLORS.branco,
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: GOV_COLORS.borda,
  },

  eventoCabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  eventoIcone: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: GOV_COLORS.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  eventoTextos: {
    flex: 1,
  },

  eventoTitulo: {
    color: GOV_COLORS.texto,
    fontSize: 14,
    fontWeight: '800',
  },

  categoriaTxt: {
    color: GOV_COLORS.cinzaTexto,
    fontSize: 11,
    marginTop: 3,
  },

  origemLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 13,
  },

  origemTxt: {
    flex: 1,
    color: GOV_COLORS.cinzaTexto,
    fontSize: 11,
  },

  btnVer: {
    minHeight: 40,
    marginTop: 14,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: GOV_COLORS.destaque,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  btnVerTxt: {
    color: GOV_COLORS.azulPrincipal,
    fontSize: 12,
    fontWeight: '800',
  },

  avisoFinal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: GOV_COLORS.branco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: GOV_COLORS.borda,
    padding: 13,
  },

  avisoFinalTxt: {
    flex: 1,
    color: GOV_COLORS.cinzaTexto,
    fontSize: 11,
    lineHeight: 17,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: GOV_COLORS.fundoModal,
    justifyContent: 'center',
    padding: 16,
  },

  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    alignSelf: 'center',
    backgroundColor: GOV_COLORS.branco,
    borderRadius: 20,
    padding: 18,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  modalIcone: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: GOV_COLORS.destaque,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  modalHeaderTexto: {
    flex: 1,
  },

  modalSuperTitulo: {
    color: GOV_COLORS.azulPrincipal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  modalTitulo: {
    color: GOV_COLORS.texto,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },

  fechar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GOV_COLORS.cinzaFundo,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    maxHeight: 470,
  },

  modalStatusLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: GOV_COLORS.borda,
  },

  modalData: {
    color: GOV_COLORS.cinzaTexto,
    fontSize: 12,
    fontWeight: '700',
  },

  detalheLabel: {
    color: GOV_COLORS.cinzaTexto,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 12,
    marginBottom: 4,
  },

  detalheValor: {
    color: GOV_COLORS.texto,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },

  descricaoTxt: {
    color: GOV_COLORS.texto,
    fontSize: 13,
    lineHeight: 20,
  },

  fonteAviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: GOV_COLORS.destaque,
    borderRadius: 10,
    padding: 12,
    marginTop: 18,
    marginBottom: 4,
  },

  fonteAvisoTxt: {
    flex: 1,
    color: GOV_COLORS.azulEscuro,
    fontSize: 11,
    lineHeight: 16,
  },

  btnFonte: {
    minHeight: 50,
    backgroundColor: GOV_COLORS.azulPrincipal,
    borderRadius: 12,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  btnFonteDesativado: {
    opacity: 0.65,
  },

  btnFonteTxt: {
    color: GOV_COLORS.branco,
    fontSize: 14,
    fontWeight: '800',
  },
});