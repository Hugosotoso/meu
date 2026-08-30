import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const escaparHtml = (valor: unknown) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export async function exportarHtml(html: string) {
  if (Platform.OS === 'web') {
    const navegador = (globalThis as any).window;

    if (navegador?.PortalN2Android?.printHtml) {
      navegador.PortalN2Android.printHtml(html);
      return;
    }

    const janela = navegador?.open('', '_blank');
    if (!janela) throw new Error('O navegador bloqueou a janela de impressão.');

    janela.document.open();
    janela.document.write(html);
    janela.document.close();
    janela.focus();
    navegador.setTimeout(() => janela.print(), 250);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
}
