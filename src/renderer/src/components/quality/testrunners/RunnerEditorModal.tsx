import React from 'react';
import { Sliders } from 'lucide-react';
import type { TestRunnerConfig, TestRunnerType } from '../../../../../shared/types';
import type { QualityValidationItem } from '../../../utils/qualityPageUtils';
import { getDefaultCommandArgs, toggleLinkedId } from '../../../utils/testRunnersUtils';
import { Modal } from '../../ui/Modal';

interface RunnerEditorModalProps {
  runner: Partial<TestRunnerConfig>;
  validationItems: QualityValidationItem[];
  onChange: (runner: Partial<TestRunnerConfig>) => void;
  onClose: () => void;
  onSave: () => void;
}

const labelClass = 'block text-[11px] font-mono text-muted-foreground mb-1 uppercase tracking-wider';
const monoInputClass =
  'w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary/80';
const textInputClass =
  'w-full bg-background border border-border/80 rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:border-primary/80';

export const RunnerEditorModal: React.FC<RunnerEditorModalProps> = ({
  runner,
  validationItems,
  onChange,
  onClose,
  onSave
}) => (
  <Modal
    open
    onClose={onClose}
    bare
    panelClassName="bg-card border border-border/80 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-md"
    closeOnBackdrop={false}
    closeOnEscape={false}
  >
    <div className="flex items-center justify-between border-b border-border/60 pb-3">
      <div className="flex items-center gap-2">
        <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
          {runner.id ? 'Configuração do Runner' : 'Novo Runner de Teste'}
        </h3>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground text-xs font-mono p-1 rounded hover:bg-muted transition cursor-pointer"
      >
        ESC / ✕
      </button>
    </div>

    <div className="space-y-3 text-xs">
      <div>
        <label className={labelClass}>Identificador / Nome:</label>
        <input
          type="text"
          value={runner.name || ''}
          onChange={(e) => onChange({ ...runner, name: e.target.value })}
          placeholder="Ex: Testes Unitários - Bundle Financeiro"
          className={`${textInputClass} font-medium`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Framework / Tipo:</label>
          <select
            value={runner.type || 'maven'}
            onChange={(e) => {
              const type = e.target.value as TestRunnerType;
              onChange({ ...runner, type, commandArgs: getDefaultCommandArgs(type) });
            }}
            className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:border-primary/80 font-mono text-xs cursor-pointer"
          >
            <option value="maven">Maven (JUnit / Karaf)</option>
            <option value="playwright">Playwright E2E</option>
            <option value="cypress">Cypress E2E</option>
            <option value="newman">Newman (Postman CLI)</option>
            <option value="custom">Script Customizado</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Argumentos CLI:</label>
          <input
            type="text"
            value={runner.commandArgs || ''}
            onChange={(e) => onChange({ ...runner, commandArgs: e.target.value })}
            placeholder="Ex: test ou verify"
            className={monoInputClass}
          />
        </div>
      </div>

      {runner.type === 'custom' && (
        <div>
          <label className={labelClass}>Comando Executável:</label>
          <input
            type="text"
            value={runner.customCommand || ''}
            onChange={(e) => onChange({ ...runner, customCommand: e.target.value })}
            placeholder="Ex: pytest ou npm run test"
            className={monoInputClass}
          />
        </div>
      )}

      <div>
        <label className={labelClass}>Diretório de Trabalho:</label>
        <input
          type="text"
          value={runner.workingDir || ''}
          onChange={(e) => onChange({ ...runner, workingDir: e.target.value })}
          placeholder="Ex: {PROJECTS_PATH}/meu-projeto"
          className={monoInputClass}
        />
        <span className="text-2xs text-muted-foreground mt-0.5 block font-mono">
          Variáveis: <code>{'{PROJECTS_PATH}'}</code>, <code>{'{KARAF_PATH}'}</code>
        </span>
      </div>

      <div>
        <label className={labelClass}>Descrição (Opcional):</label>
        <input
          type="text"
          value={runner.description || ''}
          onChange={(e) => onChange({ ...runner, description: e.target.value })}
          placeholder="Ex: Validação das regras de negócio fiscais"
          className={textInputClass}
        />
      </div>

      {/* Vínculo com Itens da Matriz de Validação */}
      <div>
        <label className={labelClass}>Vincular Cenários da Matriz:</label>
        <div className="max-h-28 overflow-y-auto border border-border/70 rounded-lg p-2 bg-background/50 space-y-1">
          {validationItems.length === 0 ? (
            <span className="text-muted-foreground text-[11px] font-mono">
              Nenhum cenário cadastrado na Matriz de Validação.
            </span>
          ) : (
            validationItems.map((valItem) => {
              const isLinked = (runner.linkedValidationItemIds || []).includes(valItem.id);
              return (
                <label
                  key={valItem.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/60 p-1 rounded text-[11px]"
                >
                  <input
                    type="checkbox"
                    checked={isLinked}
                    onChange={(e) =>
                      onChange({
                        ...runner,
                        linkedValidationItemIds: toggleLinkedId(
                          runner.linkedValidationItemIds,
                          valItem.id,
                          e.target.checked
                        )
                      })
                    }
                    className="rounded border-border text-primary focus:ring-0"
                  />
                  <span className="font-mono text-xs font-semibold text-foreground">[{valItem.targetName}]</span>
                  <span className="text-muted-foreground truncate">{valItem.title}</span>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>

    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
      <button
        type="button"
        onClick={onClose}
        className="px-3 py-1.5 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer"
      >
        Cancelar
      </button>
      <button
        type="button"
        onClick={onSave}
        className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition cursor-pointer shadow-xs active:scale-95"
      >
        Salvar Runner
      </button>
    </div>
  </Modal>
);
