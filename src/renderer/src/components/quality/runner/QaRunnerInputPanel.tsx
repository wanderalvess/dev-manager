import React, { useState } from 'react';
import { FileCode, Filter } from 'lucide-react';
import { QaRunnerJsonTab } from './QaRunnerJsonTab';
import { QaRunnerVariablesTab } from './QaRunnerVariablesTab';

interface QaRunnerInputPanelProps {
  rawJson: string;
  onChangeJson: (value: string) => void;
  variables: Record<string, string>;
  setVariables: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onOpenFetchPayload: () => void;
  onLoadSample: () => void;
  onAutoExtract: () => void;
}

export const QaRunnerInputPanel: React.FC<QaRunnerInputPanelProps> = ({
  rawJson,
  onChangeJson,
  variables,
  setVariables,
  onOpenFetchPayload,
  onLoadSample,
  onAutoExtract
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'json' | 'vars'>('json');
  // Rascunho do novo bind fica aqui para sobreviver à troca de aba.
  const [newVarKey, setNewVarKey] = useState<string>('');
  const [newVarVal, setNewVarVal] = useState<string>('');

  return (
    <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-border bg-card/60 flex flex-col shrink-0 overflow-hidden">
      {/* Tabs de Input — Estilo IDE Tab */}
      <div className="flex items-center border-b border-border bg-card px-2 gap-4 shrink-0">
        <button
          type="button"
          onClick={() => setActiveInputTab('json')}
          className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeInputTab === 'json'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Payload JSON</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveInputTab('vars')}
          className={`py-2 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeInputTab === 'vars'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          <span>Binds &amp; Variáveis</span>
          <span className="font-mono text-[10px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
            {Object.keys(variables).length}
          </span>
        </button>
      </div>

      {activeInputTab === 'json' && (
        <QaRunnerJsonTab
          rawJson={rawJson}
          onChangeJson={onChangeJson}
          onOpenFetchPayload={onOpenFetchPayload}
          onLoadSample={onLoadSample}
          onAutoExtract={onAutoExtract}
        />
      )}

      {activeInputTab === 'vars' && (
        <QaRunnerVariablesTab
          variables={variables}
          setVariables={setVariables}
          newVarKey={newVarKey}
          newVarVal={newVarVal}
          onChangeNewVarKey={setNewVarKey}
          onChangeNewVarVal={setNewVarVal}
        />
      )}
    </div>
  );
};
