import React, { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import type { DockerContainerInfo } from '../../../../../shared/types';

export interface SaveEnvironmentModalProps {
  isOpen: boolean;
  containers: DockerContainerInfo[];
  selectedDistro?: string;
  onClose: () => void;
  onSave: (data: { name: string; color: string; presetType: 'current' | 'doc' | 'infr' }) => void;
}

const COLOR_OPTIONS = ['#0066cc', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

export const SaveEnvironmentModal: React.FC<SaveEnvironmentModalProps> = ({
  isOpen,
  containers,
  selectedDistro,
  onClose,
  onSave
}) => {
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvColor, setNewEnvColor] = useState('#0066cc');
  const [envPresetType, setEnvPresetType] = useState<'current' | 'doc' | 'infr'>('current');

  if (!isOpen) return null;

  const handleSave = () => {
    if (!newEnvName.trim()) return;
    onSave({
      name: newEnvName.trim(),
      color: newEnvColor,
      presetType: envPresetType
    });
    setNewEnvName('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-5 animate-fade-in space-y-4">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
            <FolderPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">Salvar Ambiente</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Agrupe os containers detectados em um ambiente com sequência e delay para reutilização rápida.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* Presets Rápidos de Ambiente */}
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground block mb-1.5 uppercase tracking-wider">
              Presets de Ambiente
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setEnvPresetType('doc');
                  if (!newEnvName || newEnvName === 'WinThor Dev (INFR-Docker)') {
                    setNewEnvName('WinThor Local (Doc Oficial)');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                  envPresetType === 'doc'
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                    : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                }`}
              >
                <div className="font-semibold truncate">Doc Oficial</div>
                <div className="text-[10px] text-muted-foreground truncate">oracle-local, wta-local</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEnvPresetType('infr');
                  if (!newEnvName || newEnvName === 'WinThor Local (Doc Oficial)') {
                    setNewEnvName('WinThor Dev (INFR-Docker)');
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                  envPresetType === 'infr'
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                    : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                }`}
              >
                <div className="font-semibold truncate">INFR-Docker</div>
                <div className="text-[10px] text-muted-foreground truncate">oracle-winthor, linux...</div>
              </button>

              <button
                type="button"
                onClick={() => setEnvPresetType('current')}
                className={`px-2.5 py-1.5 rounded-lg border text-left text-xs transition cursor-pointer ${
                  envPresetType === 'current'
                    ? 'bg-primary/10 border-primary text-primary font-bold shadow-xs'
                    : 'bg-muted/40 border-border/70 text-foreground hover:bg-muted/70'
                }`}
              >
                <div className="font-semibold truncate">Detectados</div>
                <div className="text-[10px] text-muted-foreground truncate">{containers.length} containers</div>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Nome do Ambiente</label>
            <input
              type="text"
              value={newEnvName}
              onChange={(e) => setNewEnvName(e.target.value)}
              placeholder="Ex: WinThor Dev, QA, Homologação"
              className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">Cor de Destaque</label>
            <div className="flex items-center gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewEnvColor(color)}
                  style={{ backgroundColor: color }}
                  className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                    newEnvColor === color
                      ? 'scale-125 ring-2 ring-foreground/40 ring-offset-2 ring-offset-card'
                      : 'opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-3 bg-muted/60 rounded-xl border border-border/50 text-[11px] space-y-1 text-muted-foreground">
            <div className="font-semibold text-foreground flex items-center justify-between">
              <span>Sequência de inicialização:</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border font-mono">
                {envPresetType === 'doc'
                  ? 'Doc Oficial (30s / 10s)'
                  : envPresetType === 'infr'
                  ? 'INFR-Docker (45s / 15s)'
                  : 'Customizado'}
              </span>
            </div>
            {envPresetType === 'doc' ? (
              <>
                <div>• 1. <strong className="text-foreground">oracle-local</strong> (Delay: 30s de warm-up)</div>
                <div>• 2. <strong className="text-foreground">wta-local</strong> (Delay: 10s)</div>
                <div>• 3. <strong className="text-foreground">wsh-local</strong></div>
              </>
            ) : envPresetType === 'infr' ? (
              <>
                <div>• 1. <strong className="text-foreground">oracle-winthor</strong> (Delay: 45s de warm-up)</div>
                <div>• 2. <strong className="text-foreground">linux-winthor</strong> (Delay: 15s)</div>
                <div>• 3. <strong className="text-foreground">wsh-winthor</strong></div>
              </>
            ) : (
              <>
                <div>
                  • 1. Oracle (
                  {containers.find((c) => c.names.toLowerCase().includes('oracle'))?.names.replace(/^\//, '') ||
                    'oracle-local'}
                  , 30s)
                </div>
                <div>
                  • 2. WTA (
                  {containers
                    .find(
                      (c) =>
                        c.names.toLowerCase().includes('wta') ||
                        c.names.toLowerCase().includes('linux-winthor')
                    )
                    ?.names.replace(/^\//, '') || 'wta-local'}
                  , 10s)
                </div>
                {containers.some((c) => c.names.toLowerCase().includes('wsh')) && (
                  <div>
                    • 3. WSH (
                    {containers.find((c) => c.names.toLowerCase().includes('wsh'))?.names.replace(/^\//, '')})
                  </div>
                )}
              </>
            )}
            {selectedDistro && (
              <div className="text-sky-600 dark:text-sky-400 pt-0.5">
                • Vinculado à distro WSL: {selectedDistro}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!newEnvName.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            Salvar no Container Manager
          </button>
        </div>
      </div>
    </div>
  );
};
