import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderPlus,
  Pencil,
  Search,
  CheckSquare,
  Square,
  ArrowUp,
  ArrowDown,
  Clock,
  Box,
  Layers,
  Sparkles
} from 'lucide-react';
import type {
  ContainerEnvironment,
  ContainerEnvironmentSlot,
  DockerContainerInfo
} from '../../../../../shared/types';
import {
  getGroupContainerNames,
  buildEnvironmentSlotsFromList
} from '../../../utils/dockerContainerUtils';

export interface SaveEnvironmentModalProps {
  isOpen: boolean;
  containers: DockerContainerInfo[];
  selectedDistro?: string;
  editingEnvironment?: ContainerEnvironment | null;
  preselectedContainerNames?: string[];
  onClose: () => void;
  onSave: (env: ContainerEnvironment) => void;
}

const COLOR_OPTIONS = [
  '#0066cc', // Azul TOTVS / Docker
  '#10b981', // Esmeralda
  '#f59e0b', // Âmbar
  '#8b5cf6', // Roxo / Violeta
  '#ec4899', // Rosa
  '#06b6d4', // Ciano
  '#ef4444', // Vermelho
  '#64748b'  // Ardósia
];

interface SelectedSlotItem {
  name: string;
  delay: number;
}

export const SaveEnvironmentModal: React.FC<SaveEnvironmentModalProps> = ({
  isOpen,
  containers,
  selectedDistro,
  editingEnvironment,
  preselectedContainerNames,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#0066cc');
  const [selectedSlots, setSelectedSlots] = useState<SelectedSlotItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');

  // Inicializa dados ao abrir o modal ou mudar o ambiente sendo editado
  useEffect(() => {
    if (!isOpen) return;

    if (editingEnvironment) {
      setName(editingEnvironment.name || '');
      setColor(editingEnvironment.color || '#0066cc');

      const initialSlots: SelectedSlotItem[] = [];
      for (const item of editingEnvironment.containers || []) {
        if (typeof item === 'string') {
          const delay = editingEnvironment.delays?.[item] || 0;
          initialSlots.push({ name: item.replace(/^\//, '').trim(), delay });
        } else if (item && typeof item === 'object') {
          initialSlots.push({
            name: item.name.replace(/^\//, '').trim(),
            delay: item.delay || 0
          });
        }
      }
      setSelectedSlots(initialSlots);
    } else {
      // Criação de novo grupo
      setName('');
      setColor(COLOR_OPTIONS[Math.floor(Math.random() * COLOR_OPTIONS.length)]);

      if (preselectedContainerNames && preselectedContainerNames.length > 0) {
        setSelectedSlots(
          preselectedContainerNames.map((n) => ({
            name: n.replace(/^\//, '').trim(),
            delay: 0
          }))
        );
      } else {
        // Pré-seleciona containers ativos por padrão, se houver
        const running = containers
          .filter((c) => c.state === 'running')
          .map((c) => ({
            name: c.names.replace(/^\//, '').trim(),
            delay: 0
          }));
        setSelectedSlots(running);
      }
    }
    setSearchFilter('');
  }, [isOpen, editingEnvironment, preselectedContainerNames, containers]);

  const isEditing = Boolean(editingEnvironment);

  const cleanContainers = useMemo(() => {
    return containers.map((c) => ({
      ...c,
      cleanName: c.names.replace(/^\//, '').trim()
    }));
  }, [containers]);

  // Containers filtrados pela busca interna do modal
  const filteredAvailableContainers = useMemo(() => {
    if (!searchFilter.trim()) return cleanContainers;
    const term = searchFilter.toLowerCase();
    return cleanContainers.filter(
      (c) =>
        c.cleanName.toLowerCase().includes(term) ||
        c.image.toLowerCase().includes(term) ||
        c.ports.toLowerCase().includes(term)
    );
  }, [cleanContainers, searchFilter]);

  if (!isOpen) return null;

  const isContainerSelected = (cleanName: string) => {
    return selectedSlots.some((s) => s.name.toLowerCase() === cleanName.toLowerCase());
  };

  const getContainerSlotIndex = (cleanName: string) => {
    return selectedSlots.findIndex((s) => s.name.toLowerCase() === cleanName.toLowerCase());
  };

  const handleToggleContainer = (cleanName: string) => {
    setSelectedSlots((prev) => {
      const exists = prev.some((s) => s.name.toLowerCase() === cleanName.toLowerCase());
      if (exists) {
        return prev.filter((s) => s.name.toLowerCase() !== cleanName.toLowerCase());
      } else {
        return [...prev, { name: cleanName, delay: 0 }];
      }
    });
  };

  const handleUpdateDelay = (cleanName: string, delay: number) => {
    const safeDelay = Math.max(0, Math.min(300, isNaN(delay) ? 0 : delay));
    setSelectedSlots((prev) =>
      prev.map((s) => (s.name.toLowerCase() === cleanName.toLowerCase() ? { ...s, delay: safeDelay } : s))
    );
  };

  const handleMoveSlot = (index: number, direction: 'up' | 'down') => {
    setSelectedSlots((prev) => {
      const next = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      const temp = next[index];
      next[index] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  };

  // Presets Rápidos
  const handleApplyPreset = (preset: 'all' | 'running' | 'clear' | 'winthor') => {
    if (preset === 'all') {
      setSelectedSlots(cleanContainers.map((c) => ({ name: c.cleanName, delay: 0 })));
    } else if (preset === 'running') {
      setSelectedSlots(
        cleanContainers
          .filter((c) => c.state === 'running')
          .map((c) => ({ name: c.cleanName, delay: 0 }))
      );
    } else if (preset === 'clear') {
      setSelectedSlots([]);
    } else if (preset === 'winthor') {
      const oracle = cleanContainers.find((c) => c.cleanName.toLowerCase().includes('oracle'));
      const wta = cleanContainers.find(
        (c) => c.cleanName.toLowerCase().includes('wta') || c.cleanName.toLowerCase().includes('linux')
      );
      const wsh = cleanContainers.find((c) => c.cleanName.toLowerCase().includes('wsh'));

      const list: SelectedSlotItem[] = [];
      if (oracle) list.push({ name: oracle.cleanName, delay: 30 });
      if (wta) list.push({ name: wta.cleanName, delay: 10 });
      if (wsh) list.push({ name: wsh.cleanName, delay: 0 });

      if (list.length > 0) {
        setSelectedSlots(list);
        if (!name) setName('WinThor Stack');
      }
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;

    const slots: ContainerEnvironmentSlot[] = selectedSlots.map((item, idx) => ({
      id: String(idx + 1),
      name: item.name,
      ...(item.delay > 0 ? { delay: item.delay } : {})
    }));

    const delaysMap: Record<string, number> = {};
    for (const item of selectedSlots) {
      if (item.delay > 0) {
        delaysMap[item.name] = item.delay;
      }
    }

    const env: ContainerEnvironment = {
      id: editingEnvironment?.id || `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      color,
      wslDistro: editingEnvironment?.wslDistro || selectedDistro || undefined,
      containers: slots,
      delays: Object.keys(delaysMap).length > 0 ? delaysMap : undefined
    };

    onSave(env);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-fade-in overflow-hidden">
        {/* Cabeçalho do Modal */}
        <div className="p-4 border-b border-border flex items-start space-x-3 shrink-0 bg-muted/20">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: color }}
          >
            {isEditing ? <Pencil className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              {isEditing ? `Editar Grupo: ${editingEnvironment?.name || ''}` : 'Criar Grupo de Containers'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Selecione quais containers fazem parte deste grupo e defina a ordem/delay de inicialização.
            </p>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Nome e Cor do Grupo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nome do Grupo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Stack Financeiro, Core Bancos, Mensageria"
                className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">Cor de Identificação</label>
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                      color === c
                        ? 'scale-125 ring-2 ring-foreground/40 ring-offset-2 ring-offset-card shadow-xs'
                        : 'opacity-70 hover:opacity-100 hover:scale-110'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Seleção */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-muted/60 hover:bg-muted text-foreground border border-border/70 transition cursor-pointer"
              >
                Todos ({cleanContainers.length})
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('running')}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition cursor-pointer"
              >
                Apenas Rodando ({cleanContainers.filter((c) => c.state === 'running').length})
              </button>
              {cleanContainers.some((c) => c.cleanName.toLowerCase().includes('oracle') || c.cleanName.toLowerCase().includes('wta')) && (
                <button
                  type="button"
                  onClick={() => handleApplyPreset('winthor')}
                  className="px-2 py-1 rounded-md text-[11px] font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>WinThor Stack</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleApplyPreset('clear')}
                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-muted/40 hover:bg-muted text-muted-foreground transition cursor-pointer"
              >
                Limpar
              </button>
            </div>

            {/* Contador Selecionados */}
            <span className="text-xs font-bold text-primary px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              {selectedSlots.length} de {cleanContainers.length} selecionados
            </span>
          </div>

          {/* Busca e Lista de Seleção de Containers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Containers Disponíveis ({filteredAvailableContainers.length})
              </label>

              {cleanContainers.length > 5 && (
                <div className="relative w-48">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Filtrar containers..."
                    className="w-full bg-background border border-border/80 rounded-lg pl-8 pr-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {filteredAvailableContainers.length === 0 ? (
              <div className="p-4 text-center border border-dashed border-border rounded-xl text-xs text-muted-foreground">
                Nenhum container encontrado com o filtro "{searchFilter}".
              </div>
            ) : (
              <div className="border border-border/80 rounded-xl divide-y divide-border/60 max-h-64 overflow-y-auto bg-background/50">
                {filteredAvailableContainers.map((container) => {
                  const isSelected = isContainerSelected(container.cleanName);
                  const slotIndex = getContainerSlotIndex(container.cleanName);
                  const slot = slotIndex >= 0 ? selectedSlots[slotIndex] : null;

                  return (
                    <div
                      key={container.id}
                      className={`p-2.5 flex items-center justify-between gap-2 transition ${
                        isSelected ? 'bg-primary/[0.04]' : 'hover:bg-muted/30'
                      }`}
                    >
                      {/* Checkbox, Ordem e Nome */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleContainer(container.cleanName)}
                          className="w-4 h-4 rounded text-primary border-border/80 focus:ring-primary focus:ring-1 cursor-pointer accent-primary shrink-0"
                        />

                        {isSelected && (
                          <span
                            className="w-5 h-5 rounded-full text-[10px] font-mono font-bold flex items-center justify-center shrink-0 text-white shadow-2xs"
                            style={{ backgroundColor: color }}
                            title={`Ordem de inicialização: #${slotIndex + 1}`}
                          >
                            {slotIndex + 1}
                          </span>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground truncate font-sans">
                              {container.cleanName}
                            </span>

                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                container.state === 'running'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {container.state === 'running' ? 'RODANDO' : 'PARADO'}
                            </span>
                          </div>

                          <div className="text-[10px] text-muted-foreground truncate font-mono mt-0.5">
                            {container.image}
                            {container.ports ? ` • ${container.ports}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Controles de Sequência e Delay (Apenas quando selecionado) */}
                      {isSelected && slot && (
                        <div className="flex items-center gap-1.5 shrink-0 bg-card p-1 rounded-lg border border-border/70 shadow-2xs">
                          {/* Delay de inicialização em segundos */}
                          <div className="flex items-center gap-1 text-[11px] px-1.5 py-0.5" title="Delay de warm-up antes de iniciar o próximo container">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground text-[10px]">Delay:</span>
                            <input
                              type="number"
                              min="0"
                              max="300"
                              value={slot.delay}
                              onChange={(e) => handleUpdateDelay(container.cleanName, parseInt(e.target.value, 10))}
                              className="w-12 bg-background border border-border rounded px-1 text-center text-xs font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <span className="text-muted-foreground text-[10px]">s</span>
                          </div>

                          {/* Mover para Cima / Baixo na Ordem */}
                          <div className="flex items-center gap-0.5 border-l border-border pl-1">
                            <button
                              type="button"
                              onClick={() => handleMoveSlot(slotIndex, 'up')}
                              disabled={slotIndex === 0}
                              title="Subir na fila de inicialização"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSlot(slotIndex, 'down')}
                              disabled={slotIndex === selectedSlots.length - 1}
                              title="Descer na fila de inicialização"
                              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 cursor-pointer"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo da Ordem de Inicialização */}
          {selectedSlots.length > 0 && (
            <div className="p-3 bg-muted/40 rounded-xl border border-border/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-foreground text-[11px]">
                <span>Ordem de subida do grupo:</span>
                <span className="text-muted-foreground font-normal">
                  {selectedSlots.length} containers em sequência
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {selectedSlots.map((slot, idx) => (
                  <span
                    key={slot.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-background border border-border/80 text-[10px] font-mono shadow-2xs"
                  >
                    <strong className="text-primary font-bold">#{idx + 1}</strong>
                    <span className="text-foreground">{slot.name}</span>
                    {slot.delay > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">
                        (+{slot.delay}s)
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="p-3 border-t border-border flex items-center justify-end space-x-2 shrink-0 bg-muted/10">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || selectedSlots.length === 0}
            className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 active:scale-98"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Grupo'}
          </button>
        </div>
      </div>
    </div>
  );
};
