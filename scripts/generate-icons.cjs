/**
 * Gerador e validador de ícones da aplicação Hub Manager (.ico, .png, .svg).
 * Tema: cubo (bundle) em três tons sobre o quadrado laranja; a fonte é public/icon.svg.
 * Garante que build/icon.*, as imagens do instalador NSIS (build/installer*.bmp) e public/icon.png existam
 * e em conformidade com os requisitos do electron-builder (mínimo 256x256).
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'build');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

// Tabela de CRC32 padrão para PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);
  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function encodeRgbaToPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8);  // 8 bits por canal
  ihdr.writeUInt8(6, 9);  // RGBA
  ihdr.writeUInt8(0, 10); // Compressão deflate
  ihdr.writeUInt8(0, 11); // Filtro básico
  ihdr.writeUInt8(0, 12); // Sem entrelaçamento
  const ihdrChunk = makePngChunk('IHDR', ihdr);

  const rowLen = width * 4;
  const scanlines = Buffer.alloc(height * (1 + rowLen));
  for (let y = 0; y < height; y++) {
    const destOffset = y * (1 + rowLen);
    scanlines[destOffset] = 0;
    rgbaBuffer.copy(scanlines, destOffset + 1, y * rowLen, (y + 1) * rowLen);
  }

  const deflated = zlib.deflateSync(scanlines, { level: 9 });
  const idatChunk = makePngChunk('IDAT', deflated);
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Empacota um array de imagens PNG ({ width, height, buffer }) no formato ICO do Windows.
 */
function packPngsToIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reservado
  header.writeUInt16LE(1, 2); // 1 = Ícone
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const entries = [];

  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // Paleta
    entry.writeUInt8(0, 3); // Reservado
    entry.writeUInt16LE(1, 4); // Color planes
    entry.writeUInt16LE(32, 6); // 32 bits
    entry.writeUInt32LE(img.buffer.length, 8);
    entry.writeUInt32LE(offset, 12);
    entries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...images.map((img) => img.buffer)]);
}


/**
 * Codifica RGBA opaco como BMP 24 bits (formato que o NSIS aceita para sidebar e header).
 */
function encodeRgbaToBmp24(width, height, rgba) {
  const rowSize = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = rowSize * height;
  const out = Buffer.alloc(54 + pixelBytes);
  out.write('BM', 0, 'ascii');
  out.writeUInt32LE(out.length, 2);
  out.writeUInt32LE(54, 10);
  out.writeUInt32LE(40, 14);
  out.writeInt32LE(width, 18);
  out.writeInt32LE(height, 22);
  out.writeUInt16LE(1, 26);
  out.writeUInt16LE(24, 28);
  out.writeUInt32LE(pixelBytes, 34);
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 4; // BMP guarda de baixo para cima
    let dst = 54 + y * rowSize;
    for (let x = 0; x < width; x++) {
      const s = srcRow + x * 4;
      out[dst++] = rgba[s + 2];
      out[dst++] = rgba[s + 1];
      out[dst++] = rgba[s];
    }
  }
  return out;
}

async function loadLogo() {
  const { loadImage } = require('@napi-rs/canvas');
  const svgPath = path.join(PUBLIC_DIR, 'icon.svg');
  // O decode do SVG é assíncrono: sem aguardar, width/height vêm 0 e o logo sairia em branco.
  const image = await loadImage(fs.readFileSync(svgPath));
  if (!(image.width > 0 && image.height > 0)) {
    throw new Error('public/icon.svg não pôde ser decodificado');
  }
  return image;
}

async function renderIcons(logo) {
  const { createCanvas } = require('@napi-rs/canvas');
  const rendered = {};
  for (const size of [512, 256, 128, 64, 48, 32, 16]) {
    const canvas = createCanvas(size, size);
    canvas.getContext('2d').drawImage(logo, 0, 0, size, size);
    rendered[size] = canvas.toBuffer('image/png');
  }
  return rendered;
}

/**
 * Imagens do instalador NSIS: sidebar da boas-vindas/conclusão (164x314) e cabeçalho das telas internas (150x57).
 */
async function renderInstallerImages(logo) {
  const { createCanvas } = require('@napi-rs/canvas');

  const sideW = 164;
  const sideH = 314;
  const side = createCanvas(sideW, sideH);
  const sctx = side.getContext('2d');
  const grad = sctx.createLinearGradient(0, 0, 0, sideH);
  grad.addColorStop(0, '#1C1511');
  grad.addColorStop(1, '#3A1906');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, sideW, sideH);
  sctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
  sctx.lineWidth = 1;
  for (const r of [70, 110, 150]) {
    sctx.beginPath();
    sctx.arc(sideW / 2, 112, r, 0, Math.PI * 2);
    sctx.stroke();
  }
  sctx.drawImage(logo, (sideW - 88) / 2, 68, 88, 88);

  const headW = 150;
  const headH = 57;
  const head = createCanvas(headW, headH);
  const hctx = head.getContext('2d');
  hctx.fillStyle = '#FFFFFF';
  hctx.fillRect(0, 0, headW, headH);
  hctx.drawImage(logo, headW - 49, 5, 47, 47);

  const rgba = (canvas, w, h) => Buffer.from(canvas.getContext('2d').getImageData(0, 0, w, h).data);
  return {
    sidebar: encodeRgbaToBmp24(sideW, sideH, rgba(side, sideW, sideH)),
    header: encodeRgbaToBmp24(headW, headH, rgba(head, headW, headH))
  };
}

async function ensureIcons(force = false) {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });

  const icoPath = path.join(BUILD_DIR, 'icon.ico');
  const pngPath = path.join(BUILD_DIR, 'icon.png');
  const sidebarPath = path.join(BUILD_DIR, 'installerSidebar.bmp');
  const headerPath = path.join(BUILD_DIR, 'installerHeader.bmp');
  const publicPngPath = path.join(PUBLIC_DIR, 'icon.png');
  const publicFaviconPath = path.join(PUBLIC_DIR, 'favicon.ico');

  const allExist = [icoPath, pngPath, sidebarPath, headerPath, publicPngPath, publicFaviconPath].every((p) =>
    fs.existsSync(p)
  );
  if (allExist && !force && fs.statSync(icoPath).size > 1000) {
    return { success: true, cached: true };
  }

  console.log('[Icons] Gerando ícones e imagens do instalador do Hub Manager a partir de public/icon.svg...');

  // Sem fallback desenhado: se o SVG não renderizar, falha em vez de gerar um logo diferente do oficial.
  const logo = await loadLogo();
  const pngMap = await renderIcons(logo);
  const installer = await renderInstallerImages(logo);

  const icoBuffer = packPngsToIco(
    [256, 128, 64, 48, 32, 16].map((size) => ({ width: size, height: size, buffer: pngMap[size] }))
  );

  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(pngPath, pngMap[512]);
  fs.writeFileSync(sidebarPath, installer.sidebar);
  fs.writeFileSync(headerPath, installer.header);
  fs.writeFileSync(publicPngPath, pngMap[256]);
  fs.writeFileSync(publicFaviconPath, icoBuffer);

  console.log('[Icons] Concluído:');
  for (const p of [icoPath, pngPath, sidebarPath, headerPath, publicPngPath, publicFaviconPath]) {
    console.log(`  - ${p}`);
  }

  return { success: true };
}

if (require.main === module) {
  ensureIcons(true).catch((e) => {
    console.error('[Icons] Erro ao gerar ícones:', e);
    process.exit(1);
  });
}

module.exports = {
  ensureIcons,
  packPngsToIco,
  encodeRgbaToPng,
  encodeRgbaToBmp24
};
