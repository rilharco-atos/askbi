/* ─── Descodificador PNG mínimo (Node nativo, sem dependências) ─────────────
   Suporta apenas o que o Page.captureScreenshot do Chrome produz: PNG não
   entrelaçado, 8 bits por canal, cor tipo 2 (RGB) ou 6 (RGBA). É o suficiente
   para os testes de contraste — não é um descodificador PNG genérico. */
import { inflateSync } from 'node:zlib';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Descodifica um PNG para { width, height, channels, data } com data em RGB(A) por linha, sem filtro.
 * @param {Buffer} buf
 */
export function decodePNG(buf) {
  if (!buf.subarray(0, 8).equals(SIG)) throw new Error('Não é um PNG válido (assinatura em falta)');
  let offset = 8;
  let width, height, bitDepth, colorType;
  const idatChunks = [];

  while (offset < buf.length) {
    const len = buf.readUInt32BE(offset);
    const type = buf.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const data = buf.subarray(dataStart, dataStart + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      const interlace = data.readUInt8(12);
      if (bitDepth !== 8) throw new Error(`Bit depth ${bitDepth} não suportado`);
      if (colorType !== 2 && colorType !== 6) throw new Error(`Color type ${colorType} não suportado`);
      if (interlace !== 0) throw new Error('PNG entrelaçado não suportado');
    } else if (type === 'IDAT') {
      idatChunks.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataStart + len + 4; // salta os dados + CRC
  }

  const channels = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let rawOffset = 0;

  for (let y = 0; y < height; y++) {
    const filterType = raw[rawOffset]; rawOffset += 1;
    const rowStart = y * stride;
    const prevRowStart = rowStart - stride;
    for (let x = 0; x < stride; x++) {
      const raw_x = raw[rawOffset + x];
      const a = x >= channels ? out[rowStart + x - channels] : 0;
      const b = y > 0 ? out[prevRowStart + x] : 0;
      const c = (y > 0 && x >= channels) ? out[prevRowStart + x - channels] : 0;
      let value;
      switch (filterType) {
        case 0: value = raw_x; break;
        case 1: value = raw_x + a; break;
        case 2: value = raw_x + b; break;
        case 3: value = raw_x + Math.floor((a + b) / 2); break;
        case 4: value = raw_x + paeth(a, b, c); break;
        default: throw new Error(`Filtro de linha desconhecido ${filterType}`);
      }
      out[rowStart + x] = value & 0xff;
    }
    rawOffset += stride;
  }

  return { width, height, channels, data: out };
}

/** Devolve [r,g,b] do pixel (x,y) de uma imagem descodificada. */
export function getPixel(img, x, y) {
  const i = (y * img.width + x) * img.channels;
  return [img.data[i], img.data[i + 1], img.data[i + 2]];
}

function linearize(v) {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminância relativa WCAG de um pixel [r,g,b]. */
export function relativeLuminance([r, g, b]) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Rácio de contraste WCAG entre duas luminâncias relativas. */
export function contrastRatio(lum1, lum2) {
  const hi = Math.max(lum1, lum2), lo = Math.min(lum1, lum2);
  return (hi + 0.05) / (lo + 0.05);
}

/** Devolve a luminância mais clara (pior caso para texto claro) de toda a imagem. */
export function worstLuminance(img) {
  let worst = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const l = relativeLuminance(getPixel(img, x, y));
      if (l > worst) worst = l;
    }
  }
  return worst;
}

/** Devolve a luminância mais escura (pior caso para texto escuro) de toda a imagem. */
export function bestDarkLuminance(img) {
  let worst = 1;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const l = relativeLuminance(getPixel(img, x, y));
      if (l < worst) worst = l;
    }
  }
  return worst;
}
