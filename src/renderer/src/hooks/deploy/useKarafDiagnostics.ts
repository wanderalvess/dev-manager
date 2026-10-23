import { useState } from 'react';
import { useKarafConsole } from '../karafConsole/KarafConsoleContext';
import { buildDiagnosticResultLines } from '../../utils/deployProfileUtils';

/**
 * Roda comandos de diagnóstico no Karaf (client.bat) e escreve a saída no console global.
 * Compartilhado pelo Deploy (diagnóstico sugerido após uma falha) e pela tela Karaf (diagnósticos rápidos).
 * `isBlocked` impede iniciar um diagnóstico enquanto outra coisa (ex.: um deploy) está rodando.
 */
export function useKarafDiagnostics(isBlocked: boolean) {
  const { setOpen: setConsoleOpen, setLogs, streamRemainderRef, flushRemainder } = useKarafConsole();
  const [isDiagRunning, setIsDiagRunning] = useState<string | null>(null);

  const runDiagnostic = async (cmd: string, label: string) => {
    if (isBlocked || isDiagRunning) return;
    setIsDiagRunning(label);
    // Abre o dock (a saída ficava invisível com o console recolhido) e acrescenta ao buffer, sem apagar o que já estava lá.
    setConsoleOpen(true);
    streamRemainderRef.current = '';
    setLogs((prev) => [...prev, `--- Executando Diagnóstico: ${cmd} ---\r\n`]);

    try {
      const res = await window.electronAPI.execKarafDiagnostic(cmd);
      const extra = buildDiagnosticResultLines(cmd, res);
      if (extra.length > 0) setLogs((prev) => [...prev, ...extra]);
    } catch (err: any) {
      setLogs((prev) => [...prev, `[ERRO] ${err?.message || err}\r\n`]);
    } finally {
      flushRemainder();
      setIsDiagRunning(null);
    }
  };

  const abortDiagnostic = async () => {
    if (window.electronAPI?.abortKarafDiagnostic) {
      await window.electronAPI.abortKarafDiagnostic();
    }
    setLogs((prev) => [...prev, '\r\n🛑 [INTERROMPIDO] Comando cancelado pelo usuário.\r\n']);
    setIsDiagRunning(null);
  };

  return { isDiagRunning, runDiagnostic, abortDiagnostic };
}
