import { useState } from 'react';
import { RealtimeLogSource } from '../../../../shared/types';

/** Formulário de cadastro/edição de fontes de log do modal de gerenciamento. */
export function useLogSourceEditor(
  sources: RealtimeLogSource[],
  persistSources: (newSources: RealtimeLogSource[], newActiveId?: string) => Promise<void>
) {
  const [editingSource, setEditingSource] = useState<Partial<RealtimeLogSource> | null>(null);

  const handleBrowseLogFile = async () => {
    if (!window.electronAPI?.selectFile) return;
    try {
      const selected = await window.electronAPI.selectFile({
        filters: [
          { name: 'Arquivos de Log (*.log, *.out, *.txt)', extensions: ['log', 'out', 'txt'] },
          { name: 'Todos os arquivos (*.*)', extensions: ['*'] }
        ]
      });
      if (selected && editingSource) {
        setEditingSource((prev) => ({
          ...prev,
          filePath: selected,
          name: prev?.name || selected.split(/[\\/]/).pop()?.replace(/\.(log|out|txt)$/i, '') || 'Novo Log'
        }));
      }
    } catch (err) {
      console.error('Erro ao selecionar arquivo:', err);
    }
  };

  const handleSaveSource = () => {
    if (!editingSource?.name || !editingSource?.filePath) return;
    const newId = editingSource.id || `custom-log-${Date.now()}`;
    const item: RealtimeLogSource = {
      id: newId,
      name: editingSource.name,
      filePath: editingSource.filePath,
      encoding: editingSource.encoding || 'utf-8',
      enabled: true
    };

    let updated: RealtimeLogSource[];
    if (editingSource.id) {
      updated = sources.map((s) => (s.id === editingSource.id ? item : s));
    } else {
      updated = [...sources, item];
    }
    persistSources(updated, newId);
    setEditingSource(null);
  };

  return { editingSource, setEditingSource, handleBrowseLogFile, handleSaveSource };
}
