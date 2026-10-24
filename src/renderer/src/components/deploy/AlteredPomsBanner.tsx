import React, { useState } from 'react';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';
import { dismissAlteredPom, revertAlteredPom, useAlteredPoms } from '../../hooks/deploy/useAlteredPoms';
import type { AlteredPom } from '../../utils/alteredPoms';
import { requestConfirm } from '../ui/confirmService';
import { showToast } from '../ToastHost';

/**
 * Alerta fixo enquanto houver pom.xml alterado só para teste local. Some quando o operador reverte pelo app ou diz que
 * já reverteu por fora; o commit rápido do Git também avisa (e exige confirmação) se o pom estiver entre os arquivos.
 */
export const AlteredPomsBanner: React.FC = () => {
  const entries = useAlteredPoms();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (entries.length === 0) return null;

  const revert = async (e: AlteredPom) => {
    if (!e.previousValue) return;
    const ok = await requestConfirm({
      title: 'Reverter o pom.xml?',
      message: `A dependência "${e.artifactId}" volta para ${e.previousValue}.`,
      details: e.pomPath,
      confirmLabel: 'Reverter',
      tone: 'warning'
    });
    if (!ok) return;
    setBusyId(e.id);
    try {
      const res = await revertAlteredPom(e);
      if (!res.success) {
        showToast(res.error || 'Não foi possível reverter o pom.xml.', 'error');
        return;
      }
      showToast(res.removedBackup ? 'pom.xml revertido e pom.xml.bak removido.' : 'pom.xml revertido. Apague o pom.xml.bak ao lado, se ainda existir.', 'success');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      role="alert"
      className="shrink-0 rounded-xl bg-danger/10 p-3 space-y-2 text-xs"
      data-testid="altered-poms-banner"
    >
      <p className="font-bold text-danger flex items-center gap-1.5">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        {entries.length === 1 ? 'pom.xml alterado para teste local' : `${entries.length} pom.xml alterados para teste local`}
        : NÃO COMMITE ESSA ALTERAÇÃO
      </p>
      {entries.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center gap-2 pl-5.5">
          <div className="flex-1 min-w-0">
            <p className="text-foreground">
              <span className="font-mono font-semibold">{e.artifactId}</span>{' '}
              <span className="font-mono text-muted-foreground">
                {e.from} → <span className="text-warning font-semibold">{e.to}</span>
              </span>
              {e.viaProperty && <span className="text-muted-foreground"> (propriedade {e.viaProperty})</span>}
            </p>
            <p className="text-2xs font-mono text-muted-foreground truncate" title={e.pomPath}>
              {e.pomPath}
            </p>
          </div>
          <button
            type="button"
            disabled={!e.previousValue || busyId === e.id}
            onClick={() => void revert(e)}
            title={e.previousValue ? `Voltar para ${e.previousValue}` : 'Sem o valor original: restaure o pom.xml.bak manualmente'}
            className="px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted text-2xs font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Reverter
          </button>
          <button
            type="button"
            onClick={() => dismissAlteredPom(e.id)}
            title="Já revertido por fora (git checkout, restaurando o .bak...): remove este alerta"
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
            aria-label="Dispensar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
