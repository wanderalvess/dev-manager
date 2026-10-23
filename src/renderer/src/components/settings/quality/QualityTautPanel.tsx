import React from 'react';
import { FolderOpen, TestTube } from 'lucide-react';
import type { AppSettings } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';

interface QualityTautPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
}

/** Projeto de testes automatizados (Cypress / TAUT) e prefixo das chaves Zephyr. */
export const QualityTautPanel: React.FC<QualityTautPanelProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory
}) => {
  const { setField, setPathField } = useDirsTabFields({ settings, setSettings, validateSinglePath });

  return (
    <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border">
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <TestTube className="w-3.5 h-3.5 text-success" /> Projeto de Testes Automatizados (TAUT)
        </h3>
        <span className="text-2xs text-muted-foreground font-mono">Cypress / E2E</span>
      </div>

      <div className="grid grid-cols-1 gap-4 text-xs items-start">
        <DirsPathField
          fieldId="field-tautProjectPath"
          labelIcon={<TestTube className="w-3.5 h-3.5 text-success" />}
          labelText="Diretório do Projeto de Testes Automatizados (Cypress):"
          labelTitle="Caminho do repositório de testes automatizados (Cypress / TAUT). Se deixado em branco, o Hub Manager tenta autodetectar automaticamente dentro da pasta de Projetos."
          statusBadge={renderPathStatusBadge('tautProjectPath')}
          inputValue={settings.tautProjectPath || ''}
          placeholder="Ex: C:\Projetos\taut ou C:\Projetos\testes-cypress (Vazio: autodetecta na pasta de projetos)"
          onChange={(val) => setPathField('tautProjectPath', val)}
          onBrowse={() => handleBrowseDirectory('tautProjectPath')}
          browseIcon={<FolderOpen className="w-3.5 h-3.5 text-success" />}
          browseTitle="Selecionar pasta do projeto de testes"
          hint={
            <p className="text-2xs text-muted-foreground">
              Utilizado pelo módulo <strong>Automação de Testes</strong> na Central de Qualidade e pelas ferramentas MCP da IA. Se não preenchido, o Hub Manager procura automaticamente uma pasta de testes (<code>taut*</code>, <code>cypress-tests</code>, <code>cypress</code> ou <code>e2e-tests</code>) no Diretório Base dos Repositórios Git ou pastas irmãs.
            </p>
          }
        />

        <div id="field-tautKeyPrefix" className="space-y-1.5">
          <label
            htmlFor="quality-taut-key-prefix"
            className="text-xs font-semibold text-foreground"
            title="Prefixo das chaves de cenário do Zephyr no seu projeto (ex.: PROJ-T para PROJ-T123). Vazio aceita qualquer chave no formato ABC-T123."
          >
            Prefixo das chaves de cenário Zephyr (TAUT):
          </label>
          <input
            id="quality-taut-key-prefix"
            type="text"
            value={settings.tautKeyPrefix || ''}
            onChange={(e) => setField('tautKeyPrefix', e.target.value)}
            placeholder="Ex: PROJ-T (Vazio: aceita qualquer chave no formato ABC-T123)"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>
    </div>
  );
};
