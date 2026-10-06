/**
 * Gerador e validador de ícones da aplicação Hub Manager (.ico, .png, .svg).
 * Tema: Foguete Tech Futurista / Cyberpunk Cockpit.
 * Garante que build/icon.ico, build/icon.png e public/icon.png estejam presentes
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
 * Desenha a cena do Foguete Tech usando Canvas 2D
 */
function drawRocketScene(ctx, size) {
  const s = size / 512;
  ctx.save();
  ctx.scale(s, s);

  // 1. Fundo Squircle Arredondado (dusk indigo, mais claro/quente que o preto anterior)
  const x = 24, y = 24, w = 464, h = 464, r = 108;
  const bgGrad = ctx.createLinearGradient(0, 0, 512, 512);
  bgGrad.addColorStop(0, '#1E1B4B');
  bgGrad.addColorStop(0.55, '#161533');
  bgGrad.addColorStop(1, '#0B1024');

  const path2 = () => {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  };
  path2();
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.save();
  path2();
  ctx.clip();

  // 2. Fonte de luz distante (o farol que o foguete persegue) no canto superior esquerdo
  const sunGlow = ctx.createRadialGradient(120, 120, 0, 120, 120, 190);
  sunGlow.addColorStop(0, 'rgba(253,230,138,0.5)');
  sunGlow.addColorStop(1, 'rgba(253,230,138,0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(120, 120, 190, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFF7E0';
  ctx.beginPath();
  ctx.arc(120, 120, 22, 0, Math.PI * 2);
  ctx.fill();

  // 3. Trilhas de Circuito Tech no Fundo
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(64, 160); ctx.lineTo(120, 160); ctx.lineTo(160, 200); ctx.lineTo(160, 280);
  ctx.moveTo(80, 380); ctx.lineTo(140, 380); ctx.lineTo(180, 340); ctx.lineTo(180, 300);
  ctx.moveTo(400, 120); ctx.lineTo(350, 120); ctx.lineTo(320, 150);
  ctx.moveTo(440, 280); ctx.lineTo(380, 280); ctx.lineTo(340, 320); ctx.lineTo(340, 400);
  ctx.stroke();
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath(); ctx.arc(160, 280, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(180, 300, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(320, 150, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(340, 400, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // 4. Foguete Inclinado 45° (em direção ao canto superior direito)
  ctx.save();
  ctx.translate(256, 256);
  ctx.rotate(-Math.PI / 4);
  ctx.translate(-256, -256);

  // Centelhas / Partículas de Propulsão
  ctx.save();
  ctx.shadowColor = '#67E8F9';
  ctx.shadowBlur = 8;
  const particles = [
    [256, 430, 5, '#67E8F9'],
    [240, 460, 4, '#38BDF8'],
    [272, 455, 4, '#A855F7'],
    [230, 490, 3, '#C084FC'],
    [282, 485, 3, '#22D3EE'],
    [256, 510, 2.5, '#FFFFFF'],
    [215, 440, 3.5, '#67E8F9'],
    [295, 440, 3.5, '#A855F7']
  ];
  for (const [px, py, pr, pcolor] of particles) {
    ctx.fillStyle = pcolor;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Chamas Laterais de Plasma
  const sideGrad = ctx.createLinearGradient(0, 375, 0, 470);
  sideGrad.addColorStop(0, '#A5F3FC');
  sideGrad.addColorStop(0.4, '#38BDF8');
  sideGrad.addColorStop(0.8, '#A855F7');
  sideGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
  ctx.fillStyle = sideGrad;
  ctx.beginPath();
  ctx.moveTo(205, 375);
  ctx.quadraticCurveTo(195, 440, 185, 470);
  ctx.quadraticCurveTo(205, 430, 215, 375);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(307, 375);
  ctx.quadraticCurveTo(317, 440, 327, 470);
  ctx.quadraticCurveTo(307, 430, 297, 375);
  ctx.fill();

  // Chama Principal de Plasma
  const mainFlameGrad = ctx.createLinearGradient(0, 380, 0, 500);
  mainFlameGrad.addColorStop(0, '#FFFFFF');
  mainFlameGrad.addColorStop(0.2, '#67E8F9');
  mainFlameGrad.addColorStop(0.55, '#06B6D4');
  mainFlameGrad.addColorStop(0.85, '#818CF8');
  mainFlameGrad.addColorStop(1, 'rgba(192, 132, 252, 0)');
  ctx.fillStyle = mainFlameGrad;
  ctx.beginPath();
  ctx.moveTo(234, 380);
  ctx.quadraticCurveTo(215, 450, 256, 500);
  ctx.quadraticCurveTo(297, 450, 278, 380);
  ctx.fill();

  // Núcleo Branco Superaquecido
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(244, 380);
  ctx.quadraticCurveTo(235, 430, 256, 460);
  ctx.quadraticCurveTo(277, 430, 268, 380);
  ctx.fill();

  // Asas / Estabilizadores
  const wingGrad = ctx.createLinearGradient(160, 300, 350, 380);
  wingGrad.addColorStop(0, '#7DD3FC');
  wingGrad.addColorStop(0.4, '#38BDF8');
  wingGrad.addColorStop(1, '#1E3A5F');
  ctx.fillStyle = wingGrad;
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2;
  // Asa Esquerda
  ctx.beginPath();
  ctx.moveTo(220, 280); ctx.lineTo(160, 360); ctx.lineTo(166, 385); ctx.lineTo(216, 360);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(160, 360); ctx.lineTo(220, 280);
  ctx.stroke();
  ctx.restore();

  // Asa Direita
  ctx.beginPath();
  ctx.moveTo(292, 280); ctx.lineTo(352, 360); ctx.lineTo(346, 385); ctx.lineTo(296, 360);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(352, 360); ctx.lineTo(292, 280);
  ctx.stroke();
  ctx.restore();

  // Motores (Bocais de Escape)
  ctx.fillStyle = '#1E293B';
  ctx.strokeStyle = '#06B6D4';
  ctx.lineWidth = 1.5;
  ctx.fillRect(200, 365, 18, 15); ctx.strokeRect(200, 365, 18, 15);
  ctx.fillRect(294, 365, 18, 15); ctx.strokeRect(294, 365, 18, 15);
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#22D3EE';
  ctx.lineWidth = 2;
  ctx.fillRect(236, 375, 40, 15); ctx.strokeRect(236, 375, 40, 15);

  // Fuselagem do Foguete (Corpo Central Ogival)
  const fuseGrad = ctx.createLinearGradient(218, 86, 296, 375);
  fuseGrad.addColorStop(0, '#FFFFFF');
  fuseGrad.addColorStop(0.2, '#FDE68A');
  fuseGrad.addColorStop(0.5, '#CBD5E1');
  fuseGrad.addColorStop(0.8, '#64748B');
  fuseGrad.addColorStop(1, '#334155');
  ctx.fillStyle = fuseGrad;
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(256, 86);
  ctx.bezierCurveTo(220, 150, 216, 260, 218, 375);
  ctx.lineTo(294, 375);
  ctx.bezierCurveTo(296, 260, 292, 150, 256, 86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Linha de centro
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(256, 86); ctx.lineTo(256, 375);
  ctx.stroke();

  // Linhas tech horizontais
  ctx.beginPath();
  ctx.moveTo(226, 210); ctx.quadraticCurveTo(256, 220, 286, 210);
  ctx.moveTo(220, 310); ctx.quadraticCurveTo(256, 324, 292, 310);
  ctx.stroke();

  // Acentos Neon Violeta na Fuselagem
  ctx.save();
  ctx.strokeStyle = '#A855F7';
  ctx.shadowColor = '#A855F7';
  ctx.shadowBlur = 6;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(228, 235); ctx.lineTo(228, 290);
  ctx.moveTo(284, 235); ctx.lineTo(284, 290);
  ctx.stroke();
  ctx.restore();

  // Nariz Tech com Ponta Luminescente
  ctx.fillStyle = '#38BDF8';
  ctx.beginPath();
  ctx.moveTo(256, 86); ctx.lineTo(250, 135); ctx.lineTo(262, 135);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#67E8F9';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(256, 80); ctx.lineTo(256, 105);
  ctx.stroke();

  // Cockpit HUD / Visor Redondo
  ctx.fillStyle = '#0B0F17';
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(256, 180, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Lente do HUD Visor
  const hudGrad = ctx.createRadialGradient(252, 176, 2, 256, 180, 22);
  hudGrad.addColorStop(0, '#67E8F9');
  hudGrad.addColorStop(0.45, '#06B6D4');
  hudGrad.addColorStop(0.85, '#0369A1');
  hudGrad.addColorStop(1, '#0C4A6E');
  ctx.fillStyle = hudGrad;
  ctx.beginPath();
  ctx.arc(256, 180, 20, 0, Math.PI * 2);
  ctx.fill();

  // Retículo HUD dentro do visor
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(248, 180); ctx.lineTo(264, 180);
  ctx.moveTo(256, 172); ctx.lineTo(256, 188);
  ctx.stroke();

  // Reflexo no vidro
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.ellipse(252, 174, 6, 3, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Fim da rotação do foguete

  // 5. Linha de reflexo perto da base (refletindo a luz do foguete)
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(70, 420);
  ctx.lineTo(442, 420);
  ctx.stroke();
  const reflGlow = ctx.createRadialGradient(360, 420, 0, 360, 420, 90);
  reflGlow.addColorStop(0, 'rgba(253, 230, 138, 0.35)');
  reflGlow.addColorStop(1, 'rgba(253, 230, 138, 0)');
  ctx.fillStyle = reflGlow;
  ctx.beginPath();
  ctx.arc(360, 420, 90, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Fim do clip do squircle

  // 6. Borda Neon Ciano Iluminada (por cima do clip, para não cortar o traço)
  const borderGrad = ctx.createLinearGradient(0, 0, 512, 512);
  borderGrad.addColorStop(0, '#22D3EE');
  borderGrad.addColorStop(0.5, '#38BDF8');
  borderGrad.addColorStop(1, '#818CF8');
  path2();
  ctx.lineWidth = 5;
  ctx.strokeStyle = borderGrad;
  ctx.stroke();

  ctx.restore(); // Fim da escala
}

/**
 * Renderizador de alta qualidade usando @napi-rs/canvas quando disponível
 */
function renderWithCanvas() {
  const { createCanvas, Image } = require('@napi-rs/canvas');
  const svgPath = path.join(PUBLIC_DIR, 'icon.svg');

  const sizes = [512, 256, 128, 64, 48, 32, 16];
  const rendered = {};

  let svgImage = null;
  try {
    if (fs.existsSync(svgPath)) {
      const svgBuf = fs.readFileSync(svgPath);
      svgImage = new Image();
      svgImage.src = svgBuf;
    }
  } catch {
    svgImage = null;
  }

  for (const size of sizes) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (svgImage && svgImage.width > 0 && svgImage.height > 0) {
      ctx.drawImage(svgImage, 0, 0, size, size);
    } else {
      drawRocketScene(ctx, size);
    }
    rendered[size] = canvas.toBuffer('image/png');
  }

  return rendered;
}

/**
 * Renderizador de emergência caso @napi-rs/canvas não esteja disponível
 */
function renderFallback(size) {
  const buf = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const rMax = size * 0.44;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      const cornerR = size * 0.22;
      const ox = Math.max(0, dx - (cx - cornerR));
      const oy = Math.max(0, dy - (cy - cornerR));
      const distCorner = Math.sqrt(ox * ox + oy * oy);

      if (distCorner > cornerR) {
        buf[idx] = 0;
        buf[idx + 1] = 0;
        buf[idx + 2] = 0;
        buf[idx + 3] = 0;
        continue;
      }

      // Fundo escuro azul/roxo
      const t = (x + y) / (size * 2);
      let red = Math.round(15 * (1 - t) + 24 * t);
      let green = Math.round(23 * (1 - t) + 21 * t);
      let blue = Math.round(42 * (1 - t) + 46 * t);

      // Borda neon ciano
      if (distCorner > cornerR - Math.max(2, size * 0.02)) {
        red = 34;
        green = 211;
        blue = 238;
      }

      // Foguete diagonal simplificado no fallback (diagonal de baixo-esquerda para cima-direita)
      const u = (x - cx) / size;
      const v = (y - cy) / size;
      // Rotaciona 45 graus para coordenadas do foguete (rx: ao longo do foguete, ry: lateral)
      const rx = (u + v) * 0.7071; // cauda para nariz
      const ry = (v - u) * 0.7071; // lateral

      // Nariz / corpo do foguete: rx de -0.25 a +0.28, ry estreito
      if (rx >= -0.22 && rx <= 0.32) {
        const bodyWidth = 0.08 * (1 - (rx / 0.35) * (rx / 0.35));
        if (Math.abs(ry) <= bodyWidth) {
          red = 148;
          green = 163;
          blue = 184;
          // Centro mais claro
          if (Math.abs(ry) < 0.02) {
            red = 226; green = 232; blue = 240;
          }
        }
        // Visor HUD circular
        const vdist = Math.hypot(rx - 0.1, ry);
        if (vdist <= 0.035) {
          red = 6; green = 182; blue = 212;
        }
      }

      // Asas
      if (rx >= -0.22 && rx <= -0.05) {
        const wingExtent = 0.20 * (-rx / 0.22);
        if (Math.abs(ry) <= wingExtent && Math.abs(ry) >= 0.06) {
          red = 56; green = 189; blue = 248;
        }
      }

      // Chama de plasma (atrás do foguete rx < -0.22)
      if (rx < -0.22 && rx >= -0.42) {
        const flameWidth = 0.06 * (1 - (-rx - 0.22) / 0.20);
        if (Math.abs(ry) <= flameWidth) {
          red = 103; green = 232; blue = 249;
          if (Math.abs(ry) < 0.02) {
            red = 255; green = 255; blue = 255;
          }
        }
      }

      buf[idx] = red;
      buf[idx + 1] = green;
      buf[idx + 2] = blue;
      buf[idx + 3] = 255;
    }
  }

  return encodeRgbaToPng(size, size, buf);
}

function ensureIcons(force = false) {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }

  const icoPath = path.join(BUILD_DIR, 'icon.ico');
  const pngPath = path.join(BUILD_DIR, 'icon.png');
  const publicPngPath = path.join(PUBLIC_DIR, 'icon.png');
  const publicFaviconPath = path.join(PUBLIC_DIR, 'favicon.ico');

  const allExist =
    fs.existsSync(icoPath) &&
    fs.existsSync(pngPath) &&
    fs.existsSync(publicPngPath) &&
    fs.existsSync(publicFaviconPath);

  if (allExist && !force) {
    const stat = fs.statSync(icoPath);
    if (stat.size > 1000) {
      return { success: true, cached: true };
    }
  }

  console.log('[Icons] Gerando ícones Foguete Tech da aplicação Hub Manager (.ico / .png)...');

  let pngMap = {};
  let usedCanvas = false;

  try {
    pngMap = renderWithCanvas();
    usedCanvas = true;
    console.log('[Icons] Renderizado com sucesso via @napi-rs/canvas.');
  } catch (err) {
    console.warn('[Icons] Aviso: @napi-rs/canvas não disponível, usando renderizador fallback puro:', err.message);
    pngMap[512] = renderFallback(512);
    pngMap[256] = renderFallback(256);
    pngMap[128] = renderFallback(128);
    pngMap[64] = renderFallback(64);
    pngMap[48] = renderFallback(48);
    pngMap[32] = renderFallback(32);
    pngMap[16] = renderFallback(16);
  }

  // Monta o arquivo ICO multi-resolução para Windows
  const icoImages = [
    { width: 256, height: 256, buffer: pngMap[256] },
    { width: 128, height: 128, buffer: pngMap[128] },
    { width: 64, height: 64, buffer: pngMap[64] },
    { width: 48, height: 48, buffer: pngMap[48] },
    { width: 32, height: 32, buffer: pngMap[32] },
    { width: 16, height: 16, buffer: pngMap[16] }
  ];
  const icoBuffer = packPngsToIco(icoImages);

  // Salva build/icon.ico e build/icon.png
  fs.writeFileSync(icoPath, icoBuffer);
  fs.writeFileSync(pngPath, pngMap[512]);

  // Salva public/icon.png e public/favicon.ico
  fs.writeFileSync(publicPngPath, pngMap[256]);
  fs.writeFileSync(publicFaviconPath, icoBuffer);

  console.log(`[Icons] Concluído:`);
  console.log(`  - ${icoPath} (${icoBuffer.length} bytes)`);
  console.log(`  - ${pngPath} (${pngMap[512].length} bytes)`);
  console.log(`  - ${publicPngPath} (${pngMap[256].length} bytes)`);
  console.log(`  - ${publicFaviconPath}`);

  return { success: true, usedCanvas };
}

if (require.main === module) {
  try {
    ensureIcons(true);
  } catch (e) {
    console.error('[Icons] Erro ao gerar ícones:', e);
    process.exit(1);
  }
}

module.exports = {
  ensureIcons,
  packPngsToIco,
  encodeRgbaToPng
};
