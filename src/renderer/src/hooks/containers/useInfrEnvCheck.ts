import { useCallback, useEffect, useRef, useState } from 'react';
import type { InfrCheckCommandId, InfrEnvCheck } from '../../../../shared/infrEnvCheck';
import { wtaHostPort } from '../../../../shared/infrEnvCheck';

/** Verificação de um ambiente: lê o estado pelo Hub, repete a cada 15 s se pedido e abre os comandos no terminal. */
export function useInfrEnvCheck(distro: string | undefined, initialName: string) {
  const [name, setName] = useState(initialName);
  const [result, setResult] = useState<InfrEnvCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(true);
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  useEffect(() => setName(initialName), [initialName]);

  const check = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.checkInfrEnvironment || !name.trim() || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      setResult(await api.checkInfrEnvironment({ distro, name: name.trim() }));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [distro, name]);

  // Lê quando o nome para de mudar (não a cada letra digitada)
  useEffect(() => {
    setResult(null);
    if (!name.trim()) return;
    const timer = setTimeout(check, 600);
    return () => clearTimeout(timer);
  }, [name, distro]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enquanto sobe, repete sozinho; para quando está no ar ou falhou
  const status = result?.summary?.status;
  useEffect(() => {
    if (!auto || !name.trim() || status === 'ok' || status === 'fail') return;
    const timer = setInterval(check, 15000);
    return () => clearInterval(timer);
  }, [auto, check, name, status]);

  const wtaPort = wtaHostPort(result?.containers.find((c) => c.role === 'wta')?.ports ?? []);

  const run = async (id: InfrCheckCommandId) => {
    const res = await window.electronAPI?.openInfrCheckTerminal?.({ distro, name: name.trim(), id, wtaPort });
    setMessage(res?.output ?? 'Executar não está disponível neste modo; use Copiar.');
  };

  return { name, setName, result, loading, auto, setAuto, check, run, wtaPort, message };
}

export type InfrEnvCheckState = ReturnType<typeof useInfrEnvCheck>;
