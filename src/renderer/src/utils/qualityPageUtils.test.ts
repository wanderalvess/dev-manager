import { describe, it, expect } from 'vitest';
import {
  calculateQualityMetrics,
  filterValidationItems,
  generateQualityMarkdownReport,
  getDefaultValidationItems,
  QualityValidationItem
} from './qualityPageUtils';

describe('qualityPageUtils', () => {
  it('retorna métricas zeradas quando a lista de itens é vazia', () => {
    const metrics = calculateQualityMetrics([]);
    expect(metrics.total).toBe(0);
    expect(metrics.passed).toBe(0);
    expect(metrics.passRate).toBe(0);
    expect(metrics.readinessScore).toBe(0);
  });

  it('calcula métricas de qualidade corretamente com itens variados', () => {
    const items: QualityValidationItem[] = [
      { id: '1', title: 'Teste 1', category: 'routine', status: 'passed', targetName: 'Rotina A' },
      { id: '2', title: 'Teste 2', category: 'routine', status: 'passed', targetName: 'Rotina B' },
      { id: '3', title: 'Teste 3', category: 'service', status: 'in_progress', targetName: 'Karaf' },
      { id: '4', title: 'Teste 4', category: 'api', status: 'failed', targetName: 'API' }
    ];

    const metrics = calculateQualityMetrics(items);
    expect(metrics.total).toBe(4);
    expect(metrics.passed).toBe(2);
    expect(metrics.inProgress).toBe(1);
    expect(metrics.failed).toBe(1);
    expect(metrics.passRate).toBe(50); // 2/4 = 50%
    expect(metrics.readinessScore).toBeGreaterThan(0);
  });

  it('filtra itens por busca, status e categoria', () => {
    const items = getDefaultValidationItems();

    // Filtro por categoria
    const routinesOnly = filterValidationItems(items, '', 'all', 'routine');
    expect(routinesOnly.every((i) => i.category === 'routine')).toBe(true);

    // Filtro por status
    const passedOnly = filterValidationItems(items, '', 'passed', 'all');
    expect(passedOnly.every((i) => i.status === 'passed')).toBe(true);

    // Filtro por busca textual
    const searched = filterValidationItems(items, 'Karaf', 'all', 'all');
    expect(searched.length).toBeGreaterThan(0);
    expect(searched[0].targetName).toContain('Karaf');
  });

  it('gera relatório de homologação estruturado em Markdown', () => {
    const items = getDefaultValidationItems();
    const metrics = calculateQualityMetrics(items);
    const report = generateQualityMarkdownReport({
      releaseVersion: 'v1.24.0',
      metrics,
      items
    });

    expect(report).toContain('Relatório de Homologação e Qualidade (QA)');
    expect(report).toContain('v1.24.0');
    expect(report).toContain('Taxa de Aprovação');
    expect(report).toContain('Matriz de Validação');
  });
});
