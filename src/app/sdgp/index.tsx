/**
 * Super App Gov — Módulo SDGP
 * Arquivo: src/app/sdgp/index.tsx
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';

const G_COLORS = {
  azulPrincipal: '#1351B4',
  azulEscuro: '#071D41',
  azulClaro: '#EAF2FF',
  branco: '#FFFFFF',
  cinzaFundo: '#F8F8F8',
  cinzaSuperficie: '#F1F3F5',
  texto: '#1F2937',
  cinzaTexto: '#555A60',
  cinzaClaro: '#9CA3AF',
  cinzaBorda: '#D9DDE3',
  amarelo: '#FFCD00',
  verde: '#168821',
  verdeFundo: '#E7F4E8',
};

type Contracheque = {
  id?: number;
  mes_referencia?: string | null;
  liquido?: number | string | null;
};

type IconeServico =
  React.ComponentProps<typeof MaterialCommunityIcons>['name'];

type ServiceCardProps = {
  icon: IconeServico;
  title: string;
  subtitle: string;
  onPress: () => void;
  last?: boolean;
};

function formatarMoeda(valor: unknown) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero)) return 'R$ 0,00';

  try {
    return numero.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  } catch {
    return `R$ ${numero.toFixed(2).replace('.', ',')}`;
  }
}

function ServiceCard({
  icon,
  title,
  subtitle,
  onPress,
  last = false,
}: ServiceCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.serviceCard,
        last && styles.serviceCardLast,
      ]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      <View style={styles.serviceIcon}>
        <MaterialCommunityIcons
          name={icon}
          size={23}
          color={G_COLORS.azulPrincipal}
        />
      </View>

      <View style={styles.serviceTextContainer}>
        <Text style={styles.serviceTitle}>{title}</Text>
        <Text style={styles.serviceSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.serviceChevron}>
        <MaterialIcons
          name="chevron-right"
          size={23}
          color={G_COLORS.azulPrincipal}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function SdgpHome() {
  const router = useRouter();

  const {
    nome,
    cargo,
    uorg,
    matricula,
    cpf,
  } = useLocalSearchParams<{
    nome: string;
    cargo: string;
    uorg: string;
    matricula: string;
    cpf: string;
  }>();

  const [salarioVisivel, setSalarioVisivel] = useState(false);
  const [ultimoContracheque, setUltimoContracheque] =
    useState<Contracheque | null>(null);
  const [carregandoCc, setCarregandoCc] = useState(true);

  useEffect(() => {
    let ativo = true;

    const buscarResumoFinanceiro = async () => {
      try {
        const { data, error } = await supabase
          .from('contracheques')
          .select('*')
          .eq('matricula', String(matricula))
          .order('id', { ascending: false })
          .limit(1);

        if (error) throw error;

        if (ativo && data && data.length > 0) {
          setUltimoContracheque(data[0]);
        }
      } catch (error) {
        console.error(
          'Erro ao buscar resumo financeiro:',
          error,
        );
      } finally {
        if (ativo) setCarregandoCc(false);
      }
    };

    if (matricula) {
      buscarResumoFinanceiro();
    } else {
      setCarregandoCc(false);
    }

    return () => {
      ativo = false;
    };
  }, [matricula]);

  const servidorNome = nome || 'Servidor público';
  const servidorCargo = cargo || 'Cargo não informado';
  const servidorMatricula = matricula || 'Não informada';
  const servidorUnidade = uorg || 'Unidade não informada';

  const abrirContracheque = () => {
    router.push({
      pathname: '/sdgp/contracheque',
      params: {
        nome,
        cargo,
        uorg,
        matricula,
        cpf,
      },
    });
  };

  const abrirFerias = () => {
    router.push({
      pathname: '/sdgp/ferias',
      params: {
        nome,
        matricula,
        uorg,
        cpf,
      },
    });
  };

  const abrirAposentadoria = () => {
    router.push({
      pathname: '/sdgp/aposentadoria',
      params: {
        nome,
        matricula,
      },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={G_COLORS.branco}
      />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <MaterialIcons
            name="arrow-back"
            size={22}
            color={G_COLORS.azulPrincipal}
          />
        </TouchableOpacity>

        <View style={styles.marcaGroup}>
          <Text style={styles.marca}>
            gov
            <Text style={styles.marcaPonto}>.</Text>
            br
          </Text>

          <View style={styles.marcaDivisor} />

          <Text style={styles.headerModulo}>Gestão de Pessoas</Text>
        </View>

        <View style={styles.headerAccount}>
          <MaterialIcons
            name="account-circle"
            size={29}
            color={G_COLORS.azulPrincipal}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>Início</Text>
          <MaterialIcons
            name="chevron-right"
            size={14}
            color={G_COLORS.cinzaClaro}
          />
          <Text style={styles.breadcrumbText}>Serviços</Text>
          <MaterialIcons
            name="chevron-right"
            size={14}
            color={G_COLORS.cinzaClaro}
          />
          <Text style={styles.breadcrumbAtual}>SDGP</Text>
        </View>

        <View style={styles.pageHeading}>
          <Text style={styles.pageEyebrow}>
            SISTEMA DE GESTÃO DE PESSOAS
          </Text>

          <Text style={styles.pageTitle}>Área do servidor</Text>

          <Text style={styles.pageSubtitle}>
            Consulte informações financeiras, registros funcionais e
            serviços relacionados à sua vida funcional.
          </Text>
        </View>

        <View style={styles.perfilCard}>
          <View style={styles.perfilLinha}>
            <View style={styles.perfilIcone}>
              <MaterialIcons
                name="person"
                size={25}
                color={G_COLORS.azulPrincipal}
              />
            </View>

            <View style={styles.perfilTextos}>
              <Text style={styles.perfilLabel}>SERVIDOR</Text>
              <Text style={styles.perfilNome}>{servidorNome}</Text>
              <Text style={styles.perfilCargo}>{servidorCargo}</Text>
            </View>
          </View>

          <View style={styles.perfilDivisor} />

          <View style={styles.perfilMetadados}>
            <View style={styles.metaItem}>
              <MaterialIcons
                name="badge"
                size={17}
                color={G_COLORS.cinzaTexto}
              />
              <Text style={styles.metaTexto}>
                Matrícula {servidorMatricula}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <MaterialIcons
                name="account-balance"
                size={17}
                color={G_COLORS.cinzaTexto}
              />
              <Text style={styles.metaTexto}>
                Unidade {servidorUnidade}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />

          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>
              Informações financeiras
            </Text>
            <Text style={styles.sectionDescription}>
              Último demonstrativo disponível
            </Text>
          </View>
        </View>

        <View style={styles.contrachequeCard}>
          <View style={styles.contrachequeTopo}>
            <View style={styles.contrachequeIcone}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={24}
                color={G_COLORS.azulPrincipal}
              />
            </View>

            <View style={styles.contrachequeTituloArea}>
              <Text style={styles.contrachequeLabel}>
                Último contracheque
              </Text>

              <Text style={styles.contrachequeReferencia}>
                {carregandoCc
                  ? 'Consultando...'
                  : ultimoContracheque?.mes_referencia ||
                    'Referência indisponível'}
              </Text>
            </View>

            {!carregandoCc && ultimoContracheque && (
              <View style={styles.disponivelTag}>
                <MaterialIcons
                  name="check-circle"
                  size={13}
                  color={G_COLORS.verde}
                />
                <Text style={styles.disponivelTagText}>
                  Disponível
                </Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.financialRow}>
            <View>
              <Text style={styles.financialLabel}>
                Rendimento líquido
              </Text>
              <Text style={styles.financialDescription}>
                Valor referente ao último demonstrativo
              </Text>
            </View>

            {carregandoCc ? (
              <ActivityIndicator
                size="small"
                color={G_COLORS.azulPrincipal}
              />
            ) : (
              <View style={styles.financialValueWrap}>
                <Text style={styles.ccValor}>
                  {salarioVisivel && ultimoContracheque
                    ? formatarMoeda(ultimoContracheque.liquido)
                    : 'R$ •••••••'}
                </Text>

                <TouchableOpacity
                  onPress={() =>
                    setSalarioVisivel((atual) => !atual)
                  }
                  style={styles.visibilityButton}
                  accessibilityRole="button"
                  accessibilityLabel={
                    salarioVisivel
                      ? 'Ocultar rendimento'
                      : 'Mostrar rendimento'
                  }
                >
                  <MaterialIcons
                    name={
                      salarioVisivel
                        ? 'visibility'
                        : 'visibility-off'
                    }
                    size={20}
                    color={G_COLORS.azulPrincipal}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.btnPrimary}
            onPress={abrirContracheque}
            activeOpacity={0.75}
            accessibilityRole="button"
          >
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={20}
              color={G_COLORS.branco}
            />

            <Text style={styles.btnPrimaryText}>
              Consultar contracheque
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <View style={styles.sectionBar} />

          <View style={styles.sectionHeaderText}>
            <Text style={styles.sectionTitle}>
              Serviços funcionais
            </Text>
            <Text style={styles.sectionDescription}>
              Acesse os serviços disponíveis no SDGP
            </Text>
          </View>
        </View>

        <View style={styles.services}>
          <ServiceCard
            icon="folder-account-outline"
            title="Assentamento Funcional Digital"
            subtitle="Histórico, portarias e documentos funcionais"
            onPress={() => router.push('/sdgp/afd')}
          />

          <ServiceCard
            icon="calendar-check-outline"
            title="Férias e recessos"
            subtitle="Programação, protocolo e acompanhamento"
            onPress={abrirFerias}
          />

          <ServiceCard
            icon="calculator-variant-outline"
            title="Simulação de aposentadoria"
            subtitle="Estimativa de tempo e consulta das regras"
            onPress={abrirAposentadoria}
            last
          />
        </View>

        <View style={styles.infoBox}>
          <MaterialIcons
            name="info-outline"
            size={19}
            color={G_COLORS.azulPrincipal}
          />

          <Text style={styles.infoText}>
            As informações apresentadas possuem caráter demonstrativo.
            Confirme dados oficiais com a unidade de Gestão de Pessoas.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            Portal Integrado de Gestão Pública
          </Text>
          <Text style={styles.footerText}>
            Serviço digital • SDGP
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: G_COLORS.cinzaFundo,
  },

  header: {
    minHeight: 66,
    backgroundColor: G_COLORS.branco,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: G_COLORS.cinzaBorda,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  marcaGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  marca: {
    color: G_COLORS.azulEscuro,
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  marcaPonto: {
    color: G_COLORS.amarelo,
  },

  marcaDivisor: {
    width: 1,
    height: 25,
    backgroundColor: G_COLORS.cinzaBorda,
    marginHorizontal: 12,
  },

  headerModulo: {
    flex: 1,
    color: G_COLORS.azulEscuro,
    fontSize: 13,
    fontWeight: '700',
  },

  headerAccount: {
    width: 40,
    alignItems: 'flex-end',
  },

  scrollContent: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  breadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 18,
  },

  breadcrumbText: {
    color: G_COLORS.azulPrincipal,
    fontSize: 11,
    marginHorizontal: 3,
  },

  breadcrumbAtual: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '700',
    marginHorizontal: 3,
  },

  pageHeading: {
    paddingBottom: 18,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: G_COLORS.cinzaBorda,
  },

  pageEyebrow: {
    color: G_COLORS.azulPrincipal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },

  pageTitle: {
    color: G_COLORS.azulEscuro,
    fontSize: 27,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  pageSubtitle: {
    maxWidth: 680,
    color: G_COLORS.cinzaTexto,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },

  perfilCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderLeftWidth: 4,
    borderLeftColor: G_COLORS.azulPrincipal,
    borderRadius: 6,
    padding: 16,
  },

  perfilLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  perfilIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: G_COLORS.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  perfilTextos: {
    flex: 1,
  },

  perfilLabel: {
    color: G_COLORS.azulPrincipal,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.9,
  },

  perfilNome: {
    color: G_COLORS.texto,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },

  perfilCargo: {
    color: G_COLORS.cinzaTexto,
    fontSize: 12,
    marginTop: 2,
  },

  perfilDivisor: {
    height: 1,
    backgroundColor: G_COLORS.cinzaBorda,
    marginVertical: 13,
  },

  perfilMetadados: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  metaTexto: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 28,
    marginBottom: 12,
  },

  sectionBar: {
    width: 4,
    minHeight: 38,
    borderRadius: 2,
    backgroundColor: G_COLORS.azulPrincipal,
    marginRight: 10,
  },

  sectionHeaderText: {
    flex: 1,
    justifyContent: 'center',
  },

  sectionTitle: {
    color: G_COLORS.azulEscuro,
    fontSize: 17,
    fontWeight: '800',
  },

  sectionDescription: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    marginTop: 2,
  },

  contrachequeCard: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 6,
    padding: 16,
  },

  contrachequeTopo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  contrachequeIcone: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: G_COLORS.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  contrachequeTituloArea: {
    flex: 1,
  },

  contrachequeLabel: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
  },

  contrachequeReferencia: {
    color: G_COLORS.texto,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },

  disponivelTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: G_COLORS.verdeFundo,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },

  disponivelTagText: {
    color: G_COLORS.verde,
    fontSize: 9,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: G_COLORS.cinzaBorda,
    marginVertical: 15,
  },

  financialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 17,
  },

  financialLabel: {
    color: G_COLORS.texto,
    fontSize: 13,
    fontWeight: '700',
  },

  financialDescription: {
    color: G_COLORS.cinzaTexto,
    fontSize: 10,
    marginTop: 2,
  },

  financialValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  ccValor: {
    color: G_COLORS.texto,
    fontSize: 18,
    fontWeight: '800',
  },

  visibilityButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },

  btnPrimary: {
    minHeight: 44,
    backgroundColor: G_COLORS.azulPrincipal,
    borderRadius: 22,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
  },

  btnPrimaryText: {
    color: G_COLORS.branco,
    fontSize: 13,
    fontWeight: '800',
  },

  services: {
    backgroundColor: G_COLORS.branco,
    borderWidth: 1,
    borderColor: G_COLORS.cinzaBorda,
    borderRadius: 6,
    overflow: 'hidden',
  },

  serviceCard: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: G_COLORS.cinzaBorda,
  },

  serviceCardLast: {
    borderBottomWidth: 0,
  },

  serviceIcon: {
    width: 42,
    height: 42,
    borderRadius: 6,
    backgroundColor: G_COLORS.azulClaro,
    alignItems: 'center',
    justifyContent: 'center',
  },

  serviceTextContainer: {
    flex: 1,
    marginHorizontal: 12,
  },

  serviceTitle: {
  color: G_COLORS.texto,
  fontSize: 14,
  fontWeight: '700',
},
  serviceSubtitle: {
    color: G_COLORS.cinzaTexto,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },

  serviceChevron: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: G_COLORS.azulClaro,
    borderLeftWidth: 4,
    borderLeftColor: G_COLORS.azulPrincipal,
    padding: 13,
    marginTop: 20,
  },

  infoText: {
    flex: 1,
    color: G_COLORS.azulEscuro,
    fontSize: 11,
    lineHeight: 17,
  },

  footer: {
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: G_COLORS.cinzaBorda,
    paddingTop: 20,
    marginTop: 30,
  },

  footerTitle: {
    color: G_COLORS.azulEscuro,
    fontSize: 12,
    fontWeight: '800',
  },

  footerText: {
    color: G_COLORS.cinzaTexto,
    fontSize: 10,
    marginTop: 3,
  },
});