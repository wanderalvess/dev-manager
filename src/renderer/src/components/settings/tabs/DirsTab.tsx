import React from 'react';
import { Folder, FolderOpen, HardDrive, Layers, FileCode2, Code2, TestTube } from 'lucide-react';
import { AppSettings, EnvironmentProfile } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';
import { DirsEnvironmentProfilesPanel } from '../dirs/DirsEnvironmentProfilesPanel';
import { DirsRoutineExtensionsFields } from '../dirs/DirsRoutineExtensionsFields';
import { DirsWinthorStartPanel } from '../dirs/DirsWinthorStartPanel';
import { DirsCcwPanel } from '../dirs/DirsCcwPanel';
import { DirsIdeNameField } from '../dirs/DirsIdeNameField';

interface DirsTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
  handleBrowseFile: (field: keyof AppSettings) => Promise<void>;
  handleActivateEnvironmentProfile: (profile: EnvironmentProfile) => void;
  handleDeleteEnvironmentProfile: (id: string) => void;
  newEnvironmentProfileLabel: string;
  setNewEnvironmentProfileLabel: (label: string) => void;
  handleSaveCurrentAsEnvironmentProfile: () => void;
  launcherRows: { ext: string; path: string }[];
  handleAddLauncherRow: () => void;
  handleUpdateLauncherRow: (index: number, field: 'ext' | 'path', value: string) => void;
  handleRemoveLauncherRow: (index: number) => void;
  handleBrowseLauncherPath: (index: number) => Promise<void>;
  showWtaPassword: boolean;
  setShowWtaPassword: (show: boolean) => void;
}

