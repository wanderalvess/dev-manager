import { useCallback, useEffect, useRef, useState } from 'react';
import type { InfrFirstStepsActionRequest, InfrFirstStepsResult } from '../../../../shared/infrFirstSteps';
import { INFR_DISTRO_INSTALL_DIR, INFR_DISTRO_NAME, firstStepsContainers } from '../../../../shared/infrFirstStepsCommands';
import { isValidWinthorVersion, winthorVersionPorts } from '../../../../shared/infrWinthorVersion';

const REFRESH_MS = 20000;

/**
 * Primeiros passos: lê o checklist pelo Hub (repete enquanto a aba está aberta e algo falta) e
 * dispara as ações (instalar o WSL, importar a distro, clonar, subir banco/WTA/WSH, importar o dump).
 */
export function useInfrFirstSteps(distro: string | undefined, infrPath: string | undefined, active: boolean, onVerify: (name: string) => void) {
  const [version, setVersion] = useState('39');
  const [result, setResult] = useState<InfrFirstStepsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [tar, setTar] = useState({ path: '', name: INFR_DISTRO_NAME, dir: INFR_DISTRO_INSTALL_DIR });
  const [importStartedAt, setImportStartedAt] = useState<number | null>(null);
  const [dump, setDump] = useState({ file: '', schema: '', codclipc: '' });
  const busy = useRef(false);

  const check = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.checkInfrFirstSteps || !isValidWinthorVersion(version) || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      setResult(await api.checkInfrFirstSteps({ distro, infrPath, version }));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [distro, infrPath, version]);

  // Lê ao abrir a aba e quando a versão para de mudar
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(check, 400);
    return () => clearTimeout(timer);
  }, [active, version, distro, infrPath]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enquanto falta algo, confere de novo sozinho (a pessoa age fora do Hub: terminal, Drive, instalador)
  const allOk = !!result?.steps.length && result.steps.every((s) => s.status === 'ok');
  useEffect(() => {
    if (!active || allOk || importStartedAt) return;
    const timer = setInterval(check, REFRESH_MS);
    return () => clearInterval(timer);
  }, [active, allOk, importStartedAt, check]);

  const later = () => setTimeout(check, 3000);

  const action = async (req: InfrFirstStepsActionRequest) => {
    const res = await window.electronAPI?.runInfrFirstStepsAction?.(req);
    setMessage(res?.output ?? 'Esta ação só funciona no aplicativo; use Copiar.');
    later();
  };

  const startDocker = async () => {
    const d = result?.probe?.distro;
    if (!d || !window.electronAPI?.startWslDockerDaemon) return;
    setMessage(`Iniciando o Docker na ${d}...`);
    const res = await window.electronAPI.startWslDockerDaemon(d);
    setMessage(res.message || (res.success ? 'Docker iniciado.' : 'Não foi possível iniciar o Docker.'));
    later();
  };

  const pickTar = async () => {
    const file = await window.electronAPI?.selectFile?.({ filters: [{ name: 'Distro WSL', extensions: ['tar'] }] });
    if (file) setTar((t) => ({ ...t, path: file }));
  };

  const importDistro = async () => {
    if (!window.electronAPI?.importWslSnapshot || !tar.path.trim()) return;
    setImportStartedAt(Date.now());
    setMessage('');
    try {
      const res = await window.electronAPI.importWslSnapshot({ distroName: tar.name.trim(), installDir: tar.dir.trim(), tarPath: tar.path.trim() });
      setMessage(res.success ? res.message || 'Distro importada.' : res.error || 'Falha ao importar a distro.');
    } finally {
      setImportStartedAt(null);
      check();
    }
  };

  /** Banco, WTA e WSH da versão pelos scripts do INFR-Docker, com os nomes e portas dela. */
  const runSetup = async (kind: 'oracle' | 'wta' | 'wsh') => {
    if (!window.electronAPI?.runInfrSetupScript) return;
    const c = firstStepsContainers(version);
    const ports = winthorVersionPorts(version);
    const opts = {
      distro: result?.probe?.distro,
      infrPath,
      winthorVersion: version,
      containerName: kind === 'oracle' ? c.oracle : kind === 'wta' ? c.wta : undefined,
      port: kind === 'oracle' ? ports.oracle : kind === 'wta' ? ports.web : undefined
    };
    const res = await window.electronAPI.runInfrSetupScript(kind, opts);
    setMessage(res.success ? 'Terminal aberto. Acompanhe por lá; esta tela confere sozinha a cada 20 s.' : res.output);
    later();
  };

  const openUrl = (url: string) => window.electronAPI?.openExternal?.(url);
  const openFolder = async (which: 'dumps' | 'opt') => {
    const api = window.electronAPI;
    const res = which === 'dumps' ? await api?.openWslDumpsFolder?.(result?.probe?.distro) : await api?.openWslOptFolder?.(result?.probe?.distro);
    setMessage(res ? (res.success ? `Pasta aberta: ${res.path}` : res.error || 'Não foi possível abrir a pasta.') : 'Só no aplicativo.');
  };

  return {
    version,
    setVersion: (v: string) => setVersion(v.replace(/\D/g, '').slice(0, 3)),
    result,
    loading,
    message,
    check,
    action,
    startDocker,
    tar,
    setTar,
    pickTar,
    importDistro,
    importStartedAt,
    dump,
    setDump,
    runSetup,
    openUrl,
    openFolder,
    verify: () => onVerify(version),
    infrPath,
    distro: result?.probe?.distro ?? distro
  };
}

export type InfrFirstStepsState = ReturnType<typeof useInfrFirstSteps>;
