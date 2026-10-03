import { QaRegressionTemplate } from '../../../shared/types';

/**
 * Sanitiza o template antes de exportar, garantindo formatação consistente.
 */
export function sanitizeTemplateForExport(template: QaRegressionTemplate): QaRegressionTemplate {
  return {
    id: template.id || `template-${Date.now()}`,
    name: template.name || 'Cenário Regressivo',
    description: template.description || '',
    category: template.category || 'Geral',
    author: template.author || 'QA',
    version: template.version || '1.0.0',
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    defaultVariables: template.defaultVariables || {},
    sampleJson: template.sampleJson || undefined,
    steps: Array.isArray(template.steps) ? template.steps : []
  };
}

/**
 * Serializa um template individual para JSON formatado.
 */
export function serializeTemplateToJson(template: QaRegressionTemplate, pretty = true): string {
  const sanitized = sanitizeTemplateForExport(template);
  return pretty ? JSON.stringify(sanitized, null, 2) : JSON.stringify(sanitized);
}

/**
 * Serializa uma coleção de templates para JSON formatado (backup/bundle).
 */
export function serializeTemplatesBundleToJson(
  templates: QaRegressionTemplate[],
  pretty = true
): string {
  const sanitizedList = templates.map(sanitizeTemplateForExport);
  return pretty ? JSON.stringify(sanitizedList, null, 2) : JSON.stringify(sanitizedList);
}

/**
 * Gera um nome de arquivo seguro para download do template.
 */
export function getTemplateExportFilename(template: QaRegressionTemplate): string {
  const baseName = (template.id || template.name || 'template')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return `${baseName || 'template'}.json`;
}

/**
 * Dispara o download de um conteúdo textual no navegador ou Electron renderer.
 */
export function downloadJsonFile(jsonString: string, filename: string): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(jsonString);
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Exporta um template individual de regressivo em arquivo .json.
 */
export function exportTemplateAsJsonFile(
  template: QaRegressionTemplate,
  customFilename?: string
): void {
  const json = serializeTemplateToJson(template);
  const filename = customFilename || getTemplateExportFilename(template);
  downloadJsonFile(json, filename);
}

/**
 * Exporta um lote de templates de regressivo em arquivo .json único.
 */
export function exportTemplatesBundleAsJsonFile(
  templates: QaRegressionTemplate[],
  filename = 'qa-templates-backup.json'
): void {
  const json = serializeTemplatesBundleToJson(templates);
  downloadJsonFile(json, filename);
}
