import React, { useEffect, useRef, useState } from 'react';
import type { InfrNewVersionState } from '../../../hooks/containers/useInfrNewVersion';
import type { InfrAiGuideState } from '../../../hooks/containers/useInfrAiGuide';
import type { InfrDiagnosticState } from '../../../hooks/containers/useInfrDiagnostic';
import { InfrDiagnosticButton } from './InfrDiagnosticButton';
import { InfrNewVersionMode } from './newversion/InfrNewVersionMode';
import { InfrNewVersionOrigin } from './newversion/InfrNewVersionOrigin';
import { InfrNewVersionFields } from './newversion/InfrNewVersionFields';
import { InfrAiGuideLine } from './newversion/InfrAiGuideLine';
import { InfrNewVersionAdjust } from './newversion/InfrNewVersionAdjust';
import { InfrNewVersionChecks } from './newversion/InfrNewVersionChecks';
import { InfrNewVersionFooter } from './newversion/InfrNewVersionFooter';

/**
 * Nova versão numa tela só, na ordem em que se decide: a IA como atalho, 1 de onde copiar, 2 o que fazer com ele,
 * 3 o ambiente novo (nome, versão e banco), os Ajustes fechados, "Antes de criar" com tudo o que o Hub confere e o
 * rodapé com o único Criar.
 */
export const InfrNewVersionTab: React.FC<{ s: InfrNewVersionState; ai: InfrAiGuideState; diag: InfrDiagnosticState; distro?: string; onCancel: () => void }> = ({
  s,
  ai,
  diag,
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

  // A mensagem do Criar fica no fim da página: rola até ela, ou o clique parece não ter feito nada
  const messageRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (s.message) messageRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [s.message]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex-1 min-h-0 overflow-auto scrollbar-thin">
        <div className="max-w-6xl mx-auto px-5 md:px-6 py-8 space-y-6">
          <InfrAiGuideLine ai={ai} blocked={s.origin.blocked && !!s.origin.result} />
          <section aria-label="O ambiente novo" className="space-y-6">
            <InfrNewVersionOrigin s={s} filled={ai.filled} onEdited={ai.unmark} />
            <InfrNewVersionMode s={s} />
            <InfrNewVersionFields s={s} filled={ai.filled} onEdited={ai.unmark} />
            <p className="text-xs text-muted-foreground">
              O Hub monta o ambiente novo ao lado, com banco, WTA e WSH próprios, a partir de um que já funciona. A origem não é alterada.
            </p>
            <InfrNewVersionAdjust s={s} open={adjustOpen} onToggle={() => setAdjustOpen((o) => !o)} />
          </section>

          <InfrNewVersionChecks s={s} distro={distro} />

          {s.message && (
            <div ref={messageRef} className="space-y-3 p-3 rounded-xl bg-muted/40">
              <p className="text-xs text-foreground/80 break-words">{s.message}</p>
              {/* Gerar que não abriu ou deu erro: o relatório leva a mensagem, o comando e o registro da leitura */}
              <InfrDiagnosticButton
                diag={diag}
                name={s.form.name}
                version={s.form.version}
                notes={[`Mensagem da criação: ${s.message}`, s.command ? `Comando: ${s.command}` : '', s.preview?.log?.length ? `Registro da leitura:\n${s.preview.log.join('\n')}` : ''].filter(Boolean).join('\n\n')}
              />
            </div>
          )}
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
