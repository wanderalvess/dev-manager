import React, { useEffect, useRef } from 'react';
import { Hammer, Play, Rocket, Square } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useDelphiBuild } from '../../hooks/delphi/useDelphiBuild';
import { DelphiBuildForm } from './DelphiBuildForm';
import { DelphiBuildResultPanel } from './DelphiBuildResultPanel';

interface DelphiBuildModalProps {
  open: boolean;
  onClose: () => void;
}

const BUTTON_CLASS =
  'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all';

export const DelphiBuildModal: React.FC<DelphiBuildModalProps> = ({ open, onClose }) => {
  const d = useDelphiBuild(open);
  const logRef = useRef<HTMLPreElement>(null);
  const ready = Boolean(d.form.dprojPath.trim() && d.form.rsvarsPath.trim());

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [d.log]);

  const footer = (
    <div className="flex items-center justify-between gap-2 w-full">
      <button type="button" onClick={d.reload} disabled={d.running} className={`${BUTTON_CLASS} bg-card hover:bg-muted border border-border/80 text-foreground`}>
        Redetectar
      </button>
      <div className="flex items-center gap-2">
        {d.running && (
          <button type="button" onClick={d.cancel} className={`${BUTTON_CLASS} bg-danger/10 hover:bg-danger/20 text-danger`}>
            <Square className="w-3.5 h-3.5" /> Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={d.runBuild}
          disabled={!ready || d.running}
          className={`${BUTTON_CLASS} bg-card hover:bg-muted border border-border/80 text-foreground`}
          title="Só compila e mostra os erros"
        >
          <Play className="w-3.5 h-3.5 text-primary" /> Compilar
        </button>
        <button
          type="button"
          onClick={d.runPipeline}
          disabled={!ready || d.running}
          className={`${BUTTON_CLASS} bg-primary/10 hover:bg-primary/20 text-primary`}
          title="Encerra o processo, compila, publica e abre, conforme as opções marcadas"
        >
          <Rocket className="w-3.5 h-3.5" /> Pipeline completo
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Build Delphi"
      description="Compila o projeto pelo MSBuild (como a IDE), com erros do compilador estruturados."
      icon={<Hammer className="w-4 h-4 text-primary" />}
      footer={footer}
      dismissible={!d.running}
      closeOnEscape={false}
      closeOnBackdrop={false}
    >
      <div className="space-y-3">
        <DelphiBuildForm form={d.form} installations={d.installations} projects={d.projects} disabled={d.running} onChange={d.updateForm} />

        {d.error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{d.error}</div>}

        <DelphiBuildResultPanel build={d.build} pipeline={d.pipeline} />

        {(d.log || d.running) && (
          <pre
            ref={logRef}
            className="max-h-52 overflow-auto rounded-lg border border-border/80 bg-background p-2.5 text-2xs font-mono text-muted-foreground whitespace-pre-wrap select-text"
          >
            {d.log || 'Aguardando saída do compilador…'}
          </pre>
        )}
      </div>
    </Modal>
  );
};
