import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const PREVIEW_ID = 'portal-n2-document-preview';

type PonteAndroid = {
  getVersion?: () => number | string;
  printHtml?: (html: string) => void;
  saveBase64Pdf?: (base64: string, nomeArquivo: string) => void;
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

function prepararHtmlResponsivo(html: string) {
  const complemento = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <style id="portal-n2-mobile-document">
      html, body { width: 100%; max-width: 100%; }
      img, svg { max-width: 100%; height: auto; }
      table { width: 100%; border-collapse: collapse; }
      th, td { overflow-wrap: anywhere; }
      @media (max-width: 600px) {
        body { font-size: 13px !important; line-height: 1.55 !important; }
        .header {
          align-items: flex-start !important;
          flex-direction: column !important;
          gap: 10px !important;
          padding: 18px 16px !important;
        }
        .orgao { text-align: left !important; line-height: 1.45 !important; }
        .content, main, .container {
          padding-left: 16px !important;
          padding-right: 16px !important;
        }
        .content { padding-top: 20px !important; padding-bottom: 24px !important; }
        .grid, .dados-grid, .resumo-grid, .cards {
          grid-template-columns: 1fr !important;
          gap: 12px !important;
        }
        .card, .secao, .resumo, .identificacao, .totais {
          margin-bottom: 16px !important;
        }
        table { table-layout: fixed !important; font-size: 10px !important; }
        th, td { padding: 8px 5px !important; }
        h1 { font-size: 20px !important; line-height: 1.3 !important; }
        h2 { font-size: 16px !important; line-height: 1.35 !important; }
        .marca { font-size: 24px !important; }
        .footer { line-height: 1.5 !important; padding-top: 18px !important; }
      }
      @media print {
        @page { size: A4; margin: 12mm; }
        body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      }
    </style>
  `;

  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${complemento}</head>`);
  }

  return `<!DOCTYPE html><html><head>${complemento}</head><body>${html}</body></html>`;
}

function normalizarTextoPdf(valor: string) {
  return valor
    .normalize('NFC')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/•/g, '-')
    .replace(/\t/g, '    ')
    .replace(/[^\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, '?');
}

function quebrarLinhas(texto: string, limite = 88) {
  const linhas: string[] = [];

  normalizarTextoPdf(texto)
    .split(/\r?\n/)
    .forEach((paragrafoOriginal) => {
      let paragrafo = paragrafoOriginal.replace(/\s+/g, ' ').trim();

      if (!paragrafo) {
        if (linhas[linhas.length - 1] !== '') linhas.push('');
        return;
      }

      while (paragrafo.length > limite) {
        let corte = paragrafo.lastIndexOf(' ', limite);
        if (corte < Math.floor(limite * 0.55)) corte = limite;

        linhas.push(paragrafo.slice(0, corte).trim());
        paragrafo = paragrafo.slice(corte).trim();
      }

      linhas.push(paragrafo);
    });

  return linhas.length ? linhas : ['Documento gerado pelo Portal N2.'];
}

function escaparTextoPdf(texto: string) {
  let resultado = '';

  for (const caractere of texto) {
    const codigo = caractere.charCodeAt(0);

    if (caractere === '\\' || caractere === '(' || caractere === ')') {
      resultado += `\\${caractere}`;
    } else if (codigo >= 32 && codigo <= 126) {
      resultado += caractere;
    } else if (codigo >= 160 && codigo <= 255) {
      resultado += `\\${codigo.toString(8).padStart(3, '0')}`;
    } else {
      resultado += '?';
    }
  }

  return resultado;
}

