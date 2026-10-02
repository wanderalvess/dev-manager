import React from 'react';
import {
  Folder,
  FolderOpen,
  HardDrive,
  Layers,
  FileCode2,
  Trash2,
  Plus,
  Activity,
  Download,
  Code2,
  Eye,
  EyeOff,
  TestTube
} from 'lucide-react';
import {
  AppSettings,
  EnvironmentProfile,
  detectIdeInfo
} from '../../../../../shared/types';

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
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      <div className="lg:col-span-12 space-y-4 flex flex-col">
        {/* Perfis de Ambiente */}
        <div className="cockpit-panel rounded-2xl p-5 space-y-3 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Perfis de Ambiente
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Presets de paths/portas</span>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Salve o estado atual dos diretórios e portas abaixo como um preset nomeado, e alterne entre eles com um clique — útil pra quem trabalha com múltiplos clientes/ambientes na mesma máquina.
          </p>

          {(settings.environmentProfiles || []).length > 0 && (
            <ul className="space-y-1.5">
              {(settings.environmentProfiles || []).map((profile) => {
                const isActive = settings.activeEnvironmentProfileId === profile.id;
                return (
                  <li
                    key={profile.id}
                    className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs ${
                      isActive ? 'border-primary/50 bg-primary/10' : 'border-border/80 bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-semibold text-foreground truncate">{profile.label}</span>
                      {isActive && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary/20 text-primary shrink-0">
                          Ativo
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-muted-foreground truncate">{profile.projectsPath}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleActivateEnvironmentProfile(profile)}
                        disabled={isActive}
                        className="px-2 py-1 bg-muted hover:bg-muted/80 text-foreground rounded-md text-[10px] font-bold transition disabled:opacity-50 cursor-pointer"
                      >
                        Ativar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteEnvironmentProfile(profile.id)}
                        className="p-1 rounded-md hover:bg-destructive/10 text-destructive/70 hover:text-destructive transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex items-center gap-2" data-tour="environment-profiles">
            <input
              type="text"
              value={newEnvironmentProfileLabel}
              onChange={(e) => setNewEnvironmentProfileLabel(e.target.value)}
              placeholder="Rótulo do novo perfil (ex: Cliente A)..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveCurrentAsEnvironmentProfile();
                }
              }}
            />
            <button
              type="button"
              onClick={handleSaveCurrentAsEnvironmentProfile}
              disabled={!newEnvironmentProfileLabel.trim()}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5 transition cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Salvar estado atual como perfil</span>
            </button>
          </div>
        </div>

        {/* Diretórios e Executáveis Locais */}
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
              <Folder className="w-4 h-4 text-primary" /> Diretórios e Executáveis Locais
            </h3>
            <span className="text-[10px] text-muted-foreground font-mono">Windows Explorer</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Diretório de Repositórios Git */}
            <div className="space-y-1.5" id="field-projectsPath">
              <div className="flex items-center justify-between">
                <label
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Pasta onde ficam (ou vão ficar) os repositórios Git clonados. O Dev Manager escaneia essa pasta para listar seus projetos na aba Git & Azure DevOps."
                >
                  <HardDrive className="w-3.5 h-3.5 text-primary" />
                  Diretório Base dos Repositórios Git:
                </label>
                {renderPathStatusBadge('projectsPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  data-tour="dirs-projects-path"
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
            </div>

            {/* Diretório do Apache Karaf */}
            <div className="space-y-1.5" id="field-karafPath">
              <div className="flex items-center justify-between">
                <label
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Raiz da instalação do servidor Apache Karaf (a pasta que contém bin/client.bat). Usado para iniciar/parar o Karaf, abrir o console e rodar deploys."
                >
                  <Layers className="w-3.5 h-3.5 text-amber-500" />
                  Diretório do Servidor Apache Karaf (OSGi):
                </label>
                {renderPathStatusBadge('karafPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  data-tour="dirs-karaf-path"
                  value={settings.karafPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, karafPath: val });
                    validateSinglePath('karafPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\servers\runtime ou C:\app\server"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseDirectory('karafPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar pasta do Karaf"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  <span>Procurar...</span>
                </button>
              </div>
            </div>

            {/* Diretório Java JDK / JRE (JAVA_HOME) */}
            <div className="space-y-1.5" id="field-jdkPath">
              <div className="flex items-center justify-between">
                <label
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="JDK usado para compilar/rodar o Karaf embutido e builds Maven. Equivalente à variável de ambiente JAVA_HOME."
                >
                  <HardDrive className="w-3.5 h-3.5 text-orange-500" />
                  Diretório Java JDK (JAVA_HOME):
                </label>
                {renderPathStatusBadge('jdkPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.jdkPath || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, jdkPath: val });
                    validateSinglePath('jdkPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Program Files\Java\jdk-17 ou C:\tools\jdk..."
                />
                <button
                  type="button"
                  onClick={() => handleBrowseDirectory('jdkPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar pasta do JDK"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-orange-500" />
                  <span>Procurar...</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Utilizado pelo runtime, compilador Maven e scripts. Se vazio, detecta o JAVA_HOME padrão do sistema operacional.
              </p>
            </div>

            {/* Script de Inicialização Customizado do Karaf */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                  Script de Inicialização do Karaf (Opcional):
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.karafScript || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, karafScript: val });
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: start.bat, run.bat ou caminho completo"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('karafScript')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar script .bat / .cmd"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Procurar...</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Script usado para subir o servidor na automação. Se vazio, prioriza os scripts padrão detectados na raiz.
              </p>
            </div>

            {/* Diretório Base das Rotinas (Prod) */}
            <div className="space-y-1.5" id="field-appPath">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-emerald-500" />
                  Diretório Raiz das Rotinas / Binários (Prod):
                </label>
                {renderPathStatusBadge('appPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.appPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, appPath: val });
                    validateSinglePath('appPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\app ou C:\ERP"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseDirectory('appPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar pasta das Rotinas"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Procurar...</span>
                </button>
              </div>
            </div>

            {/* Extensões e Launchers do Catálogo de Rotinas */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
                Extensões Reconhecidas como Rotina:
              </label>
              <input
                type="text"
                value={(settings.routineFileExtensions || ['.EXE']).join(', ')}
                onChange={(e) => {
                  const list = e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map((s) => (s.startsWith('.') ? s.toUpperCase() : `.${s.toUpperCase()}`));
                  setSettings({ ...settings, routineFileExtensions: list });
                }}
                className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                placeholder=".EXE, .BAT"
              />
              <p className="text-[10px] text-muted-foreground">
                Separadas por vírgula. Arquivos com essas extensões aparecem no Catálogo de Rotinas.
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-purple-500" />
                  Launchers por Extensão (opcional):
                </label>
                <button
                  type="button"
                  onClick={handleAddLauncherRow}
                  className="px-2 py-1 bg-card hover:bg-muted border border-border rounded-lg text-[10px] font-semibold text-foreground transition-all flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Adicionar</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Para formatos que não rodam sozinhos (ex: um arquivo de rotina que precisa ser aberto por outro
                programa), aponte aqui a extensão e o executável que deve abri-lo.
              </p>
              {launcherRows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={row.ext}
                    onChange={(e) => handleUpdateLauncherRow(index, 'ext', e.target.value)}
                    placeholder=".PC"
                    className="w-20 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
                  />
                  <input
                    type="text"
                    value={row.path}
                    onChange={(e) => handleUpdateLauncherRow(index, 'path', e.target.value)}
                    placeholder="Caminho do executável launcher"
                    className="flex-1 bg-card border border-border rounded-lg px-2 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => handleBrowseLauncherPath(index)}
                    className="p-1.5 bg-card hover:bg-muted border border-border rounded-lg shrink-0"
                    title="Selecionar executável"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-emerald-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLauncherRow(index)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 transition-colors shrink-0"
                    title="Remover"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Integração WinThor Start & WTA */}
            <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-500" /> Integração WinThor Start (DataSnap) & WTA
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Abre rotinas desktop autenticadas via serviço local do WinThor Start sem necessitar do menu aberto.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.winthorStartEnabled ?? true}
                    onChange={(e) => setSettings({ ...settings, winthorStartEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Porta do WinThor Start:
                  </label>
                  <input
                    type="number"
                    value={settings.winthorStartPort ?? 9195}
                    onChange={(e) => setSettings({ ...settings, winthorStartPort: parseInt(e.target.value) || 9195 })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="9195"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    URL do Portal WTA:
                  </label>
                  <input
                    type="text"
                    value={settings.wtaUrl || 'http://localhost:8889'}
                    onChange={(e) => setSettings({ ...settings, wtaUrl: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="http://localhost:8889"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                <div id="field-wtaLogin">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Usuário WTA (Login Automático):
                  </label>
                  <input
                    type="text"
                    value={settings.wtaLogin || ''}
                    onChange={(e) => setSettings({ ...settings, wtaLogin: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="Ex: PCADMIN"
                  />
                </div>
                <div id="field-wtaPassword">
                  <label className="block text-[11px] font-semibold text-foreground mb-1 flex items-center justify-between">
                    <span>Senha / Hash WTA:</span>
                    <button
                      type="button"
                      onClick={() => setShowWtaPassword(!showWtaPassword)}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-normal flex items-center gap-1"
                    >
                      {showWtaPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showWtaPassword ? 'Ocultar' : 'Exibir'}</span>
                    </button>
                  </label>
                  <input
                    type={showWtaPassword ? 'text' : 'password'}
                    value={settings.wtaPassword || ''}
                    onChange={(e) => setSettings({ ...settings, wtaPassword: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="Senha ou Hash MD5 do WTA"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-border/40">
                <div id="field-wtaAuthToken">
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Cookie de Autenticação WTA (<code>suukie</code>):
                  </label>
                  <input
                    type="text"
                    value={settings.wtaAuthToken || ''}
                    onChange={(e) => setSettings({ ...settings, wtaAuthToken: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="Cole o valor do cookie 'suukie' do WTA (opcional)"
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Permite que o Dev Manager consulte os parâmetros atualizados direto da sua sessão web. Abra o
                    DevTools do navegador (F12) na tela do WTA logado, aba Application/Cookies, e copie o valor
                    de <code>suukie</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Payload de Fallback (JSON com <code>m, u, p, t, s</code>):
                  </label>
                  <textarea
                    rows={2}
                    value={settings.winthorStartDefaultPayload || ''}
                    onChange={(e) => setSettings({ ...settings, winthorStartDefaultPayload: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg p-2 text-foreground font-mono text-[11px] focus:outline-none focus:border-primary resize-none"
                    placeholder='{"m":"...","u":"...","p":"...","t":"...","s":"..."}'
                  />
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Usado como parâmetros fixos quando o WTA estiver fechado ou sem cookie ativo.
                  </p>
                </div>
              </div>
            </div>

            {/* Central de Controle WinThor (CCW) */}
            <div className="bg-card border border-border/80 rounded-xl p-3.5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Download className="w-4 h-4 text-blue-500" /> Central de Controle WinThor (CCW)
                  </span>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Download e atualização automática de rotinas e executáveis da nuvem direto para o ambiente local.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    URL Base da Central de Controle:
                  </label>
                  <input
                    type="text"
                    value={settings.ccwBaseUrl || 'https://centraldecontrole.pcinformatica.com.br'}
                    onChange={(e) => setSettings({ ...settings, ccwBaseUrl: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="https://centraldecontrole.pcinformatica.com.br"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Versão WinThor Padrão (CCW):
                  </label>
                  <input
                    type="text"
                    value={settings.ccwWinthorVersion || '30'}
                    onChange={(e) => setSettings({ ...settings, ccwWinthorVersion: e.target.value })}
                    className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                    placeholder="30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-foreground mb-1">
                  Cookie de Autenticação CCW (<code>auth_token</code> ou similar, opcional):
                </label>
                <input
                  type="password"
                  value={settings.ccwAuthCookie || ''}
                  onChange={(e) => setSettings({ ...settings, ccwAuthCookie: e.target.value })}
                  className="w-full bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary"
                  placeholder="Cole o cookie da sessão web se necessário para rotinas restritas"
                />
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Para download direto pelo número da rotina, a CCW não exige autenticação. O cookie é usado para carregar toda a árvore de módulos e rotinas.
                </p>
              </div>
            </div>

            {/* Executável da IDE */}
            <div className="space-y-1.5" id="field-intellijPath">
              <div className="flex items-center justify-between">
                <label
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Caminho do .exe da sua IDE (IntelliJ IDEA, VS Code, etc). Usado pelo botão 'Abrir na IDE' para abrir projetos com um clique."
                >
                  <Code2 className="w-3.5 h-3.5 text-primary" />
                  Executável da IDE / Editor de Código:
                </label>
                {renderPathStatusBadge('intellijPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.intellijPath}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, intellijPath: val });
                    validateSinglePath('intellijPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: idea64.exe, Code.exe, Cursor.exe..."
                />
                <button
                  type="button"
                  onClick={() => handleBrowseFile('intellijPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar executável (.exe)"
                >
                  <FileCode2 className="w-3.5 h-3.5 text-primary" />
                  <span>Procurar...</span>
                </button>
              </div>
            </div>

            {/* Rótulo de Exibição da IDE */}
            <div className="md:col-span-2 pt-1">
              <div className="bg-muted/40 border border-border/80 rounded-xl p-3 space-y-1">
                <label className="block text-[11px] font-bold text-foreground">
                  Rótulo de Exibição da IDE (Opcional):
                </label>
                <input
                  type="text"
                  value={settings.ideName || ''}
                  onChange={(e) => setSettings({ ...settings, ideName: e.target.value })}
                  className="w-full bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-1.5 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors"
                  placeholder={`Padrão automático: "${detectIdeInfo(settings.intellijPath).name}"`}
                />
              </div>
            </div>

            {/* Diretório do Projeto de Testes Automatizados (Cypress / E2E) */}
            <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-border/50" id="field-tautProjectPath">
              <div className="flex items-center justify-between">
                <label
                  className="font-bold text-foreground flex items-center gap-1.5"
                  title="Caminho do repositório de testes automatizados (Cypress / TAUT). Se deixado em branco, o Dev Manager tenta autodetectar automaticamente dentro da pasta de Projetos."
                >
                  <TestTube className="w-3.5 h-3.5 text-emerald-400" />
                  Diretório do Projeto de Testes Automatizados (Cypress):
                </label>
                {renderPathStatusBadge('tautProjectPath')}
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={settings.tautProjectPath || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSettings({ ...settings, tautProjectPath: val });
                    validateSinglePath('tautProjectPath', val);
                  }}
                  className="flex-1 bg-card border border-border hover:border-primary/50 rounded-xl px-3 py-2 text-foreground font-mono text-xs focus:outline-none focus:border-primary transition-colors shadow-sm"
                  placeholder="Ex: C:\Projetos\TAUT-Mississauga ou C:\Projetos\testes-cypress (Vazio: autodetecta na pasta de projetos)"
                />
                <button
                  type="button"
                  onClick={() => handleBrowseDirectory('tautProjectPath')}
                  className="px-3 py-2 bg-card hover:bg-muted border border-border hover:border-primary/50 rounded-xl text-foreground font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 shadow-sm"
                  title="Selecionar pasta do projeto de testes"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Procurar...</span>
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Utilizado pelo módulo <strong>Automação de Testes</strong> na Central de Qualidade e pelas ferramentas MCP da IA. Se não preenchido, o Dev Manager procura automaticamente uma pasta de testes (<code>TAUT-Mississauga</code>, <code>taut</code> ou <code>cypress</code>) no Diretório Base dos Repositórios Git ou pastas irmãs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
