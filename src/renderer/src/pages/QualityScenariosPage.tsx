import React, { useEffect, useState } from 'react';
import { BookOpen, History, ListChecks } from 'lucide-react';
import { ScenarioValidationGuide } from '../components/help/guides/ScenarioValidationGuide';
import { ApiScenarioPanel } from '../components/quality/apiScenarios/ApiScenarioPanel';
import { AuthLockoutPanel } from '../components/quality/lockout/AuthLockoutPanel';
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { ScenarioHistoryModal } from '../components/quality/scenarios/ScenarioHistoryModal';
import { Modal } from '../components/ui/Modal';
import { ValidationScenarioTabs } from '../components/quality/scenarios/ValidationScenarioTabs';
import { useScenarioHistory } from '../hooks/quality/scenarios/useScenarioHistory';
import {
  VALIDATION_SCENARIO_STORAGE_KEY,
  resolveScenarioId,
  type ValidationScenarioId
} from '../utils/validationScenarios';

interface QualityScenariosPageProps {
  isActive?: boolean;
}

const BAR_BUTTON =
  'h-8 px-2.5 border border-border rounded-[8px] bg-card hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5';

const SCENARIO_PANELS: Record<ValidationScenarioId, React.FC> = {
  'auth-lockout': AuthLockoutPanel,
  'api-check': ApiScenarioPanel
};

function readStoredScenario(): ValidationScenarioId {
  try {
    return resolveScenarioId(window.localStorage.getItem(VALIDATION_SCENARIO_STORAGE_KEY));
  } catch {
    return resolveScenarioId(null);
  }
}

/** Validação de Cenários: testes de comportamento do WinThor em homologação, um cenário por aba. */
export const QualityScenariosPage: React.FC<QualityScenariosPageProps> = () => {
  const [active, setActive] = useState<ValidationScenarioId>(readStoredScenario);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const history = useScenarioHistory();
  const Panel = SCENARIO_PANELS[active];

  const openHistory = () => {
    setHistoryOpen(true);
    void history.reload();
  };
  const closeHistory = () => {
    setHistoryOpen(false);
    history.setOpened(null);
  };

  useEffect(() => {
    try {
      window.localStorage.setItem(VALIDATION_SCENARIO_STORAGE_KEY, active);
    } catch {
      // Sem armazenamento local: a aba só não é lembrada
    }
  }, [active]);

  return (
    <QualityPageShell
      icon={ListChecks}
      title="Validação de Cenários"
      description="Cenários de comportamento do WinThor validados em homologação, com evidências e relatório para o Jira."
    >
      <ValidationScenarioTabs
        active={active}
        onChange={setActive}
        actions={
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setGuideOpen(true)} className={BAR_BUTTON}>
              <BookOpen className="w-3.5 h-3.5" />
              Como usar
            </button>
            <button type="button" onClick={openHistory} className={BAR_BUTTON}>
              <History className="w-3.5 h-3.5" />
              Histórico ({history.runs.length})
            </button>
          </div>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-3 md:px-5 md:py-4">
        <Panel />
      </div>
      <ScenarioHistoryModal open={historyOpen} onClose={closeHistory} history={history} />
      {/* O mesmo manual da Central de Ajuda → Guias */}
      <Modal
        open={guideOpen}
        onClose={() => setGuideOpen(false)}
        size="xl"
        ariaLabel="Validação de Cenários: manual de uso"
        footer={
          <button type="button" onClick={() => setGuideOpen(false)} className="h-9 px-4 rounded-[10px] bg-muted hover:bg-muted/80 text-xs font-medium text-foreground">
            Fechar
          </button>
        }
      >
        <ScenarioValidationGuide />
      </Modal>
    </QualityPageShell>
  );
};
