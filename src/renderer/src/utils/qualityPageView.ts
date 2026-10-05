import type { TestExecutionResult } from '../../../shared/types';
import {
  calculateQualityMetrics,
  getDefaultValidationItems,
  type QualityMetrics,
  type QualityValidationItem,
  type ValidationCategory,
  type ValidationItemStatus
} from './qualityPageUtils';

export const QUALITY_STORAGE_KEY_VALIDATION = 'devManager:quality:validationItemsV1';
export const QUALITY_STORAGE_KEY_RELEASE = 'devManager:quality:releaseVersion';
export const QUALITY_DEFAULT_RELEASE = '';

export type QualityTabMode = 'taut' | 'matrix' | 'runners' | 'regression' | 'readiness' | 'roadmap';

// Release gravada pelas versões anteriores como valor padrão (nunca digitada pelo usuário)
const LEGACY_DEFAULT_RELEASE = 'v1.24.0';
const LEGACY_SEED_IDS = new Set(['val-1', 'val-2']);

export function migrateLegacyRelease(value: string): string {
  return value === LEGACY_DEFAULT_RELEASE ? QUALITY_DEFAULT_RELEASE : value;
}

// As versões anteriores gravavam no navegador cenários-modelo já com resultado ("Aprovado" / "Em teste", testador
// "QA Team") sem que nada tivesse sido verificado. Só os itens ainda com a assinatura intacta voltam a "pendente".
export function migrateLegacySeedItems(items: QualityValidationItem[]): QualityValidationItem[] {
  return items.map((item) => {
    const isUntouchedSeed =
      LEGACY_SEED_IDS.has(item.id) &&
      item.testerName === 'QA Team' &&
      (item.status === 'passed' || item.status === 'in_progress');
    if (!isUntouchedSeed) return item;
    const { testerName: _tester, testedVersion: _version, ...rest } = item;
    return { ...rest, status: 'pending' };
  });
}

export function readStoredReleaseVersion(): string {
  try {
    return migrateLegacyRelease(localStorage.getItem(QUALITY_STORAGE_KEY_RELEASE) || QUALITY_DEFAULT_RELEASE);
  } catch {
    return QUALITY_DEFAULT_RELEASE;
  }
}

export function readStoredValidationItems(): QualityValidationItem[] {
  try {
    const raw = localStorage.getItem(QUALITY_STORAGE_KEY_VALIDATION);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((i) => i && typeof i.id === 'string' && typeof i.title === 'string')) {
      return migrateLegacySeedItems(parsed);
    }
  } catch {
    // fallback
  }
  return getDefaultValidationItems();
}

export function getStatusSelectClass(status: ValidationItemStatus): string {
  switch (status) {
    case 'passed':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    case 'failed':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'in_progress':
      return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    case 'blocked':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

export function getCategoryLabel(category: ValidationCategory): string {
  switch (category) {
    case 'routine':
      return 'Rotina Delphi';
    case 'service':
      return 'Serviço Karaf';
    case 'api':
      return 'API REST';
    default:
      return 'Fluxo E2E';
  }
}

// openIssues = falhas + bloqueios + pendências: com qualquer um deles a release nunca é dada como pronta
export function getReadinessVerdict(score: number, openIssues = 0): {
  ringClass: string;
  title: string;
} {
  if (score >= 80 && openIssues === 0) {
    return {
      ringClass: 'border-emerald-500 bg-emerald-500/10 text-emerald-500',
      title: 'Release Pronta para Produção 🚀'
    };
  }
  if (score >= 50 || (score >= 80 && openIssues > 0)) {
    return {
      ringClass: 'border-amber-500 bg-amber-500/10 text-amber-500',
      title: 'Atenção: Testes em Andamento ⚠️'
    };
  }
  return {
    ringClass: 'border-rose-500 bg-rose-500/10 text-rose-500',
    title: 'Bloqueado: Correções Necessárias ⛔'
  };
}

const CATEGORY_ORDER: ValidationCategory[] = ['routine', 'service', 'api', 'e2e'];

/** Métricas dos cenários da Matriz agrupadas por categoria (sempre as 4, mesmo vazias). */
export function calculateCategoryBreakdown(
  items: QualityValidationItem[]
): Array<{ category: ValidationCategory; metrics: QualityMetrics }> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    metrics: calculateQualityMetrics(items.filter((item) => item.category === category))
  }));
}

export function getReadinessSummary(failed: number, pending: number): string {
  if (failed > 0) {
    return `Existem ${failed} falhas registradas que precisam de resolução pela equipe de desenvolvimento antes da entrega.`;
  }
  if (pending > 0) {
    return `Restam ${pending} cenários pendentes de execução pela equipe de QA.`;
  }
  return 'Todos os testes foram executados com sucesso sem impedimentos técnicos.';
}

/** Largura percentual de um segmento da barra de progresso (evita divisão por zero). */
export function getProgressWidth(count: number, total: number): string {
  return `${(count / (total || 1)) * 100}%`;
}

export function buildNewValidationItem(input: {
  title: string;
  target: string;
  category: ValidationCategory;
  notes: string;
}): QualityValidationItem {
  return {
    id: `val-${Date.now()}`,
    title: input.title.trim(),
    targetName: input.target.trim(),
    category: input.category,
    status: 'pending',
    notes: input.notes.trim() || undefined,
    updatedAt: new Date().toISOString()
  };
}

export function applyRunnerResultToItem(
  item: QualityValidationItem,
  result: TestExecutionResult,
  newStatus: ValidationItemStatus
): QualityValidationItem {
  const runInfo = `[Auto-Runner ${result.runnerName}] Executado em ${new Date(
    result.executedAt
  ).toLocaleTimeString()} - Status: ${result.status.toUpperCase()} (${result.passedCount} passaram, ${result.failedCount} falharam)`;
  return {
    ...item,
    status: newStatus,
    notes: item.notes ? `${item.notes}\n${runInfo}` : runInfo,
    updatedAt: new Date().toISOString()
  };
}
