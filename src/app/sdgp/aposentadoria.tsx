/**
 * Super App Gov — Módulo SDGP / Estimativa Previdenciária
 * Arquivo: src/app/sdgp/aposentadoria.tsx
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Linking,
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

const GOV_COLORS = {
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
  laranja: '#B45309',
  laranjaFundo: '#FFF7E6',
};

const FONTE_EC_103 =
  'https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc103.htm';

const DADOS_DEMONSTRATIVOS = {
  idade: 28,
  tempoContribuicaoAnos: 2,
  tempoContribuicaoMeses: 5,
  anoIngresso: 2024,
};

type Cenario = 'MULHER' | 'HOMEM';

function formatarTempoMeses(totalMeses: number) {
  const mesesSeguros = Math.max(Math.round(totalMeses), 0);
  const anos = Math.floor(mesesSeguros / 12);
  const meses = mesesSeguros % 12;

  if (anos === 0) {
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }

  if (meses === 0) {
    return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
  }

  return `${anos} ${anos === 1 ? 'ano' : 'anos'} e ${meses} ${meses === 1 ? 'mês' : 'meses'}`;
}

function GovHeader({ onBack }: { onBack: () => void }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={onBack}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
      >
        <MaterialIcons
          name="arrow-back"
          size={22}
          color={GOV_COLORS.azulPrincipal}
        />
      </TouchableOpacity>

      <View style={styles.marcaGroup}>
        <Text style={styles.marca}>
          gov<Text style={styles.marcaPonto}>.</Text>br
        </Text>
        <View style={styles.marcaDivisor} />
        <Text style={styles.headerModulo}>Gestão de Pessoas</Text>
      </View>

      <MaterialIcons
        name="account-circle"
        size={29}
        color={GOV_COLORS.azulPrincipal}
      />
    </View>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionBar} />
      <View style={styles.sectionHeaderText}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionDescription}>{description}</Text>
      </View>
    </View>
  );
}

function Requisito({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ComponentProps<typeof MaterialIcons>['name'];
  title: string;
  value: string;
  description: string;
}) {
  return (
    <View style={styles.requisito}>
      <View style={styles.requisitoIcone}>
        <MaterialIcons
          name={icon}
          size={20}
          color={GOV_COLORS.azulPrincipal}
        />
      </View>
      <View style={styles.requisitoTexto}>
        <Text style={styles.requisitoTitulo}>{title}</Text>
        <Text style={styles.requisitoValor}>{value}</Text>
        <Text style={styles.requisitoDescricao}>{description}</Text>
      </View>
    </View>
  );
}

export default function AposentadoriaScreen() {
  const router = useRouter();
  const { nome, matricula } = useLocalSearchParams<{
    nome: string;
    matricula: string;
  }>();

  const [cenario, setCenario] = useState<Cenario>('HOMEM');
  const larguraBarra = useRef(new Animated.Value(0)).current;

  const calculo = useMemo(() => {
    const idadeMinima = cenario === 'MULHER' ? 62 : 65;
    const contribuicaoAtualMeses =
      DADOS_DEMONSTRATIVOS.tempoContribuicaoAnos * 12 +
      DADOS_DEMONSTRATIVOS.tempoContribuicaoMeses;
    const contribuicaoMinimaMeses = 25 * 12;
    const mesesAteContribuicao = Math.max(
      contribuicaoMinimaMeses - contribuicaoAtualMeses,
      0,
    );
    const anosAteIdade = Math.max(
      idadeMinima - DADOS_DEMONSTRATIVOS.idade,
      0,
    );
    const maiorPrazoConhecidoMeses = Math.max(
      anosAteIdade * 12,
      mesesAteContribuicao,
    );
    const percentualContribuicao = Math.min(
      (contribuicaoAtualMeses / contribuicaoMinimaMeses) * 100,
      100,
    );

    return {
      idadeMinima,
      contribuicaoAtualMeses,
      mesesAteContribuicao,
      anosAteIdade,
      maiorPrazoConhecidoMeses,
      percentualContribuicao,
      anoEstimado:
        new Date().getFullYear() +
        Math.ceil(maiorPrazoConhecidoMeses / 12),
    };
  }, [cenario]);

  useEffect(() => {
    larguraBarra.setValue(0);

    Animated.timing(larguraBarra, {
      toValue: calculo.percentualContribuicao,
      duration: 900,
      useNativeDriver: false,
    }).start();
  }, [calculo.percentualContribuicao, larguraBarra]);

  const abrirFonteOficial = async () => {
    try {
      const podeAbrir = await Linking.canOpenURL(FONTE_EC_103);

      if (!podeAbrir) {
        Alert.alert(
          'Fonte indisponível',
          'Não foi possível reconhecer o endereço da fonte oficial.',
        );
        return;
      }

      await Linking.openURL(FONTE_EC_103);
    } catch {
      Alert.alert(
        'Erro ao abrir fonte',
        'Não foi possível abrir a Emenda Constitucional nº 103/2019.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GOV_COLORS.branco}
      />

      <GovHeader onBack={() => router.back()} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.breadcrumb}>
          <Text style={styles.breadcrumbText}>SDGP</Text>
          <MaterialIcons
            name="chevron-right"
            size={14}
            color={GOV_COLORS.cinzaClaro}
          />
          <Text style={styles.breadcrumbAtual}>
            Estimativa previdenciária
          </Text>
        </View>

        <View style={styles.pageHeading}>
          <Text style={styles.pageEyebrow}>PLANEJAMENTO FUNCIONAL</Text>
          <Text style={styles.pageTitle}>Estimativa previdenciária</Text>
          <Text style={styles.pageSubtitle}>
            Consulte cenários educacionais baseados nos requisitos gerais da
            Emenda Constitucional nº 103/2019.
          </Text>
        </View>

        <View style={styles.servidorInfo}>
          <View style={styles.servidorIcone}>
            <MaterialIcons
              name="person"
              size={23}
              color={GOV_COLORS.azulPrincipal}
            />
          </View>
          <View style={styles.servidorTexto}>
            <Text style={styles.servidorLabel}>SERVIDOR</Text>
            <Text style={styles.nomeText}>{nome || 'Servidor público'}</Text>
            <Text style={styles.matriculaText}>
              Matrícula {matricula || 'não informada'}
            </Text>
          </View>
        </View>

        <View style={styles.alertaImportante}>
          <MaterialIcons
            name="warning-amber"
            size={20}
            color={GOV_COLORS.laranja}
          />
          <Text style={styles.alertaTexto}>
            Esta tela não concede aposentadoria nem substitui análise do órgão.
            Os dados de idade e contribuição ainda são demonstrativos.
          </Text>
        </View>

        <SectionHeader
          title="Cenário de idade mínima"
          description="Selecione o cenário aplicável apenas para visualizar a estimativa"
        />

        <View style={styles.cenarioLinha}>
          <TouchableOpacity
            style={[
              styles.cenarioBotao,
              cenario === 'MULHER' && styles.cenarioBotaoAtivo,
            ]}
            onPress={() => setCenario('MULHER')}
            accessibilityRole="button"
            accessibilityState={{ selected: cenario === 'MULHER' }}
          >
            <Text
              style={[
                styles.cenarioTitulo,
                cenario === 'MULHER' && styles.cenarioTextoAtivo,
              ]}
            >
              Mulher
            </Text>
            <Text
              style={[
                styles.cenarioIdade,
                cenario === 'MULHER' && styles.cenarioTextoAtivo,
              ]}
            >
              62 anos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cenarioBotao,
              cenario === 'HOMEM' && styles.cenarioBotaoAtivo,
            ]}
            onPress={() => setCenario('HOMEM')}
            accessibilityRole="button"
            accessibilityState={{ selected: cenario === 'HOMEM' }}
          >
            <Text
              style={[
                styles.cenarioTitulo,
                cenario === 'HOMEM' && styles.cenarioTextoAtivo,
              ]}
            >
              Homem
            </Text>
            <Text
              style={[
                styles.cenarioIdade,
                cenario === 'HOMEM' && styles.cenarioTextoAtivo,
              ]}
            >
              65 anos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardDestaque}>
          <View style={styles.destaqueTopo}>
            <View style={styles.destaqueIcone}>
              <MaterialCommunityIcons
                name="timer-sand"
                size={25}
                color={GOV_COLORS.azulPrincipal}
              />
            </View>
            <View style={styles.destaqueTexto}>
              <Text style={styles.destaqueLabel}>
                MENOR PRAZO CONHECIDO NO CENÁRIO
              </Text>
              <Text style={styles.destaqueValor}>
                {formatarTempoMeses(calculo.maiorPrazoConhecidoMeses)}
              </Text>
              <Text style={styles.destaqueSub}>
                Referência aproximada: {calculo.anoEstimado}
              </Text>
            </View>
          </View>

          <View style={styles.destaqueAviso}>
            <MaterialIcons
              name="info-outline"
              size={17}
              color={GOV_COLORS.azulPrincipal}
            />
            <Text style={styles.destaqueAvisoTexto}>
              O prazo considera somente idade e contribuição. Tempo no serviço
              público e no cargo ainda precisam ser confirmados.
            </Text>
          </View>
        </View>

        <SectionHeader
          title="Dados usados na estimativa"
          description="Valores demonstrativos atualmente configurados no protótipo"
        />

        <View style={styles.dadosGrid}>
          <View style={styles.dadoCard}>
            <MaterialCommunityIcons
              name="cake-variant-outline"
              size={22}
              color={GOV_COLORS.azulPrincipal}
            />
            <Text style={styles.dadoLabel}>IDADE INFORMADA</Text>
            <Text style={styles.dadoValor}>
              {DADOS_DEMONSTRATIVOS.idade} anos
            </Text>
          </View>

          <View style={styles.dadoCard}>
            <MaterialCommunityIcons
              name="calendar-clock-outline"
              size={22}
              color={GOV_COLORS.azulPrincipal}
            />
            <Text style={styles.dadoLabel}>CONTRIBUIÇÃO INFORMADA</Text>
            <Text style={styles.dadoValor}>
              {formatarTempoMeses(calculo.contribuicaoAtualMeses)}
            </Text>
          </View>

          <View style={styles.dadoCard}>
            <MaterialIcons
              name="work-outline"
              size={22}
              color={GOV_COLORS.azulPrincipal}
            />
            <Text style={styles.dadoLabel}>INGRESSO DEMONSTRATIVO</Text>
            <Text style={styles.dadoValor}>
              {DADOS_DEMONSTRATIVOS.anoIngresso}
            </Text>
          </View>
        </View>

        <View style={styles.progressoCard}>
          <View style={styles.progressoTopo}>
            <Text style={styles.progressoTitulo}>
              Progresso do requisito contributivo
            </Text>
            <Text style={styles.progressoPercentual}>
              {calculo.percentualContribuicao.toFixed(1)}%
            </Text>
          </View>

          <View style={styles.barraFundo}>
            <Animated.View
              style={[
                styles.barraPreenchida,
                {
                  width: larguraBarra.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>

          <Text style={styles.progressoMeta}>
            Faltam aproximadamente{' '}
            {formatarTempoMeses(calculo.mesesAteContribuicao)} para completar
            25 anos de contribuição, mantendo-se contribuição contínua.
          </Text>
        </View>

        <SectionHeader
          title="Requisitos gerais do cenário pós-reforma"
          description="Os requisitos devem ser cumpridos cumulativamente"
        />

        <View style={styles.requisitosLista}>
          <Requisito
            icon="event"
            title="Idade mínima"
            value={`${calculo.idadeMinima} anos`}
            description={`Faltam aproximadamente ${calculo.anosAteIdade} anos considerando a idade demonstrativa.`}
          />

          <Requisito
            icon="date-range"
            title="Tempo de contribuição"
            value="25 anos"
            description="O tempo contributivo precisa ser confirmado no assentamento funcional e nos regimes de origem."
          />

          <Requisito
            icon="account-balance"
            title="Serviço público"
            value="10 anos"
            description="O protótipo ainda não possui esse tempo consolidado para realizar a validação."
          />

          <Requisito
            icon="badge"
            title="Tempo no cargo"
            value="5 anos"
            description="O tempo no cargo efetivo também precisa ser confirmado pela Gestão de Pessoas."
          />
        </View>

        <SectionHeader
          title="Ingresso anterior à reforma"
          description="Servidores antigos podem estar sujeitos a regras de transição"
        />

        <View style={styles.cardTexto}>
          <Text style={styles.paragrafo}>
            Quem ingressou em cargo efetivo até a entrada em vigor da Emenda
            Constitucional nº 103/2019 pode se enquadrar em diferentes regras
            de transição. A regra correta depende da data de ingresso, idade,
            tempo de contribuição e histórico funcional completo.
          </Text>

          <Text style={styles.paragrafoFinal}>
            Por esse motivo, esta tela não calcula pontos, pedágio ou valor do
            benefício para servidores anteriores à reforma.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.btnFonte}
          onPress={abrirFonteOficial}
          accessibilityRole="link"
        >
          <MaterialIcons
            name="open-in-new"
            size={19}
            color={GOV_COLORS.azulPrincipal}
          />
          <Text style={styles.btnFonteTexto}>
            Consultar EC nº 103/2019 no Planalto
          </Text>
        </TouchableOpacity>

        <View style={styles.infoFinal}>
          <MaterialIcons
            name="verified-user"
            size={19}
            color={GOV_COLORS.azulPrincipal}
          />
          <Text style={styles.infoFinalTexto}>
            A concessão depende de análise previdenciária formal, conferência
            do tempo de contribuição e validação pela unidade competente.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GOV_COLORS.cinzaFundo },
  header: { minHeight: 66, backgroundColor: GOV_COLORS.branco, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  marcaGroup: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  marca: { color: GOV_COLORS.azulEscuro, fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  marcaPonto: { color: GOV_COLORS.amarelo },
  marcaDivisor: { width: 1, height: 25, backgroundColor: GOV_COLORS.cinzaBorda, marginHorizontal: 12 },
  headerModulo: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 13, fontWeight: '700' },
  scrollContent: { width: '100%', maxWidth: 900, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 50 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  breadcrumbText: { color: GOV_COLORS.azulPrincipal, fontSize: 11, marginHorizontal: 3 },
  breadcrumbAtual: { color: GOV_COLORS.cinzaTexto, fontSize: 11, fontWeight: '700', marginHorizontal: 3 },
  pageHeading: { paddingBottom: 18, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  pageEyebrow: { color: GOV_COLORS.azulPrincipal, fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 6 },
  pageTitle: { color: GOV_COLORS.azulEscuro, fontSize: 27, fontWeight: '800', letterSpacing: -0.4 },
  pageSubtitle: { color: GOV_COLORS.cinzaTexto, fontSize: 13, lineHeight: 20, marginTop: 7 },
  servidorInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, borderRadius: 6, padding: 14 },
  servidorIcone: { width: 43, height: 43, borderRadius: 22, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  servidorTexto: { flex: 1 },
  servidorLabel: { color: GOV_COLORS.azulPrincipal, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  nomeText: { color: GOV_COLORS.texto, fontSize: 15, fontWeight: '800', marginTop: 2 },
  matriculaText: { color: GOV_COLORS.cinzaTexto, fontSize: 10, marginTop: 2 },
  alertaImportante: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: GOV_COLORS.laranjaFundo, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.laranja, padding: 13, marginTop: 14 },
  alertaTexto: { flex: 1, color: GOV_COLORS.laranja, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', alignItems: 'stretch', marginTop: 27, marginBottom: 11 },
  sectionBar: { width: 4, minHeight: 38, borderRadius: 2, backgroundColor: GOV_COLORS.azulPrincipal, marginRight: 10 },
  sectionHeaderText: { flex: 1, justifyContent: 'center' },
  sectionTitle: { color: GOV_COLORS.azulEscuro, fontSize: 17, fontWeight: '800' },
  sectionDescription: { color: GOV_COLORS.cinzaTexto, fontSize: 11, marginTop: 2 },
  cenarioLinha: { flexDirection: 'row', gap: 9 },
  cenarioBotao: { flex: 1, minHeight: 64, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal, borderRadius: 6, backgroundColor: GOV_COLORS.branco, padding: 11, alignItems: 'center', justifyContent: 'center' },
  cenarioBotaoAtivo: { backgroundColor: GOV_COLORS.azulPrincipal },
  cenarioTitulo: { color: GOV_COLORS.azulPrincipal, fontSize: 11, fontWeight: '800' },
  cenarioIdade: { color: GOV_COLORS.azulEscuro, fontSize: 16, fontWeight: '900', marginTop: 3 },
  cenarioTextoAtivo: { color: GOV_COLORS.branco },
  cardDestaque: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, borderRadius: 6, padding: 16, marginTop: 12 },
  destaqueTopo: { flexDirection: 'row', alignItems: 'center' },
  destaqueIcone: { width: 46, height: 46, borderRadius: 23, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  destaqueTexto: { flex: 1 },
  destaqueLabel: { color: GOV_COLORS.azulPrincipal, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  destaqueValor: { color: GOV_COLORS.azulEscuro, fontSize: 22, fontWeight: '900', marginTop: 3 },
  destaqueSub: { color: GOV_COLORS.verde, fontSize: 11, fontWeight: '700', marginTop: 2 },
  destaqueAviso: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: GOV_COLORS.azulClaro, padding: 10, marginTop: 14 },
  destaqueAvisoTexto: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 10, lineHeight: 15 },
  dadosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dadoCard: { flex: 1, minWidth: 180, backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 14 },
  dadoLabel: { color: GOV_COLORS.cinzaTexto, fontSize: 8, fontWeight: '900', letterSpacing: 0.6, marginTop: 9 },
  dadoValor: { color: GOV_COLORS.texto, fontSize: 15, fontWeight: '800', marginTop: 3 },
  progressoCard: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 15, marginTop: 11 },
  progressoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  progressoTitulo: { flex: 1, color: GOV_COLORS.texto, fontSize: 12, fontWeight: '800' },
  progressoPercentual: { color: GOV_COLORS.verde, fontSize: 14, fontWeight: '900' },
  barraFundo: { height: 8, backgroundColor: GOV_COLORS.cinzaBorda, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  barraPreenchida: { height: '100%', backgroundColor: GOV_COLORS.verde, borderRadius: 4 },
  progressoMeta: { color: GOV_COLORS.cinzaTexto, fontSize: 10, lineHeight: 15, marginTop: 10 },
  requisitosLista: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, overflow: 'hidden' },
  requisito: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderBottomWidth: 1, borderBottomColor: GOV_COLORS.cinzaBorda },
  requisitoIcone: { width: 38, height: 38, borderRadius: 5, backgroundColor: GOV_COLORS.azulClaro, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  requisitoTexto: { flex: 1 },
  requisitoTitulo: { color: GOV_COLORS.cinzaTexto, fontSize: 9, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  requisitoValor: { color: GOV_COLORS.azulEscuro, fontSize: 15, fontWeight: '900', marginTop: 2 },
  requisitoDescricao: { color: GOV_COLORS.cinzaTexto, fontSize: 10, lineHeight: 15, marginTop: 3 },
  cardTexto: { backgroundColor: GOV_COLORS.branco, borderWidth: 1, borderColor: GOV_COLORS.cinzaBorda, borderRadius: 6, padding: 15 },
  paragrafo: { color: GOV_COLORS.texto, fontSize: 12, lineHeight: 19 },
  paragrafoFinal: { color: GOV_COLORS.texto, fontSize: 12, lineHeight: 19, marginTop: 10 },
  btnFonte: { minHeight: 46, borderRadius: 23, borderWidth: 1, borderColor: GOV_COLORS.azulPrincipal, backgroundColor: GOV_COLORS.branco, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginTop: 13 },
  btnFonteTexto: { color: GOV_COLORS.azulPrincipal, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  infoFinal: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: GOV_COLORS.azulClaro, borderLeftWidth: 4, borderLeftColor: GOV_COLORS.azulPrincipal, padding: 13, marginTop: 14 },
  infoFinalTexto: { flex: 1, color: GOV_COLORS.azulEscuro, fontSize: 11, lineHeight: 17 },
});
