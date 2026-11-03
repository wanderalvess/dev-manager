import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activeEnvGroup, type ActiveEnvInfo, type InfrActiveEnvList } from '../../../../shared/infrActiveEnv';
import type { ContainerEnvironment } from '../../../../shared/types';

/**
 * Ambiente ativo da tela WinThor & WSL: lista os ambientes da distro com as portas reais, aplica a escolha
 * nas Configurações e dá ao resto da tela o grupo (oracle, wta, wsh) para subir e o nome para a topologia.
 * Relê quando os containers mudam de estado (o `signature` da lista), sem repetir a cada poll.
 */
export function useActiveEnvironment(distro: string | undefined, signature: string) {
  const [list, setList] = useState<InfrActiveEnvList | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.listInfrActiveEnvironments || busy.current) return;
    busy.current = true;
    setLoading(true);
    try {
      setList(await api.listInfrActiveEnvironments(distro));
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [distro]);

  useEffect(() => {
    const timer = setTimeout(refresh, 800);
    return () => clearTimeout(timer);
  }, [refresh, signature]);

  const apply = async (name: string) => {
    const api = window.electronAPI;
    if (!api?.applyInfrActiveEnvironment || !api?.clearInfrActiveEnvironment) return;
    if (!name) {
      await api.clearInfrActiveEnvironment();
      setMessage('Sem ambiente ativo: o Hub volta a detectar pelos nomes.');
    } else {
      const res = await api.applyInfrActiveEnvironment({ distro, name });
      if (!res.success) setMessage(res.error ?? 'Não foi possível usar este ambiente.');
      else {
        const what = res.changes.length ? res.changes.map((c) => `${c.label}: ${c.to}`).join(' · ') : 'As Configurações já apontavam para ele.';
        setMessage(`${name}: ${what}${res.note ? ` ${res.note}` : ''}`);
      }
    }
    await refresh();
  };

  const active: ActiveEnvInfo | undefined = useMemo(() => list?.environments.find((e) => e.name === list.active), [list]);
  const group: ContainerEnvironment | undefined = useMemo(() => (active ? activeEnvGroup(active, list?.distro) : undefined), [active, list?.distro]);

  /** Mostra um aviso sob o seletor (ex.: o WSH que não subiu e por quê) */
  const notify = useCallback((text: string) => setMessage(text), []);

  return { list, loading, message, notify, refresh, apply, active, group, activeName: active?.name };
}

export type ActiveEnvironmentState = ReturnType<typeof useActiveEnvironment>;
