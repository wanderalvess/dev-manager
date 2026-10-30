import React from 'react';
import { Download, History, Trash2 } from 'lucide-react';
import { SCENARIO_RUN_KIND_LABELS, formatRunDuration, type ScenarioRunListItem, type ScenarioRunVerdict } from '../../../../../shared/scenarioHistoryTypes';
import type { useScenarioHistory, ScenarioHistoryFilter } from '../../../hooks/quality/scenarios/useScenarioHistory';
import type { ReadinessTone } from '../../../utils/integrationReadinessView';
import { Modal } from '../../ui/Modal';
import { TONE_BADGE } from '../../integrationtrace/toneClasses';
import { ScenarioRunDetail } from './ScenarioRunDetail';

const VERDICT: Record<ScenarioRunVerdict, { label: string; tone: ReadinessTone }> = {
  passed: { label: 'OK', tone: 'success' },
  failed: { label: 'Falhou', tone: 'danger' },
  warning: { label: 'Atenção', tone: 'warning' },
  error: { label: 'Não rodou', tone: 'muted' }
};

const FILTERS: { id: ScenarioHistoryFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'auth-lockout', label: SCENARIO_RUN_KIND_LABELS['auth-lockout'] },
  { id: 'api', label: SCENARIO_RUN_KIND_LABELS.api }
];

const ICON_BUTTON = 'w-8 h-8 rounded-[8px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted';

interface ScenarioHistoryModalProps {
  open: boolean;
  onClose: () => void;
  history: ReturnType<typeof useScenarioHistory>;
}

function RunRow({ run, history }: { run: ScenarioRunListItem; history: ScenarioHistoryModalProps['history'] }) {
  const verdict = VERDICT[run.verdict];
  return (
    <li className="py-2 flex items-center gap-3">
      <span className={`px-2 rounded-full text-2xs font-medium shrink-0 w-20 text-center ${TONE_BADGE[verdict.tone]}`}>{verdict.label}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground truncate">{run.name}</p>
        <p className="text-2xs text-muted-foreground">
          {SCENARIO_RUN_KIND_LABELS[run.kind]} · {new Date(run.startedAt).toLocaleString()} · {formatRunDuration(run.durationMs)} · {run.summary}
        </p>
      </div>
      <button
        type="button"
        onClick={() => void history.open(run.id)}
        className="h-8 px-3 border border-border rounded-[8px] text-xs font-medium text-foreground hover:bg-muted"
      >
        Abrir
      </button>
      <button type="button" onClick={() => void history.download(run.id)} className={ICON_BUTTON} aria-label="Baixar .md" title="Baixar .md">
        <Download className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => void history.remove(run)} className={`${ICON_BUTTON} hover:text-danger`} aria-label="Apagar do histórico" title="Apagar do histórico">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </li>
  );
}

/** Últimas execuções dos cenários: abrir só leitura, baixar o relatório, apagar uma ou limpar tudo. */
export const ScenarioHistoryModal: React.FC<ScenarioHistoryModalProps> = ({ open, onClose, history }) => {
  const count = (id: ScenarioHistoryFilter) => (id === 'all' ? history.runs.length : history.runs.filter((r) => r.kind === id).length);
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      icon={<History className="w-4 h-4 text-muted-foreground mt-0.5" />}
      title="Histórico de execuções"
      description="As últimas 50 execuções, guardadas ao lado do config.json: o app, o modo Web e o MCP veem as mesmas. Senhas e tokens ficam mascarados."
      footer={
        <>
          <button
            type="button"
            disabled={history.runs.length === 0}
            onClick={() => void history.clear()}
            className="h-9 px-3 mr-auto rounded-[10px] text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Limpar histórico
          </button>
          <button type="button" onClick={onClose} className="h-9 px-4 rounded-[10px] bg-muted hover:bg-muted/80 text-xs font-medium text-foreground">
            Fechar
          </button>
        </>
      }
    >
      {history.opened ? (
        <ScenarioRunDetail record={history.opened} onBack={() => history.setOpened(null)} />
      ) : (
        <div className="space-y-2 pb-2">
          <div role="group" aria-label="Filtrar por cenário" className="flex items-center gap-2 flex-wrap">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={history.filter === f.id}
                onClick={() => history.setFilter(f.id)}
                className={`h-7 px-3 rounded-full text-xs border ${
                  history.filter === f.id ? 'border-primary bg-primary/10 text-foreground font-medium' : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                {f.label} ({count(f.id)})
              </button>
            ))}
          </div>
          {history.visible.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {history.loading ? 'Carregando…' : 'Nenhuma execução ainda. Cada execução de cenário entra aqui sozinha.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.visible.map((run) => (
                <RunRow key={run.id} run={run} history={history} />
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
};