export const DirsTab: React.FC<DirsTabProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory,
  handleBrowseFile,
  handleActivateEnvironmentProfile,
  handleDeleteEnvironmentProfile,
  newEnvironmentProfileLabel,
  setNewEnvironmentProfileLabel,
  handleSaveCurrentAsEnvironmentProfile,
  launcherRows,
  handleAddLauncherRow,
  handleUpdateLauncherRow,
  handleRemoveLauncherRow,
  handleBrowseLauncherPath,
  showWtaPassword,
  setShowWtaPassword
}) => {
  const { setField, setPathField } = useDirsTabFields({ settings, setSettings, validateSinglePath });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        {/* Perfis de Ambiente */}
        <DirsEnvironmentProfilesPanel
          settings={settings}
          handleActivateEnvironmentProfile={handleActivateEnvironmentProfile}
          handleDeleteEnvironmentProfile={handleDeleteEnvironmentProfile}
          newEnvironmentProfileLabel={newEnvironmentProfileLabel}
          setNewEnvironmentProfileLabel={setNewEnvironmentProfileLabel}
          handleSaveCurrentAsEnvironmentProfile={handleSaveCurrentAsEnvironmentProfile}
        />

        {/* Diretórios e Executáveis Locais */}
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <Folder className="w-3.5 h-3.5 text-primary" /> Diretórios e Executáveis Locais
            </h3>
            <span className="text-2xs text-muted-foreground font-mono">Windows Explorer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs items-start">
            <DirsPathField
              fieldId="field-projectsPath"
              labelIcon={<HardDrive className="w-3.5 h-3.5 text-primary" />}
              labelText="Diretório Base dos Repositórios Git:"
              labelTitle="Pasta onde ficam (ou vão ficar) os repositórios Git clonados. O Hub Manager escaneia essa pasta para listar seus projetos na aba Git & Azure DevOps."
              statusBadge={renderPathStatusBadge('projectsPath')}
              inputValue={settings.projectsPath}
              inputTourId="dirs-projects-path"
              placeholder="Ex: C:\Projetos ou C:\Users\seu.usuario\Projetos"
              onChange={(val) => setPathField('projectsPath', val)}
              onBrowse={() => handleBrowseDirectory('projectsPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-primary" />}
              browseTitle="Selecionar pasta no Windows Explorer"
            />

            <DirsPathField
              fieldId="field-karafPath"
              labelIcon={<Layers className="w-3.5 h-3.5 text-amber-500" />}
              labelText="Diretório do Servidor Apache Karaf (OSGi):"
              labelTitle="Raiz da instalação do servidor Apache Karaf (a pasta que contém bin/client.bat). Usado para iniciar/parar o Karaf, abrir o console e rodar deploys."
              statusBadge={renderPathStatusBadge('karafPath')}
              inputValue={settings.karafPath}
              inputTourId="dirs-karaf-path"
              placeholder="Ex: C:\servers\runtime ou C:\app\server"
              onChange={(val) => setPathField('karafPath', val)}
              onBrowse={() => handleBrowseDirectory('karafPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-amber-500" />}
              browseTitle="Selecionar pasta do Karaf"
            />

            <DirsPathField
              fieldId="field-jdkPath"
              labelIcon={<HardDrive className="w-3.5 h-3.5 text-orange-500" />}
              labelText="Diretório Java JDK (JAVA_HOME):"
              labelTitle="JDK usado para compilar/rodar o Karaf embutido e builds Maven. Equivalente à variável de ambiente JAVA_HOME."
              statusBadge={renderPathStatusBadge('jdkPath')}
              inputValue={settings.jdkPath || ''}
              placeholder="Ex: C:\Program Files\Java\jdk-17 ou C:\tools\jdk..."
              onChange={(val) => setPathField('jdkPath', val)}
              onBrowse={() => handleBrowseDirectory('jdkPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-orange-500" />}
              browseTitle="Selecionar pasta do JDK"
              hint={
                <p className="text-2xs text-muted-foreground">
                  Utilizado pelo runtime, compilador Maven e scripts. Se vazio, detecta o JAVA_HOME padrão do sistema operacional.
                </p>
              }
            />

            {/* Script de Inicialização Customizado do Karaf (sem validação de caminho, como antes) */}
            <DirsPathField
              labelIcon={<FileCode2 className="w-3.5 h-3.5 text-amber-500" />}
              labelText="Script de Inicialização do Karaf (Opcional):"
              inputValue={settings.karafScript || ''}
              placeholder="Ex: start.bat, run.bat ou caminho completo"
              onChange={(val) => setField('karafScript', val)}
              onBrowse={() => handleBrowseFile('karafScript')}
              browseIcon={<FileCode2 className="w-3.5 h-3.5 text-amber-500" />}
              browseTitle="Selecionar script .bat / .cmd"
              hint={
                <p className="text-2xs text-muted-foreground">
                  Script usado para subir o servidor na automação. Se vazio, prioriza os scripts padrão detectados na raiz.
                </p>
              }
            />

            <DirsPathField
              fieldId="field-appPath"
              labelIcon={<Folder className="w-3.5 h-3.5 text-emerald-500" />}
              labelText="Diretório Raiz das Rotinas / Binários (Prod):"
              statusBadge={renderPathStatusBadge('appPath')}
              inputValue={settings.appPath}
              placeholder="Ex: C:\app ou C:\ERP"
              onChange={(val) => setPathField('appPath', val)}
              onBrowse={() => handleBrowseDirectory('appPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-emerald-500" />}
              browseTitle="Selecionar pasta das Rotinas"
            />

            <DirsRoutineExtensionsFields
              settings={settings}
              onExtensionsChange={(list) => setField('routineFileExtensions', list)}
              launcherRows={launcherRows}
              handleAddLauncherRow={handleAddLauncherRow}
              handleUpdateLauncherRow={handleUpdateLauncherRow}
              handleRemoveLauncherRow={handleRemoveLauncherRow}
              handleBrowseLauncherPath={handleBrowseLauncherPath}
            />

            <DirsWinthorStartPanel
              settings={settings}
              setField={setField}
              showWtaPassword={showWtaPassword}
              setShowWtaPassword={setShowWtaPassword}
            />

            <DirsCcwPanel settings={settings} setField={setField} />

            {/* Executável da IDE */}
            <DirsPathField
              fieldId="field-intellijPath"
              labelIcon={<Code2 className="w-3.5 h-3.5 text-primary" />}
              labelText="Executável da IDE / Editor de Código:"
              labelTitle="Caminho do .exe da sua IDE (IntelliJ IDEA, VS Code, etc). Usado pelo botão 'Abrir na IDE' para abrir projetos com um clique."
              statusBadge={renderPathStatusBadge('intellijPath')}
              inputValue={settings.intellijPath}
              placeholder="Ex: idea64.exe, Code.exe, Cursor.exe..."
              onChange={(val) => setPathField('intellijPath', val)}
              onBrowse={() => handleBrowseFile('intellijPath')}
              browseIcon={<FileCode2 className="w-3.5 h-3.5 text-primary" />}
              browseTitle="Selecionar executável (.exe)"
            />

            <DirsIdeNameField settings={settings} onChange={(val) => setField('ideName', val)} />

            {/* Diretório do Projeto de Testes Automatizados (Cypress / E2E) */}
            <DirsPathField
              fieldId="field-tautProjectPath"
              wrapperClassName="md:col-span-2 space-y-1.5 pt-2 border-t border-border/50"
              labelIcon={<TestTube className="w-3.5 h-3.5 text-emerald-400" />}
              labelText="Diretório do Projeto de Testes Automatizados (Cypress):"
              labelTitle="Caminho do repositório de testes automatizados (Cypress / TAUT). Se deixado em branco, o Hub Manager tenta autodetectar automaticamente dentro da pasta de Projetos."
              statusBadge={renderPathStatusBadge('tautProjectPath')}
              inputValue={settings.tautProjectPath || ''}
              placeholder="Ex: C:\Projetos\taut ou C:\Projetos\testes-cypress (Vazio: autodetecta na pasta de projetos)"
              onChange={(val) => setPathField('tautProjectPath', val)}
              onBrowse={() => handleBrowseDirectory('tautProjectPath')}
              browseIcon={<FolderOpen className="w-3.5 h-3.5 text-emerald-400" />}
              browseTitle="Selecionar pasta do projeto de testes"
              hint={
                <p className="text-2xs text-muted-foreground">
                  Utilizado pelo módulo <strong>Automação de Testes</strong> na Central de Qualidade e pelas ferramentas MCP da IA. Se não preenchido, o Hub Manager procura automaticamente uma pasta de testes (<code>taut*</code>, <code>cypress-tests</code>, <code>cypress</code> ou <code>e2e-tests</code>) no Diretório Base dos Repositórios Git ou pastas irmãs.
                </p>
              }
            />

            <div id="field-tautKeyPrefix" className="md:col-span-2 space-y-1.5">
              <label htmlFor="dirs-tab-1"
                className="text-xs font-semibold text-foreground"
                title="Prefixo das chaves de cenário do Zephyr no seu projeto (ex.: PROJ-T para PROJ-T123). Vazio aceita qualquer chave no formato ABC-T123."
              >
                Prefixo das chaves de cenário Zephyr (TAUT):
              </label>
              <input id="dirs-tab-1"
                type="text"
                value={settings.tautKeyPrefix || ''}
                onChange={(e) => setField('tautKeyPrefix', e.target.value)}
                placeholder="Ex: PROJ-T (Vazio: aceita qualquer chave no formato ABC-T123)"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
