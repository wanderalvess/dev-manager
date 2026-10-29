import React, { useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { AuthLockoutPanel } from '../components/quality/lockout/AuthLockoutPanel';
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { ValidationScenarioTabs } from '../components/quality/scenarios/ValidationScenarioTabs';
import {
  VALIDATION_SCENARIO_STORAGE_KEY,
  resolveScenarioId,
  type ValidationScenarioId
} from '../utils/validationScenarios';

interface QualityScenariosPageProps {
  isActive?: boolean;
}

const SCENARIO_PANELS: Record<ValidationScenarioId, React.FC> = {
  'auth-lockout': AuthLockoutPanel
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
  const Panel = SCENARIO_PANELS[active];

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
      <ValidationScenarioTabs active={active} onChange={setActive} />
      <div className="flex-1 overflow-y-auto px-4 py-3 md:px-5 md:py-4">
        <Panel />
      </div>
    </QualityPageShell>
  );
};
