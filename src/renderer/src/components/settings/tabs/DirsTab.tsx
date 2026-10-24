import React from 'react';
import { Folder, FolderOpen, HardDrive, FileCode2, Code2 } from 'lucide-react';
import { AppSettings, EnvironmentProfile } from '../../../../../shared/types';
import { useDirsTabFields } from '../../../hooks/settings/useDirsTabFields';
import { DirsPathField } from '../dirs/DirsPathField';
import { DirsEnvironmentProfilesPanel } from '../dirs/DirsEnvironmentProfilesPanel';
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
}

/** Repositórios, JDK e IDE. Karaf, rotinas e testes automatizados têm abas próprias. */
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
  handleSaveCurrentAsEnvironmentProfile
}) => {
  const { setField, setPathField } = useDirsTabFields({ settings, setSettings, validateSinglePath });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        {/* Repositórios, JDK e IDE */}
        <div className="cockpit-panel rounded-xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
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
          </div>
        </div>

        {/* Presets de Ambiente: ficam depois dos campos que eles guardam */}
        <DirsEnvironmentProfilesPanel
          settings={settings}
          handleActivateEnvironmentProfile={handleActivateEnvironmentProfile}
          handleDeleteEnvironmentProfile={handleDeleteEnvironmentProfile}
          newEnvironmentProfileLabel={newEnvironmentProfileLabel}
          setNewEnvironmentProfileLabel={setNewEnvironmentProfileLabel}
          handleSaveCurrentAsEnvironmentProfile={handleSaveCurrentAsEnvironmentProfile}
        />
      </div>
    </div>
  );
};
