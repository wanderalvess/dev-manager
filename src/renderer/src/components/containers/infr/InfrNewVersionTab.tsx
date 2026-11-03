import React, { useEffect, useState } from 'react';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';
import type { InfrAiGuideState } from '../../../hooks/containers/useInfrAiGuide';
import { InfrNewVersionMode } from './newversion/InfrNewVersionMode';
import { InfrNewVersionSentence } from './newversion/InfrNewVersionSentence';
import { InfrAiGuideLine } from './newversion/InfrAiGuideLine';
import { InfrNewVersionAdjust } from './newversion/InfrNewVersionAdjust';
import { InfrNewVersionChecks } from './newversion/InfrNewVersionChecks';
import { InfrNewVersionFooter } from './newversion/InfrNewVersionFooter';

/**
 * Nova versão numa tela só: a frase (nome, versão, origem e banco), a IA numa linha, os Ajustes fechados,
 * "Antes de gerar" com tudo o que o Hub confere e o rodapé com o único Gerar.
 */
export const InfrNewVersionTab: React.FC<{ s: InfrNewVersionState; ai: InfrAiGuideState; distro?: string; onCancel: () => void }> = ({
  s,
  ai,
  distro,
  onCancel
}) => {
  const [adjustOpen, setAdjustOpen] = useState(false);
  const thinking = ai.status === 'thinking';

  // Com a origem conferida e o formulário completo, lê o catálogo sozinho (o ensaio no Karaf leva minutos: só no clique)
  const autoRead = !s.preview && s.busy === null && !thinking && !s.formIssue && !s.origin.blocked && s.form.dryRun !== '1' && s.canPreview;
  useEffect(() => {
    if (!autoRead) return;
    const timer = setTimeout(() => s.runPreview(), 800);
    return () => clearTimeout(timer);
  }, [autoRead]); // eslint-disable-line react-hooks/exhaustive-deps

  // Um ajuste que falta (porta, Oracle) abre os Ajustes para a pessoa achar o campo
  useEffect(() => {
    if (s.formIssue.includes('Ajustes')) setAdjustOpen(true);
  }, [s.formIssue]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <div className="max-w-4xl mx-auto px-5 md:px-6 py-8 space-y-6">
          <section aria-label="O ambiente novo" className="space-y-3">
            <InfrNewVersionMode s={s} />
            <InfrNewVersionSentence s={s} filled={ai.filled} onEdited={ai.unmark} />
            <p className="text-xs text-muted-foreground">
              O Hub monta o ambiente novo ao lado, com banco, WTA e WSH próprios, a partir de um que já funciona. A origem não é alterada.
            </p>
            <InfrAiGuideLine ai={ai} blocked={s.origin.blocked && !!s.origin.result} />
            <InfrNewVersionAdjust s={s} open={adjustOpen} onToggle={() => setAdjustOpen((o) => !o)} />
          </section>

          <InfrNewVersionChecks s={s} distro={distro} />

          {s.message && <p className="text-xs text-foreground/80 p-3 rounded-xl bg-muted/40 break-words">{s.message}</p>}
        </div>
      </div>

      <InfrNewVersionFooter
        s={s}
        aiReady={ai.status === 'confirm'}
        onGenerate={() => (ai.status === 'confirm' ? ai.confirmGenerate() : s.generate())}
        onCancel={onCancel}
      />
    </div>
  );
};
