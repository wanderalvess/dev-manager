import React, { useState } from 'react';
import {
  Archive,
  X,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  RefreshCw,
  RotateCw,
  Play,
  Trash2,
  Download
} from 'lucide-react';
import type { WslDistroInfo, WslSnapshotFileInfo } from '../../../../../shared/types';

export interface WslSnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  snapshotsList: WslSnapshotFileInfo[];
  snapshotsDirInput: string;
  setSnapshotsDirInput: (dir: string) => void;
  isLoadingSnapshots: boolean;
  availableDistros: WslDistroInfo[];
  onLoadSnapshots: () => void;
  onSaveSnapshotsDir: (dir: string) => void;
  onImportSnapshot: (params: { distroName: string; installDir: string; tarPath: string }) => Promise<void> | void;
  onExportSnapshot: (params: { distroName: string; exportPath: string }) => Promise<void> | void;
  onUnregisterDistro: (distroName: string) => Promise<void> | void;
  snapshotImporting: boolean;
  snapshotExporting: boolean;
  snapshotUnregistering: string | null;
  snapshotFeedback: { success: boolean; message: string } | null;
  setSnapshotFeedback: (val: { success: boolean; message: string } | null) => void;
}

export const WslSnapshotsModal: React.FC<WslSnapshotsModalProps> = ({
  isOpen,
  onClose,
  snapshotsList,
  snapshotsDirInput,
  setSnapshotsDirInput,
  isLoadingSnapshots,
  availableDistros,
  onLoadSnapshots,
  onSaveSnapshotsDir,
  onImportSnapshot,
  onExportSnapshot,
  onUnregisterDistro,
  snapshotImporting,
  snapshotExporting,
  snapshotUnregistering,
  snapshotFeedback,
  setSnapshotFeedback
}) => {
  const [snapshotImportName, setSnapshotImportName] = useState<string>('ubuntu2604-winthor');
  const [snapshotImportTarPath, setSnapshotImportTarPath] = useState<string>('');
  const [snapshotImportInstallDir, setSnapshotImportInstallDir] = useState<string>('C:\\WSL\\ubuntu2604-winthor');
  const [snapshotExportDistro, setSnapshotExportDistro] = useState<string>('');
  const [snapshotExportPath, setSnapshotExportPath] = useState<string>('');

  if (!isOpen) return null;

  const handleClose = () => {
    setSnapshotFeedback(null);
    onClose();
  };

  const handleImport = () => {
    if (!snapshotImportTarPath.trim() || !snapshotImportName.trim()) return;
    onImportSnapshot({
      distroName: snapshotImportName.trim(),
      installDir: snapshotImportInstallDir.trim(),
      tarPath: snapshotImportTarPath.trim()
    });
  };

  const handleExport = () => {
    if (!snapshotExportDistro || !snapshotExportPath.trim()) return;
    onExportSnapshot({
      distroName: snapshotExportDistro,
      exportPath: snapshotExportPath.trim()
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/20">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
                <span>Snapshots WSL (.tar)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                  WSL2 Backup & Restore
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Importação de distros a partir de snapshots .tar (ex: ubuntu2604-winthor-26-07-22.tar) e exportação de backups
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {snapshotFeedback && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              snapshotFeedback.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <div className="flex items-center gap-2">
              {snapshotFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{snapshotFeedback.message}</span>
            </div>
            <button
              onClick={() => setSnapshotFeedback(null)}
              className="p-1 hover:opacity-70 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-5 space-y-5 [scrollbar-width:thin]">
          {/* Barra de Configuração de Diretório de Busca */}
          <div className="p-3.5 bg-muted/30 border border-border/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FolderOpen className="w-3.5 h-3.5 text-primary" />
                <span>Diretório de Snapshots (.tar)</span>
              </span>
              <button
                onClick={onLoadSnapshots}
                disabled={isLoadingSnapshots}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isLoadingSnapshots ? 'animate-spin text-primary' : ''}`} />
                <span>Atualizar Lista</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={snapshotsDirInput}
                onChange={(e) => setSnapshotsDirInput(e.target.value)}
                placeholder="Ex: C:\Users\wanderson.alves\projetosTOTV ou C:\Docker"
                className="flex-1 bg-background border border-border/80 rounded-lg px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => onSaveSnapshotsDir(snapshotsDirInput)}
                className="px-3 py-1.5 bg-card hover:bg-muted text-foreground border border-border/80 rounded-lg text-xs font-semibold transition cursor-pointer active:scale-98 shrink-0"
              >
                Salvar Pasta
              </button>
            </div>
          </div>

          {/* Lista de Snapshots Encontrados */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-foreground">
                Snapshots .tar Disponíveis ({snapshotsList.length})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Arquivos .tar encontrados nos diretórios do sistema
              </span>
            </div>

            {isLoadingSnapshots ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-primary" />
                <span>Buscando arquivos de snapshot...</span>
              </div>
            ) : snapshotsList.length === 0 ? (
              <div className="p-4 bg-muted/20 border border-dashed border-border/80 rounded-xl text-center text-xs text-muted-foreground">
                Nenhum arquivo .tar encontrado nos diretórios configurados.
              </div>
            ) : (
              <div className="space-y-2">
                {snapshotsList.map((snap) => (
                  <div
                    key={snap.path}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition ${
                      snapshotImportTarPath === snap.path
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-card border-border/80 hover:border-border'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Archive className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="font-bold text-xs font-mono text-foreground truncate" title={snap.name}>
                          {snap.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-muted text-muted-foreground shrink-0">
                          {snap.formattedSize}
                        </span>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate" title={snap.path}>
                        {snap.path}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSnapshotImportTarPath(snap.path);
                        const cleanDistro = snap.name
                          .replace(/\.tar$/i, '')
                          .replace(/-\d{2}-\d{2}-\d{2}$/, '');
                        setSnapshotImportName(cleanDistro || 'ubuntu2604-winthor');
                        setSnapshotImportInstallDir(`C:\\WSL\\${cleanDistro || 'ubuntu2604-winthor'}`);
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition cursor-pointer shrink-0 ${
                        snapshotImportTarPath === snap.path
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card hover:bg-muted text-foreground border-border/80'
                      }`}
                    >
                      {snapshotImportTarPath === snap.path ? 'Selecionado' : 'Selecionar'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Painel de Importação Rápida (wsl --import) */}
          <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-emerald-500 fill-current" />
              <span>Importar Snapshot Selecionado (wsl --import)</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Nome da Distro a Criar
                </label>
                <input
                  type="text"
                  value={snapshotImportName}
                  onChange={(e) => setSnapshotImportName(e.target.value)}
                  placeholder="Ex: ubuntu2604-winthor"
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Diretório de Instalação (VHDX)
                </label>
                <input
                  type="text"
                  value={snapshotImportInstallDir}
                  onChange={(e) => setSnapshotImportInstallDir(e.target.value)}
                  placeholder="Ex: C:\WSL\ubuntu2604-winthor"
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                Caminho do Arquivo .tar
              </label>
              <input
                type="text"
                value={snapshotImportTarPath}
                onChange={(e) => setSnapshotImportTarPath(e.target.value)}
                placeholder="Selecione na lista acima ou informe o caminho completo"
                className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                Executa <code className="text-foreground font-mono">wsl --shutdown</code> e em seguida <code className="text-foreground font-mono">wsl --import</code>
              </span>

              <button
                onClick={handleImport}
                disabled={snapshotImporting || !snapshotImportTarPath.trim() || !snapshotImportName.trim()}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {snapshotImporting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>{snapshotImporting ? 'Importando Snapshot (Aguarde)...' : 'Importar Distro WSL'}</span>
              </button>
            </div>
          </div>

          {/* Painel de Exportação e Remoção de Distros WSL */}
          <div className="p-4 bg-muted/20 border border-border/80 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Archive className="w-3.5 h-3.5 text-amber-500" />
              <span>Exportar Backup ou Desregistrar Distro Existente</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Distro de Origem
                </label>
                <select
                  value={snapshotExportDistro}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSnapshotExportDistro(val);
                    if (val) {
                      setSnapshotExportPath(`C:\\WSL\\snapshots\\${val}-backup.tar`);
                    }
                  }}
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="">Selecione a distro WSL...</option>
                  {availableDistros.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name} ({d.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  Caminho do .tar de Destino
                </label>
                <input
                  type="text"
                  value={snapshotExportPath}
                  onChange={(e) => setSnapshotExportPath(e.target.value)}
                  placeholder="Ex: C:\WSL\snapshots\backup.tar"
                  className="w-full bg-background border border-border/80 rounded-lg px-2.5 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Desregistrar */}
              {snapshotExportDistro && (
                <button
                  onClick={() => onUnregisterDistro(snapshotExportDistro)}
                  disabled={snapshotUnregistering === snapshotExportDistro}
                  title="Exclui definitivamente esta distro e seu disco virtual"
                  className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>
                    {snapshotUnregistering === snapshotExportDistro
                      ? 'Removendo...'
                      : `Desregistrar "${snapshotExportDistro}"`}
                  </span>
                </button>
              )}

              {/* Exportar */}
              <button
                onClick={handleExport}
                disabled={snapshotExporting || !snapshotExportDistro || !snapshotExportPath.trim()}
                className="ml-auto flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 active:scale-98"
              >
                {snapshotExporting ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>{snapshotExporting ? 'Exportando Backup...' : 'Exportar Snapshot (.tar)'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/80 flex items-center justify-between bg-muted/10">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary inline-block" />
            Compatível com Container Manager & WSL2 Nativo
          </span>

          <button
            onClick={handleClose}
            className="px-3.5 py-1.5 bg-card hover:bg-muted border border-border/80 text-foreground rounded-lg text-xs font-semibold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
