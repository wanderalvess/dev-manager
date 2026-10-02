import fs from 'fs';
import path from 'path';
import {
  DatabaseConnectionConfig,
  QaAssertionResult,
  QaExecutionRequest,
  QaExecutionResult,
  QaRegressionTemplate,
  QaStepExecutionResult
} from '../../shared/types';
import { ConfigService, getAppDataDir } from './ConfigService';
import { DatabaseService } from './DatabaseService';
import {
  evaluateSingleAssertion,
  extractBindsFromSql,
  getColumnValueFromRow
} from '../utils/qaRegressionUtils';
import { getDefaultQaTemplates } from '../utils/qaDefaultTemplates';

export class QaRegressionService {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService
  ) {
    this.ensureDefaultTemplates();
  }

  /**
   * Retorna o caminho do diretório dedicado de templates de regressivo
   */
  public getTemplatesDir(): string {
    const settings = this.configService.getSettings();
    if (settings.qaTemplatesDir && fs.existsSync(settings.qaTemplatesDir)) {
      return settings.qaTemplatesDir;
    }
    const dir = path.join(getAppDataDir(), 'qa-templates');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  /**
   * Garante que os templates padrão existam no diretório dedicado
   */
  public ensureDefaultTemplates(): void {
    try {
      const dir = this.getTemplatesDir();
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
      if (files.length === 0) {
        const defaults = getDefaultQaTemplates();
        for (const tmpl of defaults) {
          const filePath = path.join(dir, `${tmpl.id}.json`);
          fs.writeFileSync(filePath, JSON.stringify(tmpl, null, 2), 'utf-8');
        }
      }
    } catch (err: any) {
      console.warn('[QaRegressionService] Falha ao inicializar templates padrão:', err.message);
    }
  }

  /**
   * Lista todos os templates de regressivo salvos
   */
  public async listTemplates(): Promise<QaRegressionTemplate[]> {
    const dir = this.getTemplatesDir();
    if (!fs.existsSync(dir)) return [];

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
    const templates: QaRegressionTemplate[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(dir, f);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content) as QaRegressionTemplate;
        if (parsed.id && parsed.name && Array.isArray(parsed.steps)) {
          templates.push(parsed);
        }
      } catch (err: any) {
        console.warn(`[QaRegressionService] Erro ao carregar template ${f}:`, err.message);
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Obtém um template específico pelo seu id
   */
  public async getTemplate(id: string): Promise<QaRegressionTemplate | null> {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = this.getTemplatesDir();
    const filePath = path.join(dir, `${safeId}.json`);

    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as QaRegressionTemplate;
      } catch {
        return null;
      }
    }

    // Se não encontrou por arquivo exato, busca na listagem
    const all = await this.listTemplates();
    return all.find((t) => t.id === id) || null;
  }

  /**
   * Salva ou atualiza um template de teste regressivo
   */
  public async saveTemplate(template: QaRegressionTemplate): Promise<QaRegressionTemplate> {
    const safeId = (template.id || `template-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = this.getTemplatesDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const updatedTemplate: QaRegressionTemplate = {
      ...template,
      id: safeId,
      updatedAt: new Date().toISOString()
    };

    const filePath = path.join(dir, `${safeId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(updatedTemplate, null, 2), 'utf-8');
    return updatedTemplate;
  }

  /**
   * Exclui um template
   */
  public async deleteTemplate(id: string): Promise<boolean> {
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, '');
    const dir = this.getTemplatesDir();
    const filePath = path.join(dir, `${safeId}.json`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Resolve a conexão de banco de dados para a execução
   */
  private resolveConnection(request: QaExecutionRequest): DatabaseConnectionConfig | null {
    if (request.connectionConfig) {
      return this.databaseService.resolveConnectionConfig(request.connectionConfig);
    }
    const settings = this.configService.getSettings();
    const connections = settings.databaseConnections || [];

    if (request.connectionId) {
      const found = connections.find((c) => c.id === request.connectionId);
      if (found) return this.databaseService.resolveConnectionConfig(found);
    }

    // Se não especificado, tenta a primeira conexão Oracle ativa
    const firstOracle = connections.find((c) => c.type === 'oracle');
    if (firstOracle) return this.databaseService.resolveConnectionConfig(firstOracle);

    return connections.length > 0 ? this.databaseService.resolveConnectionConfig(connections[0]) : null;
  }

  /**
   * Executa a bateria de validações regressivas
   */
  public async executeSuite(request: QaExecutionRequest): Promise<QaExecutionResult> {
    const startTime = Date.now();
    const connConfig = this.resolveConnection(request);

    if (!connConfig) {
      throw new Error(
        'Nenhuma conexão com banco de dados selecionada ou configurada. Configure uma conexão Oracle em Database Studio ou Configurações.'
      );
    }

    let template: QaRegressionTemplate | null = request.template || null;
    if (!template && request.templateId) {
      template = await this.getTemplate(request.templateId);
    }

    if (!template) {
      throw new Error('Template de validação regressiva não encontrado ou não informado.');
    }

    // Parse do JSON de payload (se houver)
    let jsonContext: any = null;
    if (request.rawJson && typeof request.rawJson === 'string') {
      try {
        jsonContext = JSON.parse(request.rawJson.trim());
      } catch (err: any) {
        console.warn('[QaRegressionService] JSON de payload inválido:', err.message);
      }
    } else if (typeof request.rawJson === 'object') {
      jsonContext = request.rawJson;
    }

    // Inicialização do mapa dinâmico de variáveis
    const currentVars: Record<string, any> = {
      ...(template.defaultVariables || {})
    };

    // Auto-popula variáveis comuns se encontradas no JSON de payload
    if (jsonContext && typeof jsonContext === 'object') {
      if (jsonContext.codFilial !== undefined) currentVars.codFilial = jsonContext.codFilial;
      if (jsonContext.filial !== undefined && currentVars.codFilial === undefined) {
        currentVars.codFilial = jsonContext.filial;
      }
      if (jsonContext.numCupom !== undefined) currentVars.numCupom = jsonContext.numCupom;
      if (jsonContext.numNota !== undefined && currentVars.numCupom === undefined) {
        currentVars.numCupom = jsonContext.numNota;
      }
      if (jsonContext.numPed !== undefined) currentVars.numPed = jsonContext.numPed;
      if (jsonContext.chaveNfe !== undefined) currentVars.chaveNfe = jsonContext.chaveNfe;
    }

    // Sobrepõe com as variáveis enviadas na requisição manual
    if (request.variables) {
      for (const [k, v] of Object.entries(request.variables)) {
        if (v !== undefined && v !== null && v !== '') {
          currentVars[k] = v;
        }
      }
    }

    const stepResults: QaStepExecutionResult[] = [];
    let totalAssertions = 0;
    let passedAssertions = 0;
    let failedAssertions = 0;
    let warningAssertions = 0;

    const stepsToRun = template.steps.filter((s) => {
      if (!s.enabled) return false;
      if (request.selectedStepIds && request.selectedStepIds.length > 0) {
        return request.selectedStepIds.includes(s.id);
      }
      return true;
    });

    for (const step of stepsToRun) {
      const stepStartTime = Date.now();
      const bindNames = extractBindsFromSql(step.query);
      const binds: Record<string, any> = {};

      for (const name of bindNames) {
        // Busca na lista de variáveis (case-insensitive)
        let resolvedVal = currentVars[name];
        if (resolvedVal === undefined) {
          const lowerName = name.toLowerCase();
          for (const [k, v] of Object.entries(currentVars)) {
            if (k.toLowerCase() === lowerName) {
              resolvedVal = v;
              break;
            }
          }
        }
        binds[name] = resolvedVal !== undefined ? resolvedVal : null;
      }

      const interpolatedQuery = this.databaseService.interpolateBinds(step.query, binds);
      let queryResult;
      let stepSuccess = true;
      let stepError: string | undefined;

      try {
        queryResult = await this.databaseService.executeQuery(connConfig, step.query, 100, binds);
        if (!queryResult.success) {
          stepSuccess = false;
          stepError = queryResult.error || 'Erro desconhecido ao executar query no banco.';
        }
      } catch (err: any) {
        stepSuccess = false;
        stepError = err.message;
      }

      const rows = queryResult?.rows || [];
      const rowCount = queryResult?.rowCount ?? rows.length;
      const stepDuration = Date.now() - stepStartTime;

      // Se o passo gerou extração de variáveis para os próximos passos
      if (stepSuccess && rows.length > 0 && step.extractVariables) {
        for (const ext of step.extractVariables) {
          const rowIdx = ext.rowIndex ?? 0;
          const targetRow = rows[rowIdx] || rows[0];
          const val = getColumnValueFromRow(targetRow, ext.column);
          if (val !== undefined && val !== null) {
            currentVars[ext.variableName] = val;
          }
        }
      }

      // Avaliação das asserções deste passo
      const assertionResults: QaAssertionResult[] = [];

      for (const assertion of step.assertions) {
        totalAssertions++;

        if (!stepSuccess) {
          assertionResults.push({
            assertionId: assertion.id,
            column: assertion.column,
            expectedType: assertion.expectedType,
            expectedDisplay: assertion.expectedValue || '-',
            actualDisplay: 'N/A',
            status: 'failed',
            message: `Falha na consulta SQL: ${stepError}`
          });
          failedAssertions++;
          continue;
        }

        if (rows.length === 0) {
          // Nenhuma linha retornada
          if (assertion.expectedType === 'null' || assertion.expectedValue === '<N>') {
            assertionResults.push({
              assertionId: assertion.id,
              column: assertion.column,
              expectedType: assertion.expectedType,
              expectedDisplay: '<N> (Vazio)',
              actualDisplay: 'Nenhum registro',
              status: 'passed',
              message: 'Nenhum registro retornado, conforme esperado para valor nulo/ausente.'
            });
            passedAssertions++;
          } else {
            assertionResults.push({
              assertionId: assertion.id,
              column: assertion.column,
              expectedType: assertion.expectedType,
              expectedDisplay: assertion.expectedValue || '-',
              actualDisplay: '0 registros retornados',
              status: 'failed',
              message: 'A consulta SQL não retornou nenhum registro no banco de dados.'
            });
            failedAssertions++;
          }
          continue;
        }

        // Se rowIndex for -1, avalia para cada linha
        if (assertion.rowIndex === -1) {
          for (let rIdx = 0; rIdx < rows.length; rIdx++) {
            const actualVal = getColumnValueFromRow(rows[rIdx], assertion.column);
            const res = evaluateSingleAssertion(actualVal, assertion, jsonContext, rIdx);
            assertionResults.push(res);
            if (res.status === 'passed') passedAssertions++;
            else if (res.status === 'failed') failedAssertions++;
            else if (res.status === 'warning') warningAssertions++;
          }
        } else {
          const rIdx = assertion.rowIndex ?? 0;
          const targetRow = rows[rIdx] || rows[0];
          const actualVal = getColumnValueFromRow(targetRow, assertion.column);
          const res = evaluateSingleAssertion(actualVal, assertion, jsonContext, rIdx);
          assertionResults.push(res);

          if (res.status === 'passed') passedAssertions++;
          else if (res.status === 'failed') failedAssertions++;
          else if (res.status === 'warning') warningAssertions++;
        }
      }

      stepResults.push({
        stepId: step.id,
        stepTitle: step.title,
        tableName: step.tableName,
        query: step.query,
        interpolatedQuery,
        rowCount,
        executionTimeMs: stepDuration,
        success: stepSuccess && assertionResults.every((a) => a.status !== 'failed'),
        error: stepError,
        assertions: assertionResults,
        rows
      });
    }

    const totalDuration = Date.now() - startTime;
    const overallSuccess = failedAssertions === 0 && stepResults.every((s) => !s.error);

    return {
      templateId: template.id,
      templateName: template.name,
      timestamp: new Date().toISOString(),
      durationMs: totalDuration,
      totalAssertions,
      passedAssertions,
      failedAssertions,
      warningAssertions,
      success: overallSuccess,
      extractedVariables: currentVars,
      stepResults
    };
  }
}
