import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TestExecutionResult } from '../../../../../shared/types';
import { showToast } from '../../../components/ToastHost';
import { useCopyToClipboard } from '../../useCopyToClipboard';
import {
  calculateQualityMetrics,
  filterValidationItems,
  generateQualityMarkdownReport,
  getDefaultValidationItems,
  type QualityValidationItem,
  type ValidationItemStatus
} from '../../../utils/qualityPageUtils';
import {
  QUALITY_STORAGE_KEY_RELEASE,
  QUALITY_STORAGE_KEY_VALIDATION,
  applyRunnerResultToItem,
  readStoredReleaseVersion,
  readStoredValidationItems,
  downloadQualityCsv,
  generateQualityCsv,
  sortValidationItems,
  type QualitySortDir,
  type QualitySortKey
} from '../../../utils/qualityPageView';

export function useQualityValidationItems() {
  const [releaseVersion, setReleaseVersion] = useState<string>(readStoredReleaseVersion);
  const [items, setItems] = useState<QualityValidationItem[]>(readStoredValidationItems);

  // Salva itens no localStorage quando modificados
  useEffect(() => {
    try {
      localStorage.setItem(QUALITY_STORAGE_KEY_VALIDATION, JSON.stringify(items));
    } catch {
      // localStorage indisponível
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(QUALITY_STORAGE_KEY_RELEASE, releaseVersion);
    } catch {
      // localStorage indisponível
    }
  }, [releaseVersion]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { copy, copiedKey } = useCopyToClipboard(2000);
  const metrics = useMemo(() => calculateQualityMetrics(items), [items]);

  const [sort, setSort] = useState<{ key: QualitySortKey | null; dir: QualitySortDir }>({ key: null, dir: 'asc' });
  const { key: sortKey, dir: sortDir } = sort;

  const filteredItems = useMemo(
    () => sortValidationItems(filterValidationItems(items, searchTerm, statusFilter, categoryFilter), sortKey, sortDir),
    [items, searchTerm, statusFilter, categoryFilter, sortKey, sortDir]
  );

  // Mesmo cabeçalho: alterna asc/desc; novo cabeçalho começa em asc
  const handleSort = useCallback((key: QualitySortKey) => {
    setSort((prev) => ({ key, dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc' }));
  }, []);

  const updateItem = useCallback((id: string, patch: Pick<QualityValidationItem, 'title' | 'targetName' | 'category' | 'notes'>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    );
    showToast('Cenário atualizado.', 'success');
  }, []);

  const handleExportCsv = useCallback(() => {
    if (filteredItems.length === 0) {
      showToast('Nenhum cenário para exportar.', 'info');
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadQualityCsv(generateQualityCsv(filteredItems), `matriz-qualidade-${stamp}.csv`);
    showToast(`${filteredItems.length} cenário(s) exportado(s) em CSV.`, 'success');
  }, [filteredItems]);

  const handleStatusChange = useCallback((id: string, newStatus: ValidationItemStatus) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: newStatus, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  const handleDeleteItem = useCallback((id: string) => {
    if (!window.confirm('Remover este cenário da matriz? Esta ação não pode ser desfeita.')) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    showToast('Cenário removido com sucesso.', 'info');
  }, []);

  const handleResetDefaults = useCallback(() => {
    if (window.confirm('Deseja restaurar os cenários de teste padrão de exemplo?')) {
      const defaults = getDefaultValidationItems();
      setItems(defaults);
      showToast('Cenários restaurados para o padrão.', 'info');
    }
  }, []);

  const addItem = useCallback((newItem: QualityValidationItem) => {
    setItems((prev) => [newItem, ...prev]);
    showToast('Novo cenário de validação adicionado.', 'success');
  }, []);

  const handleCopyReport = () => {
    const report = generateQualityMarkdownReport({
      releaseVersion,
      metrics,
      items
    });
    copy(report, 'report');
    showToast('Relatório de homologação copiado em Markdown!', 'success');
  };

  const handleSyncWithValidationMatrix = useCallback(
    (_runnerId: string, result: TestExecutionResult) => {
      const linkedIds = result.linkedValidationItemIds || [];
      if (linkedIds.length === 0) {
        showToast('Nenhum cenário da matriz vinculado a este runner.', 'info');
        return;
      }

      // Execução abortada não prova falha do cenário: fica bloqueada até nova execução
      const newStatus: ValidationItemStatus =
        result.status === 'passed' ? 'passed' : result.status === 'aborted' ? 'blocked' : 'failed';
      const updatedCount = items.filter((item) => linkedIds.includes(item.id)).length;

      if (updatedCount === 0) {
        showToast('Os cenários vinculados a este runner não existem mais na Matriz.', 'info');
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          linkedIds.includes(item.id) ? applyRunnerResultToItem(item, result, newStatus) : item
        )
      );

      const label = newStatus === 'passed' ? 'Aprovado' : newStatus === 'blocked' ? 'Bloqueado' : 'Falha';
      showToast(
        `${updatedCount} cenário(s) da Matriz atualizado(s) para "${label}"!`,
        newStatus === 'passed' ? 'success' : newStatus === 'blocked' ? 'info' : 'error'
      );
    },
    [items]
  );

  return {
    items,
    filteredItems,
    metrics,
    releaseVersion,
    setReleaseVersion,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    copiedKey,
    sortKey,
    sortDir,
    handleSort,
    updateItem,
    handleExportCsv,
    handleStatusChange,
    handleDeleteItem,
    handleResetDefaults,
    addItem,
    handleCopyReport,
    handleSyncWithValidationMatrix
  };
}
