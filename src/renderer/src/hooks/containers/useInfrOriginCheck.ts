import { useCallback, useEffect, useRef, useState } from 'react';
import { isValidEnvName } from '../../../../shared/infrWinthorVersion';
import { originCheckBlocks, type InfrOriginCheck } from '../../../../shared/infrOriginCheck';

/**
 * Conferência da origem no passo 1: assim que a origem é escolhida, o Hub confere a pasta, o WTA e o
 * login, e o passo 1 só libera o Próximo quando passa. O usuário e a senha do WTA podem ser salvos ali.
 */
export function useInfrOriginCheck(distro: string | undefined, infrPath: string | undefined, from: string) {
  const [result, setResult] = useState<InfrOriginCheck | null>(null);
  const [loading, setLoading] = useState(false);
  const run = useRef(0);

  const check = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.checkInfrOrigin || !isValidEnvName(from)) return;
    const id = ++run.current;
    setLoading(true);
    try {
      const res = await api.checkInfrOrigin({ distro, infrPath, fromEnv: from });
      if (id === run.current) setResult(res);
    } finally {
      if (id === run.current) setLoading(false);
    }
  }, [distro, infrPath, from]);

  useEffect(() => {
    setResult(null);
    if (!isValidEnvName(from)) return;
    const timer = setTimeout(check, 400);
    return () => clearTimeout(timer);
  }, [check, from]);

  /** Salva o usuário e a senha nas Configurações (Rotinas WinThor) e confere de novo. */
  const saveCredentials = async (login: string, password: string): Promise<string | null> => {
    const api = window.electronAPI;
    if (!api?.saveSettings) return 'Não foi possível salvar neste modo.';
    if (!login.trim() || !password.trim()) return 'Informe o usuário e a senha.';
    await api.saveSettings({ wtaLogin: login.trim(), wtaPassword: password });
    await check();
    return null;
  };

  const blocked = !result || !result.success || originCheckBlocks(result.items);
  return { result, loading, check, saveCredentials, blocked };
}

export type InfrOriginCheckState = ReturnType<typeof useInfrOriginCheck>;
