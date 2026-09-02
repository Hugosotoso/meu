import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const PREVIEW_ID = 'portal-n2-document-preview';

type PonteAndroid = {
  getVersion?: () => number | string;
  printHtml?: (html: string) => void;
};

export const escaparHtml = (valor: unknown) =>
  String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

function versaoPonteAndroid(ponte?: PonteAndroid) {
  if (!ponte || typeof ponte.getVersion !== 'function') return 0;

  try {
    return Number(ponte.getVersion()) || 0;
  } catch {
    return 0;
  }
}

function abrirPreviaDocumento(navegador: Window, html: string) {
  const documento = navegador.document;

  if (!documento?.body) {
    throw new Error('A visualização do documento não está disponível.');
  }

  documento.getElementById(PREVIEW_ID)?.remove();

  const overflowAnterior = documento.body.style.overflow;
  const painel = documento.createElement('div');
  const estilo = documento.createElement('style');
  const barra = documento.createElement('div');
  const identidade = documento.createElement('div');
  const titulo = documento.createElement('strong');
  const instrucao = documento.createElement('span');
  const acoes = documento.createElement('div');
  const imprimir = documento.createElement('button');
  const fechar = documento.createElement('button');
  const frame = documento.createElement('iframe');

  painel.id = PREVIEW_ID;
  painel.setAttribute('role', 'dialog');
  painel.setAttribute('aria-modal', 'true');
  painel.setAttribute('aria-label', 'Visualização do documento');

  estilo.textContent = `
    #${PREVIEW_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      background: #e9edf2;
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
    }
    #${PREVIEW_ID} .portal-n2-preview-bar {
      min-height: 68px;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: #071d41;
      border-bottom: 4px solid #ffcd00;
      box-shadow: 0 3px 12px rgba(7, 29, 65, .18);
    }
    #${PREVIEW_ID} .portal-n2-preview-identity {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      color: #fff;
    }
    #${PREVIEW_ID} .portal-n2-preview-title {
      font-size: 15px;
      line-height: 20px;
    }
    #${PREVIEW_ID} .portal-n2-preview-hint {
      margin-top: 2px;
      color: rgba(255, 255, 255, .72);
      font-size: 10px;
      line-height: 14px;
    }
    #${PREVIEW_ID} .portal-n2-preview-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #${PREVIEW_ID} button {
      min-height: 40px;
      appearance: none;
      border: 1px solid rgba(255, 255, 255, .45);
      border-radius: 22px;
      padding: 8px 14px;
      background: transparent;
      color: #fff;
      font: 700 11px Arial, Helvetica, sans-serif;
      cursor: pointer;
    }
    #${PREVIEW_ID} .portal-n2-preview-print {
      border-color: #1351b4;
      background: #fff;
      color: #0c3789;
    }
    #${PREVIEW_ID} iframe {
      width: min(920px, calc(100% - 24px));
      flex: 1;
      align-self: center;
      margin: 12px;
      border: 0;
      border-radius: 6px;
      background: #fff;
      box-shadow: 0 4px 18px rgba(7, 29, 65, .15);
    }
    @media (max-width: 600px) {
      #${PREVIEW_ID} .portal-n2-preview-bar {
        align-items: stretch;
        flex-direction: column;
        gap: 8px;
        padding: 10px 12px;
      }
      #${PREVIEW_ID} .portal-n2-preview-actions {
        width: 100%;
      }
      #${PREVIEW_ID} button {
        flex: 1;
      }
      #${PREVIEW_ID} iframe {
        width: calc(100% - 12px);
        margin: 6px;
      }
    }
    @media print {
      #${PREVIEW_ID} .portal-n2-preview-bar { display: none; }
      #${PREVIEW_ID} iframe { width: 100%; margin: 0; box-shadow: none; }
    }
  `;

  barra.className = 'portal-n2-preview-bar';
  identidade.className = 'portal-n2-preview-identity';
  titulo.className = 'portal-n2-preview-title';
  titulo.textContent = 'Documento pronto para visualização';
  instrucao.className = 'portal-n2-preview-hint';
  instrucao.textContent =
    'Confira os dados. Use a opção de impressão para salvar como PDF quando disponível.';
  acoes.className = 'portal-n2-preview-actions';
  imprimir.className = 'portal-n2-preview-print';
  imprimir.type = 'button';
  imprimir.textContent = 'Imprimir ou salvar PDF';
  fechar.type = 'button';
  fechar.textContent = 'Voltar ao portal';
  frame.title = 'Documento gerado pelo Portal N2';
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.srcdoc = html;

  identidade.append(titulo, instrucao);
  acoes.append(imprimir, fechar);
  barra.append(identidade, acoes);
  painel.append(estilo, barra, frame);

  const encerrar = () => {
    documento.removeEventListener('keydown', aoPressionarTecla);
    painel.remove();
    documento.body.style.overflow = overflowAnterior;
  };

  const aoPressionarTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') encerrar();
  };

  imprimir.addEventListener('click', () => {
    const janelaDocumento = frame.contentWindow;

    if (!janelaDocumento) return;

    janelaDocumento.focus();
    janelaDocumento.print();
  });
  fechar.addEventListener('click', encerrar);
  documento.addEventListener('keydown', aoPressionarTecla);
  documento.body.style.overflow = 'hidden';
  documento.body.appendChild(painel);
}

export async function exportarHtml(html: string) {
  if (Platform.OS === 'web') {
    const navegador = (globalThis as { window?: Window }).window;

    if (!navegador) {
      throw new Error('O navegador não está disponível.');
    }

    const ponte = (navegador as Window & { PortalN2Android?: PonteAndroid })
      .PortalN2Android;

    // A versão 2 da ponte mantém uma WebView de impressão renderizada e evita
    // o documento em branco. APKs antigos recebem a prévia segura abaixo.
    if (
      versaoPonteAndroid(ponte) >= 2 &&
      typeof ponte?.printHtml === 'function'
    ) {
      ponte.printHtml(html);
      return;
    }

    abrirPreviaDocumento(navegador, html);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
  });
}
