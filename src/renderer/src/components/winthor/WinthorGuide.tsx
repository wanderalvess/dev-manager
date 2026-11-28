import React from 'react';
import { AlertCircle, CheckCircle2, Circle, Loader2, Play, Wrench } from 'lucide-react';
import type { GuideActionId, GuideTone, WinthorGuide as Guide } from '../../utils/winthorGuide';

interface WinthorGuideProps {
  guide: Guide;
  onAction: (id: GuideActionId, value?: string) => void;
}

const TONE: Record<GuideTone, { box: string; icon: string }> = {
  info: { box: 'border-primary/30 bg-primary/5', icon: 'text-primary' },
  warning: { box: 'border-warning/40 bg-warning/5', icon: 'text-warning' },
  danger: { box: 'border-danger/40 bg-danger/5', icon: 'text-danger' },
  success: { box: 'border-success/40 bg-success/5', icon: 'text-success' }
};

const ICON: Record<Guide['status'], React.ReactNode> = {
  'wrong-runtime': <AlertCircle className="w-5 h-5" />,
  'docker-off': <AlertCircle className="w-5 h-5" />,
  'not-created': <Wrench className="w-5 h-5" />,
  incomplete: <Wrench className="w-5 h-5" />,
  starting: <Loader2 className="w-5 h-5 animate-spin" />,
  stopped: <Play className="w-5 h-5" />,
  partial: <AlertCircle className="w-5 h-5" />,
  running: <CheckCircle2 className="w-5 h-5" />
};

/**
 * "O que fazer agora" da tela WinThor & WSL: diz em uma frase o estado do ambiente e oferece a próxima ação
 * (ligar o Docker, criar, subir ou abrir o portal), com as quatro etapas embaixo para a pessoa se situar.
 */
export const WinthorGuide: React.FC<WinthorGuideProps> = ({ guide, onAction }) => {
  const tone = TONE[guide.tone];
  return (
    <section className={`mx-7 mt-3 rounded-[14px] border p-4 space-y-3 ${tone.box}`} aria-label="Próximo passo do ambiente WinThor" data-tour="winthor-guide">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className={`mt-0.5 shrink-0 ${tone.icon}`}>{ICON[guide.status]}</span>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground">{guide.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl mt-0.5">{guide.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {guide.secondary.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onAction(a.id, a.value)}
              className="h-9 px-3.5 rounded-lg border border-border bg-card hover:bg-muted text-sm font-medium text-foreground cursor-pointer transition-colors"
            >
              {a.label}
            </button>
          ))}
          {guide.primary && (
            <button
              type="button"
              onClick={() => onAction(guide.primary!.id, guide.primary!.value)}
              className="h-9 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold cursor-pointer transition-colors"
            >
              {guide.primary.label}
            </button>
          )}
        </div>
      </div>

      <ol className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
        {guide.steps.map((s, index) => (
          <li key={s.label} className={`flex items-center gap-1.5 ${s.state === 'todo' ? 'text-muted-foreground' : 'text-foreground'}`} aria-current={s.state === 'current' ? 'step' : undefined}>
            {s.state === 'done' ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Circle className={`w-3.5 h-3.5 ${s.state === 'current' ? 'text-primary fill-primary/30' : 'text-muted-foreground'}`} />}
            <span className={s.state === 'current' ? 'font-semibold' : ''}>{index + 1} · {s.label}</span>
          </li>
        ))}
      </ol>
    </section>
  );
};
