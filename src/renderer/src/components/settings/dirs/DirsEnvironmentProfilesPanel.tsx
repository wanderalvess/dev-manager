import React from 'react';
import { Layers, Trash2, Plus } from 'lucide-react';
import { AppSettings, EnvironmentProfile } from '../../../../../shared/types';

interface DirsEnvironmentProfilesPanelProps {
  settings: AppSettings;
  handleActivateEnvironmentProfile: (profile: EnvironmentProfile) => void;
  handleDeleteEnvironmentProfile: (id: string) => void;
  newEnvironmentProfileLabel: string;
  setNewEnvironmentProfileLabel: (label: string) => void;
  handleSaveCurrentAsEnvironmentProfile: () => void;
}

export const DirsEnvironmentProfilesPanel: React.FC<DirsEnvironmentProfilesPanelProps> = ({
  settings,
  handleActivateEnvironmentProfile,
  handleDeleteEnvironmentProfile,
  newEnvironmentProfileLabel,
  setNewEnvironmentProfileLabel,
  handleSaveCurrentAsEnvironmentProfile
}) => (
  <div className="cockpit-panel rounded-2xl p-5 space-y-3 shadow-xl border border-border">
    <div className="flex items-center justify-between pb-1 border-b border-border/60">
      <h3 className="text-xs font-semibold text-foreground flex items-center gap-2">
        <Layers className="w-3.5 h-3.5 text-primary" /> Perfis de Ambiente
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
);
