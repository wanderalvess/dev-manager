import { useCallback, useRef, useState } from 'react';

/**
 * Relatório para suporte de um ambiente: o Hub junta pasta do INFR-Docker, scripts, containers e logs (com as senhas
 * escondidas), copia para a área de transferência e guarda um arquivo. `run` aceita o que a tela registrou do lado dela.
 */
export function useInfrDiagnostic(distro: string | undefined, infrPath: string | undefined) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [text, setText] = useState('');
  const running = useRef(false);

  const run = useCallback(
    async (name: string, extra?: { version?: string; notes?: string }) => {
      const api = window.electronAPI;
      if (!api?.buildInfrDiagnostic || !name.trim() || running.current) return;
      running.current = true;
      setBusy(true);
      setMessage('');
      setText('');
      try {
        const res = await api.buildInfrDiagnostic({ distro, infrPath, name: name.trim(), ...extra });
        if (!res.success || !res.text) {
          setMessage(res.error || 'Não foi possível montar o relatório.');
          return;
        }
        let copied = false;
        try {
          await navigator.clipboard.writeText(res.text);
          copied = true;
        } catch {
          // sem permissão para a área de transferência: o texto fica na tela para copiar à mão
        }
        if (!copied) setText(res.text);
        const lines = res.text.split('\n').length;
        setMessage(
          `${copied ? 'Relatório copiado' : 'Relatório pronto, mas o navegador não deixou copiar: use o texto abaixo'} (${lines} linhas).` +
            `${res.path ? ` Também salvo em ${res.path}.` : ''} Cole na conversa com o suporte.`
        );
      } finally {
        running.current = false;
        setBusy(false);
      }
    },
    [distro, infrPath]
  );

  return { busy, message, text, run };
}

export type InfrDiagnosticState = ReturnType<typeof useInfrDiagnostic>;
