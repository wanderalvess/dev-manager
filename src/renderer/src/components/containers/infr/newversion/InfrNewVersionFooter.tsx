import React from 'react';
import { Play, RotateCw } from 'lucide-react';
import type { InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';

/** Rodapé da Nova versão: o que será criado, o que ainda impede e o único Gerar. */
export const InfrNewVersionFooter: React.FC<{
  s: InfrNewVersionState;
  /** A IA levou a tela até aqui sem bloqueio: o Gerar ganha destaque */
  aiReady: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}> = ({ s, aiReady, onGenerate, onCancel }) => {
  const { form } = s;
  const n = form.name || '<nome>';
  const v = form.version || '<versão>';
  const db = form.dbMode === 'existing' ? `usa o ${form.dbContainer || '—'}` : `${form.dbContainer || `oracle-${n}`} :${form.oraclePort || '?'}`;
  const wsh = form.wshJar ? `wsh-${n} :${form.wshPort || '?'}` : 'sem WSH';
  const note = s.issue
    ? { text: s.issue, cls: 'text-danger' }
    : aiReady
      ? { text: 'A IA chegou até aqui. Nada foi criado ainda: Gerar grava a configuração e abre o terminal com o build (uns 30 minutos).', cls: 'text-foreground' }
      : s.clone
        ? { text: `Gerar grava a configuração e abre o terminal; a imagem já existe, então não há build. O ${form.from || 'ambiente de origem'} não muda.`, cls: 'text-muted-foreground' }
        : { text: `Gerar grava a configuração e abre o terminal com o build (uns 30 minutos). O ${form.from || 'ambiente de origem'} não muda.`, cls: 'text-muted-foreground' };

  return (
    <footer className={`shrink-0 border-t border-border/80 px-5 md:px-6 py-3 flex flex-wrap items-center gap-x-4 gap-y-2 ${aiReady && !s.issue ? 'bg-warning/5' : 'bg-card'}`}>
      <div className="flex-1 min-w-[18rem] space-y-0.5">
        <p className="text-xs text-foreground">
          <strong>Vai criar</strong> <span className="font-mono">{db}</span> · <span className="font-mono">wta-{n} :{form.wtaPort || '?'}</span> ·{' '}
          <span className="font-mono">{wsh}</span>
          <span className="text-muted-foreground">
            {' '}
            e linux-winthor/wta.env.{v}
            {form.wshJar ? `, wsh-winthor/.env.${v}` : ''}
          </span>
        </p>
        <p className={`text-xs ${note.cls}`}>{note.text}</p>
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center justify-center h-10 px-4 rounded-lg border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onGenerate}
        disabled={!s.canGenerate}
        className={`inline-flex items-center justify-center gap-1.5 h-10 px-5 rounded-lg bg-warning text-white text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
          aiReady && s.canGenerate ? 'ring-4 ring-warning/25' : ''
        }`}
      >
        {s.busy === 'generate' ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
        Gerar {form.name || 'ambiente'}
      </button>
    </footer>
  );
};
