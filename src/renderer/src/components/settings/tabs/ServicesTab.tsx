import React from 'react';
import {
  Server,
  RotateCcw,
  Plus,
  ToggleRight,
  ToggleLeft,
  Trash2,
  Flame
} from 'lucide-react';
import {
  AppSettings,
  TrackedServiceConfig,
  TrackedProcessConfig
} from '../../../../../shared/types';

interface ServicesTabProps {
  settings: AppSettings;
  defaultServices: TrackedServiceConfig[];
  defaultProcesses: TrackedProcessConfig[];
  handleResetServices: () => void;
  handleAddService: (name?: string, displayName?: string) => void;
  handleUpdateService: (index: number, field: keyof TrackedServiceConfig, value: any) => void;
  handleRemoveService: (index: number) => void;
  handleResetProcesses: () => void;
  handleAddProcess: (name?: string, displayName?: string) => void;
  handleUpdateProcess: (index: number, field: keyof TrackedProcessConfig, value: any) => void;
  handleRemoveProcess: (index: number) => void;
}

export const ServicesTab: React.FC<ServicesTabProps> = ({
  settings,
  defaultServices,
  defaultProcesses,
  handleResetServices,
  handleAddService,
  handleUpdateService,
  handleRemoveService,
  handleResetProcesses,
  handleAddProcess,
  handleUpdateProcess,
  handleRemoveProcess
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
      {/* Card: Serviços Windows Monitorados */}
      <div className="lg:col-span-7 space-y-4 flex flex-col" id="field-services">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> Serviços Windows Monitorados
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Serviços gerenciados pelo painel com suporte a parada e início automatizados.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetServices}
                className="px-2.5 py-1 bg-card hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:border-rose-500/70 rounded-lg text-xs flex items-center gap-1 transition-colors shadow-xs"
                title="Restaurar lista de serviços padrão"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddService()}
                className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Serviço</span>
              </button>
            </div>
          </div>

          {/* Lista de Serviços */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {(settings.trackedServices || defaultServices).map((srv, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl border flex flex-col space-y-2 transition-all ${
                  srv.enabled
                    ? 'bg-card border-border hover:border-primary/40'
                    : 'bg-muted/40 border-border/40 opacity-60'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleUpdateService(index, 'enabled', !srv.enabled)}
                    className={`p-1 rounded text-xs transition-colors ${
                      srv.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                    }`}
                    title={srv.enabled ? 'Clique para Desativar Monitoramento' : 'Clique para Ativar'}
                  >
                    {srv.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                  </button>

                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={srv.displayName}
                      onChange={(e) => handleUpdateService(index, 'displayName', e.target.value)}
                      className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-bold text-foreground focus:outline-hidden focus:border-primary"
                      placeholder="Nome Amigável (ex: Serviço API Local)"
                    />
                    <input
                      type="text"
                      value={srv.name}
                      onChange={(e) => handleUpdateService(index, 'name', e.target.value)}
                      className="bg-card border border-border rounded-lg px-2.5 py-1 text-xs font-mono text-muted-foreground focus:outline-hidden focus:border-primary"
                      placeholder="Nome do Serviço (ex: MeuServico.API)"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveService(index)}
                    className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                    title="Remover Serviço"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Checkboxes de Automação Padrão */}
                <div className="flex items-center space-x-4 pl-9 text-[11px] text-muted-foreground">
                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={srv.autoStop ?? true}
                      onChange={(e) => handleUpdateService(index, 'autoStop', e.target.checked)}
                      className="rounded border-border text-rose-500 h-3.5 w-3.5"
                    />
                    <span>Parar na Preparação</span>
                  </label>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={srv.autoStart ?? false}
                      onChange={(e) => handleUpdateService(index, 'autoStart', e.target.checked)}
                      className="rounded border-border text-emerald-500 h-3.5 w-3.5"
                    />
                    <span>Iniciar na Preparação</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Card: Processos Conflitantes (Encerramento de Travas) */}
      <div className="lg:col-span-5 space-y-4 flex flex-col" id="field-processes">
        <div className="cockpit-panel rounded-2xl p-5 space-y-4 shadow-xl border border-border flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-1 border-b border-border/60">
            <div>
              <h3 className="text-[13px] font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-500" /> Processos Conflitantes (Kill)
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Processos finalizados para liberação de portas e arquivos.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleResetProcesses}
                className="px-2.5 py-1 bg-card hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/40 hover:border-rose-500/70 rounded-lg text-xs flex items-center gap-1 transition-colors shadow-xs"
                title="Restaurar padrões de processos"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Padrões</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddProcess()}
                className="px-3 py-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>

          {/* Lista de Processos */}
          <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
            {(settings.trackedProcesses || defaultProcesses).map((proc, index) => (
              <div
                key={index}
                className={`p-3 rounded-xl border flex items-center space-x-2.5 transition-all ${
                  proc.enabled
                    ? 'bg-card border-border hover:border-rose-500/40'
                    : 'bg-muted/40 border-border/40 opacity-60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleUpdateProcess(index, 'enabled', !proc.enabled)}
                  className={`p-1 rounded text-xs transition-colors ${
                    proc.enabled ? 'text-emerald-500' : 'text-muted-foreground'
                  }`}
                  title={proc.enabled ? 'Clique para Desativar' : 'Clique para Ativar'}
                >
                  {proc.enabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                </button>

                <div className="flex-1 space-y-1">
                  <input
                    type="text"
                    value={proc.displayName}
                    onChange={(e) => handleUpdateProcess(index, 'displayName', e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2 py-1 text-xs font-semibold text-foreground focus:outline-hidden focus:border-primary"
                    placeholder="Nome Amigável"
                  />
                  <input
                    type="text"
                    value={proc.name}
                    onChange={(e) => handleUpdateProcess(index, 'name', e.target.value)}
                    className="w-full bg-card border border-border rounded-lg px-2 py-1 text-xs font-mono text-muted-foreground focus:outline-hidden focus:border-primary"
                    placeholder="Nome do Executável (.exe)"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveProcess(index)}
                  className="p-1.5 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Remover Processo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
