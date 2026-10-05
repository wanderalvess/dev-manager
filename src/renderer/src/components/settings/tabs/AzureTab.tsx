import React from 'react';
import { GitBranch, HardDrive, KeyRound, FolderOpen } from 'lucide-react';
import { AppSettings } from '../../../../../shared/types';

interface AzureTabProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  renderPathStatusBadge: (field: keyof AppSettings) => React.ReactNode;
  validateSinglePath: (field: keyof AppSettings, value: string) => Promise<void>;
  handleBrowseDirectory: (field: keyof AppSettings) => Promise<void>;
}

const PRESET_BRANCHES = ['develop', 'master', 'main', 'release/37.0', 'release/38.0'];

export const AzureTab: React.FC<AzureTabProps> = ({
  settings,
  setSettings,
  renderPathStatusBadge,
  validateSinglePath,
  handleBrowseDirectory
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1" id="field-azure">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-500" /> Configurações do Git & Azure DevOps
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Parâmetros para criação automatizada de Pull Requests e rastreamento de repositórios.
              </p>
            </div>
            <span className="text-2xs bg-blue-500/10 text-blue-500 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
              dev.azure.com
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Branch Padrão para Pull Requests */}
            <div className="space-y-2">
              <label htmlFor="azure-tab-1"
                className="block font-bold text-foreground flex items-center gap-1.5"
                title="Branch de destino sugerido ao criar um novo Pull Request no Azure DevOps (ex: develop, main)."
              >
                <GitBranch className="w-3.5 h-3.5 text-primary" /> Branch Padrão para Pull Requests:
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input id="azure-tab-1"
                  type="text"
                  value={settings.targetPrBranch}
                  onChange={(e) => setSettings({ ...settings, targetPrBranch: e.target.value })}
                  className="flex-1 min-w-[200px] bg-card border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-primary"
                  placeholder="develop"
                />
                {PRESET_BRANCHES.map((br) => (
                  <button
                    key={br}
                    type="button"
                    onClick={() => setSettings({ ...settings, targetPrBranch: br })}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-semibold transition-all border ${
                      settings.targetPrBranch === br
                        ? 'bg-primary/20 text-primary border-primary/40 font-bold'
                        : 'bg-card text-muted-foreground border-border hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    {br}
                  </button>
                ))}
              </div>
              <p className="text-2xs text-muted-foreground">
                Branch alvo utilizada por padrão na aba <strong>Git & Azure DevOps</strong> ao gerar URLs diretas para Pull Requests no Azure.
              </p>
            </div>

            {/* Diretório de Repositórios Git */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label htmlFor="azure-tab-2"
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Pasta onde ficam (ou vão ficar) os repositórios Git clonados. O Dev Manager escaneia essa pasta para listar seus projetos na aba Git & Azure DevOps."
                >
                  <HardDrive className="w-3.5 h-3.5 text-primary" />
                  Diretório Base dos Repositórios Git:
                </label>
                {renderPathStatusBadge('projectsPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input id="azure-tab-2"
                  type="text"
                  value={settings.projectsPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, projectsPath: val });
                    validateSinglePath('projectsPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Projetos ou C:\Users\seu.usuario\Projetos"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseDirectory('projectsPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar pasta no Windows Explorer"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-primary" />
                  <span>Procurar...</span>
                </button>
              </div>
              <p className="text-2xs text-muted-foreground">
                O Dev Manager realiza a varredura das pastas contidas neste diretório procurando por projetos Git com remote do Azure DevOps.
              </p>
            </div>

            {/* Token de Acesso Pessoal (PAT) do Azure DevOps */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between">
                <label htmlFor="azure-tab-3"
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Personal Access Token (PAT) do Azure DevOps para consulta de Work Items e criação de branches baseadas em tarefas."
                >
                  <KeyRound className="w-3.5 h-3.5 text-blue-500" />
                  Personal Access Token (PAT) do Azure DevOps:
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input id="azure-tab-3"
                  type="password"
                  value={settings.azureDevOpsToken || ''}
                  onChange={(e) => setSettings({ ...settings, azureDevOpsToken: e.target.value })}
                  className="flex-1 bg-card border border-border hover:border-blue-500/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors shadow-sm"
                  placeholder="Cole seu Personal Access Token do Azure DevOps (leitura de Work Items)"
                />
              </div>
              <p className="text-2xs text-muted-foreground">
                Utilizado pelo Hub Git para consultar Work Items e sugerir branches padronizadas com título e slug automáticos.
              </p>
            </div>
          </div>

          {/* Box Informativo de Integração Azure */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3.5 text-xs text-foreground space-y-1">
            <span className="font-bold text-blue-600 dark:text-blue-400 block flex items-center gap-1.5">
              <GitBranch className="w-4 h-4" /> Integração com o Azure DevOps (dev.azure.com)
            </span>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O painel lê automaticamente as configurações dos repositórios localizados em seu computador (identificando a organização, projeto e nome do repositório no Azure DevOps). Ao clicar para abrir um Pull Request, a URL é montada com o <code>sourceRef</code> (sua branch local) e o <code>targetRef</code> (a branch padrão configurada acima).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
