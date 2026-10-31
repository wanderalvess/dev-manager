import React from 'react';
import { ShieldCheck, Trash2 } from 'lucide-react';
import { shortInstallId } from '../../../utils/usageViewUtils';
import { AppliesNowTag } from '../AppliesNowTag';

interface UsageControlsPanelProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  installId: string;
  hasHistory: boolean;
  onClear: () => void;
}

const COUNTED = [
  'Quantas vezes você executou cada automação (pipeline, deploy, backup, testes, consultas à documentação…)',
  'Quanto tempo cada execução levou e se terminou com sucesso ou falha',
  'Se a execução veio da interface, da API REST ou de uma IA via MCP'
];

const NEVER_COUNTED = [
  'SQL, nomes de banco, schema ou tabela',
  'Caminhos de pastas e arquivos',
  'Perguntas e respostas do Assistente IA',
  'Senhas, tokens, nome ou e-mail'
];

/** Aviso do que é contado, interruptor e apagar histórico. O interruptor é uma configuração normal: vale ao salvar. */
export const UsageControlsPanel: React.FC<UsageControlsPanelProps> = ({ enabled, onToggle, installId, hasHistory, onClear }) => {
  const hint = enabled ? 'Desligar a contagem de uso' : 'Ligar a contagem de uso';
  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 border border-border" id="field-usageMetricsEnabled">
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-border/60">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-success" /> Contagem de uso (local)
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            O Hub Manager conta, só nesta máquina, o que você usa. Serve para mostrar o impacto da ferramenta e decidir o que
            melhorar. Nada sai daqui.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={hint}
          title={`${hint} (vale ao salvar)`}
          onClick={() => onToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/40 ${
            enabled ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1.5">
          <h4 className="text-xs text-success font-semibold">O que é contado</h4>
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            {COUNTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5">
          <h4 className="text-xs text-danger font-semibold">O que nunca é contado</h4>
          <ul className="space-y-1 text-muted-foreground list-disc pl-4">
            {NEVER_COUNTED.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
        <p className="text-2xs text-muted-foreground">
          {enabled ? 'Contagem ligada.' : 'Contagem desligada: nada é registrado.'} A mudança vale ao salvar as configurações.
          Identificação da instalação (aleatória, não identifica você):{' '}
          <span className="font-mono text-foreground" title={installId}>
            {shortInstallId(installId)}
          </span>
        </p>
        <AppliesNowTag />
        <button
          type="button"
          onClick={onClear}
          disabled={!hasHistory}
          className="px-3 py-1.5 bg-muted hover:bg-danger/10 text-danger hover:border-danger/70 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Apaga todo o histórico de uso desta máquina"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Apagar histórico</span>
        </button>
      </div>
    </div>
  );
};
