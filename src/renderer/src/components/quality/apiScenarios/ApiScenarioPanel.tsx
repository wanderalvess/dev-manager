import React from 'react';
import { useApiScenarios } from '../../../hooks/quality/apiScenarios/useApiScenarios';
import { AuthLockoutActivityLog } from '../lockout/AuthLockoutActivityLog';
import { ApiScenarioEditor } from './ApiScenarioEditor';
import { ApiScenarioList } from './ApiScenarioList';
import { ApiScenarioResultView } from './ApiScenarioResultView';

/** Validação de Cenários → Validação de API: chama uma API e confronta status e campos do JSON com o esperado. */
export const ApiScenarioPanel: React.FC = () => {
  const api = useApiScenarios();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-1">
        <ApiScenarioList
          scenarios={api.scenarios}
          results={api.results}
          selectedId={api.draft.id}
          running={api.running}
          onSelect={api.select}
          onRunAll={api.runAll}
        />
      </div>
      <div className="lg:col-span-2 space-y-3 min-w-0">
        <ApiScenarioEditor
          draft={api.draft}
          onChange={api.setDraft}
          isSaved={!!api.saved}
          dirty={api.dirty}
          problem={api.problem}
          error={api.error}
          running={api.running}
          onSave={api.save}
          onRun={api.run}
          onDelete={api.remove}
        />
        {api.current && <ApiScenarioResultView result={api.current} onCopyReport={api.copyReport} />}
        <AuthLockoutActivityLog lines={api.activity} />
      </div>
    </div>
  );
};
