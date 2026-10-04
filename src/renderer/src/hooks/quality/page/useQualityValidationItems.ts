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
  readStoredValidationItems
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

  const filteredItems = useMemo(
    () => filterValidationItems(items, searchTerm, statusFilter, categoryFilter),
    [items, searchTerm, statusFilter, categoryFilter]
  );

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

      const newStatus: ValidationItemStatus = result.status === 'passed' ? 'passed' : 'failed';
      let updatedCount = 0;

      setItems((prev) =>
        prev.map((item) => {
          if (linkedIds.includes(item.id)) {
            updatedCount++;
            return applyRunnerResultToItem(item, result, newStatus);
          }
          return item;
        })
      );

      showToast(
        `${updatedCount} cenário(s) da Matriz atualizado(s) para "${newStatus === 'passed' ? 'Aprovado' : 'Falha'}"!`,
        newStatus === 'passed' ? 'success' : 'error'
      );
    },
    []
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
    handleStatusChange,
    handleDeleteItem,
    handleResetDefaults,
    addItem,
    handleCopyReport,
    handleSyncWithValidationMatrix
  };
}