function gerarPdfTexto(texto: string) {
  const linhas = quebrarLinhas(texto);
  const linhasPorPagina = 51;
  const paginas: string[][] = [];

  for (let indice = 0; indice < linhas.length; indice += linhasPorPagina) {
    paginas.push(linhas.slice(indice, indice + linhasPorPagina));
  }

  const objetos = new Map<number, string>();
  const idsPaginas: number[] = [];
  const idFonte = 3;

  paginas.forEach((linhasPagina, indice) => {
    const idPagina = 4 + indice * 2;
    const idConteudo = idPagina + 1;
    idsPaginas.push(idPagina);

    const comandos = linhasPagina
      .map((linha) => `(${escaparTextoPdf(linha)}) Tj\nT*`)
      .join('\n');
    const fluxo = `BT\n/F1 10 Tf\n14 TL\n42 800 Td\n${comandos}\nET`;

    objetos.set(
      idPagina,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${idFonte} 0 R >> >> /Contents ${idConteudo} 0 R >>`,
    );
    objetos.set(
      idConteudo,
      `<< /Length ${fluxo.length} >>\nstream\n${fluxo}\nendstream`,
    );
  });

  objetos.set(1, '<< /Type /Catalog /Pages 2 0 R >>');
  objetos.set(
    2,
    `<< /Type /Pages /Kids [${idsPaginas.map((id) => `${id} 0 R`).join(' ')}] /Count ${idsPaginas.length} >>`,
  );
  objetos.set(
    idFonte,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  );

  const ultimoId = 3 + paginas.length * 2;
  const offsets = new Array<number>(ultimoId + 1).fill(0);
  let pdf = '%PDF-1.4\n% Portal N2\n';

  for (let id = 1; id <= ultimoId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objetos.get(id)}\nendobj\n`;
  }

  const inicioXref = pdf.length;
  pdf += `xref\n0 ${ultimoId + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let id = 1; id <= ultimoId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${ultimoId + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${inicioXref}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let indice = 0; indice < pdf.length; indice += 1) {
    bytes[indice] = pdf.charCodeAt(indice) & 0xff;
  }

  return bytes;
}

function bytesParaBase64(bytes: Uint8Array) {
  let binario = '';
  const tamanhoBloco = 16_384;

  for (let indice = 0; indice < bytes.length; indice += tamanhoBloco) {
    const bloco = bytes.subarray(indice, indice + tamanhoBloco);
    binario += String.fromCharCode(...bloco);
  }

  return btoa(binario);
}

function nomeArquivoPdf() {
  const agora = new Date();
  const data = agora.toISOString().slice(0, 10);
  const hora = agora.toTimeString().slice(0, 8).replaceAll(':', '-');
  return `Portal-N2-${data}-${hora}.pdf`;
}

async function salvarPdfNoNavegador(
  navegador: Window,
  ponte: PonteAndroid | undefined,
  html: string,
  frame: HTMLIFrameElement,
) {
  const versao = versaoPonteAndroid(ponte);

  if (versao >= 2 && typeof ponte?.printHtml === 'function' && versao < 3) {
    ponte.printHtml(html);
    return 'Na tela do Android, selecione Salvar como PDF.';
  }

  const textoDocumento =
    frame.contentDocument?.body?.innerText ||
    frame.contentDocument?.body?.textContent ||
    'Documento gerado pelo Portal Integrado N2.';
  const bytes = gerarPdfTexto(textoDocumento);
  const nome = nomeArquivoPdf();

  if (versao >= 3 && typeof ponte?.saveBase64Pdf === 'function') {
    ponte.saveBase64Pdf(bytesParaBase64(bytes), nome);
    return `PDF salvo em Downloads/Portal N2/${nome}`;
  }

  const arquivo = new File([bytes], nome, { type: 'application/pdf' });
  const compartilhamento = navegador.navigator as Navigator & {
    canShare?: (dados?: { files?: File[] }) => boolean;
    share?: (dados?: { files?: File[]; title?: string }) => Promise<void>;
  };

  if (
    typeof compartilhamento.share === 'function' &&
    typeof compartilhamento.canShare === 'function' &&
    compartilhamento.canShare({ files: [arquivo] })
  ) {
    await compartilhamento.share({
      files: [arquivo],
      title: 'Documento Portal N2',
    });
    return 'PDF enviado para o compartilhamento do aparelho.';
  }

  const url = URL.createObjectURL(arquivo);
  const link = navegador.document.createElement('a');
  link.href = url;
  link.download = nome;
  link.style.display = 'none';
  navegador.document.body.appendChild(link);
  link.click();
  link.remove();
  navegador.setTimeout(() => URL.revokeObjectURL(url), 15_000);

  return `Download iniciado: ${nome}`;
}

function abrirPreviaDocumento(
  navegador: Window,
  htmlOriginal: string,
  ponte?: PonteAndroid,
) {
  const documento = navegador.document;

  if (!documento?.body) {
    throw new Error('A visualização do documento não está disponível.');
  }

  documento.getElementById(PREVIEW_ID)?.remove();

  const html = prepararHtmlResponsivo(htmlOriginal);
  const overflowAnterior = documento.body.style.overflow;
  const painel = documento.createElement('div');
  const estilo = documento.createElement('style');
  const barra = documento.createElement('div');
  const identidade = documento.createElement('div');
  const titulo = documento.createElement('strong');
  const instrucao = documento.createElement('span');
  const acoes = documento.createElement('div');
  const salvar = documento.createElement('button');
  const fechar = documento.createElement('button');
  const retorno = documento.createElement('span');
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
      min-height: 82px;
      display: flex;
      align-items: center;
      gap: 24px;
      padding: 14px 22px;
      background: #071d41;
      border-bottom: 4px solid #ffcd00;
      box-shadow: 0 3px 12px rgba(7, 29, 65, .18);
    }
    #${PREVIEW_ID} .portal-n2-preview-identity {
      min-width: 0;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: #fff;
    }
    #${PREVIEW_ID} .portal-n2-preview-title { font-size: 16px; line-height: 22px; }
    #${PREVIEW_ID} .portal-n2-preview-hint {
      color: rgba(255, 255, 255, .74);
      font-size: 11px;
      line-height: 16px;
    }
    #${PREVIEW_ID} .portal-n2-preview-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #${PREVIEW_ID} button {
      min-height: 44px;
      appearance: none;
      border: 1px solid rgba(255, 255, 255, .5);
      border-radius: 24px;
      padding: 10px 18px;
      background: transparent;
      color: #fff;
      font: 700 12px Arial, Helvetica, sans-serif;
      cursor: pointer;
    }
    #${PREVIEW_ID} button:disabled { cursor: wait; opacity: .62; }
    #${PREVIEW_ID} .portal-n2-preview-save {
      border-color: #fff;
      background: #fff;
      color: #0c3789;
    }
    #${PREVIEW_ID} .portal-n2-preview-return {
      position: absolute;
      left: 50%;
      bottom: 18px;
      z-index: 2;
      max-width: calc(100% - 32px);
      transform: translateX(-50%);
      border-radius: 20px;
      padding: 9px 14px;
      background: #168821;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      line-height: 16px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, .2);
    }
    #${PREVIEW_ID} .portal-n2-preview-return:empty { display: none; }
    #${PREVIEW_ID} iframe {
      width: min(920px, calc(100% - 40px));
      flex: 1;
      align-self: center;
      margin: 20px;
      border: 0;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 5px 22px rgba(7, 29, 65, .16);
    }
    @media (max-width: 600px) {
      #${PREVIEW_ID} .portal-n2-preview-bar {
        min-height: 0;
        align-items: stretch;
        flex-direction: column;
        gap: 14px;
        padding: 16px 14px;
      }
      #${PREVIEW_ID} .portal-n2-preview-identity { gap: 5px; }
      #${PREVIEW_ID} .portal-n2-preview-actions { width: 100%; gap: 10px; }
      #${PREVIEW_ID} button { min-height: 48px; flex: 1; padding: 10px 12px; }
      #${PREVIEW_ID} iframe {
        width: calc(100% - 24px);
        margin: 12px;
        border-radius: 7px;
      }
      #${PREVIEW_ID} .portal-n2-preview-return { bottom: 10px; }
    }
  `;

  barra.className = 'portal-n2-preview-bar';
  identidade.className = 'portal-n2-preview-identity';
  titulo.className = 'portal-n2-preview-title';
  titulo.textContent = 'Documento pronto';
  instrucao.className = 'portal-n2-preview-hint';
  instrucao.textContent =
    'Confira os dados abaixo e toque em Salvar PDF para guardar o arquivo.';
  acoes.className = 'portal-n2-preview-actions';
  salvar.className = 'portal-n2-preview-save';
  salvar.type = 'button';
  salvar.textContent = 'Salvar PDF';
  salvar.disabled = true;
  fechar.type = 'button';
  fechar.textContent = 'Voltar ao portal';
  retorno.className = 'portal-n2-preview-return';
  frame.title = 'Documento gerado pelo Portal N2';
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.srcdoc = html;

  identidade.append(titulo, instrucao);
  acoes.append(salvar, fechar);
  barra.append(identidade, acoes);
  painel.append(estilo, barra, frame, retorno);

  const encerrar = () => {
    documento.removeEventListener('keydown', aoPressionarTecla);
    painel.remove();
    documento.body.style.overflow = overflowAnterior;
  };

  const aoPressionarTecla = (evento: KeyboardEvent) => {
    if (evento.key === 'Escape') encerrar();
  };

  frame.addEventListener('load', () => {
    salvar.disabled = false;
  });
  salvar.addEventListener('click', async () => {
    salvar.disabled = true;
    salvar.textContent = 'Gerando PDF…';
    retorno.textContent = '';

    try {
      retorno.textContent = await salvarPdfNoNavegador(
        navegador,
        ponte,
        html,
        frame,
      );
    } catch (error) {
      const cancelado =
        error instanceof DOMException && error.name === 'AbortError';
      retorno.textContent = cancelado
        ? 'Salvamento cancelado.'
        : 'Não foi possível salvar. Utilize o APK atualizado do Portal N2.';
    } finally {
      salvar.disabled = false;
      salvar.textContent = 'Salvar PDF';
    }
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

    abrirPreviaDocumento(navegador, html, ponte);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    UTI: '.pdf',
    mimeType: 'application/pdf',
  });
}
