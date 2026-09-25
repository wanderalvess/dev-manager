/**
 * Script de empacotamento com suporte a proxy corporativo (SSL inspection / certificados autoassinados e mirrors estáveis).
 */
// Por padrão em ambiente com proxy corporativo (SSL inspection / certificados autoassinados da TOTVS),
// desativa a rejeição estrita de TLS para o electron-builder e dependências nativas.
if (process.env.CORP_PROXY_INSECURE === '1') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
process.env.ELECTRON_MIRROR = process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/';
process.env.ELECTRON_BUILDER_BINARIES_MIRROR =
  process.env.ELECTRON_BUILDER_BINARIES_MIRROR || 'https://npmmirror.com/mirrors/electron-builder-binaries/';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');

// Carrega credenciais de assinatura de código (CSC_LINK / CSC_KEY_PASSWORD), se existirem.
// Gerado por scripts/generate-codesign-cert.ps1. Sem esse arquivo o build sai sem assinatura.
const codesignEnvPath = path.join(__dirname, '..', '.env.codesign');
if (fs.existsSync(codesignEnvPath)) {
  require('dotenv').config({ path: codesignEnvPath });
  console.log('[Build] Certificado de assinatura de código carregado (.env.codesign).');
} else {
  console.log('[Build] .env.codesign não encontrado — build sairá sem assinatura digital.');
}

// Função auxiliar para download com follow de redirects e suporte a proxy corporativo
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        rejectUnauthorized: false,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      },
      (res) => {
        // Seguir redirects (301, 302, 307, 308)
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
        }

        if (res.statusCode !== 200) {
          return reject(new Error(`Falha HTTP ${res.statusCode} ao baixar ${url}`));
        }

        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close(() => resolve(true));
        });

        fileStream.on('error', (err) => {
          fs.unlink(destPath, () => {});
          reject(err);
        });
      }
    );

    req.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });

    req.setTimeout(30000, () => {
      req.destroy(new Error('Timeout ao baixar arquivo.'));
    });
  });
}

// Pré-carregar nsis-resources se não estiver no cache
async function ensureNsisResources() {
  const nsisCacheDir = path.join(os.homedir(), 'AppData', 'Local', 'electron-builder', 'Cache', 'nsis');
  const targetDir = path.join(nsisCacheDir, 'nsis-resources-3.4.1');
  const target7z = path.join(nsisCacheDir, 'nsis-resources-3.4.1.7z');

  if (fs.existsSync(targetDir) || (fs.existsSync(target7z) && fs.statSync(target7z).size > 500000)) {
    return; // Já está baixado e íntegro
  }

  if (!fs.existsSync(nsisCacheDir)) {
    fs.mkdirSync(nsisCacheDir, { recursive: true });
  }

  console.log('[Build] Pré-baixando nsis-resources-3.4.1.7z diretamente...');
  const urls = [
    'https://npmmirror.com/mirrors/electron-builder-binaries/nsis-resources-3.4.1.7z',
    'https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-resources-3.4.1/nsis-resources-3.4.1.7z'
  ];

  for (const url of urls) {
    try {
      await downloadFile(url, target7z);
      if (fs.existsSync(target7z) && fs.statSync(target7z).size > 100000) {
        console.log('[Build] nsis-resources-3.4.1.7z salvo com sucesso no cache!');
        return;
      }
    } catch (e) {
      console.warn(`[Build] Falha ao baixar de ${url}: ${e.message}. Tentando próximo...`);
    }
  }
}

async function start() {
  try {
    const { ensureIcons } = require('./generate-icons.cjs');
    ensureIcons();
  } catch (err) {
    console.warn('[Build] Aviso ao preparar ícones da aplicação:', err.message);
  }

  try {
    await ensureNsisResources();
  } catch (err) {
    console.warn('[Build] Aviso no pré-download do NSIS:', err.message);
  }

  const args = process.argv.slice(2);
  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  console.log('[Build] Executando electron-builder...');

  const child = spawn(cmd, ['electron-builder', ...args], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
      ELECTRON_MIRROR: process.env.ELECTRON_MIRROR,
      ELECTRON_BUILDER_BINARIES_MIRROR: process.env.ELECTRON_BUILDER_BINARIES_MIRROR
    }
  });

  child.on('close', async (code) => {
    // `--dir` (npm run pack) é build de teste local, não release para distribuir.
    if (code === 0 && !args.includes('--dir')) {
      try {
        const { prepareRelease } = require('./prepare-release.cjs');
        await prepareRelease();
      } catch (err) {
        console.error('[Build] Falha ao gerar LEIA-ME/MCP do release:', err);
        process.exit(1);
      }
    }
    process.exit(code || 0);
  });
}

start();
