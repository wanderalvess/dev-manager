import fs from 'fs';
import path from 'path';
import {
  TautProjectStatus,
  TautCoverageReport,
  TautCoverageItem,
  TautSpecSummary,
  TautRunOptions,
  TautCsvIntakeResult,
  TautCsvIntakeScenario,
  TautEnvSyncResult,
  TestExecutionResult,
  DatabaseConnectionConfig
} from '../../shared/types';
import { ConfigService } from './ConfigService';
import { DatabaseService } from './DatabaseService';
import { TestRunnerService } from './TestRunnerService';
import { isSafeLocalPath } from '../utils/security';
import { buildAnchoredTautKeyRegex, buildTautKeyRegex, describeTautKeyPattern } from '../utils/tautKeyUtils';

// Nomes genéricos de pasta de testes; além deles, qualquer pasta que comece com "taut" é aceita
const TEST_FOLDER_CANDIDATES = ['taut', 'cypress-tests', 'cypress', 'e2e-tests'];

export class TautAutomationService {
  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private testRunnerService: TestRunnerService
  ) {}

  /**
   * Resolve o caminho do projeto de testes Cypress (TAUT) testando caminhos configurados,
   * padrões de ambiente e diretórios irmãos.
   */
  public resolveProjectPath(customPath?: string): string {
    if (customPath && isSafeLocalPath(customPath) && fs.existsSync(customPath)) {
      return customPath;
    }

    const settings = this.configService.getSettings();

    // 1. Caminho configurado especificamente pelo usuário nas Configurações
    if (settings.tautProjectPath && isSafeLocalPath(settings.tautProjectPath) && fs.existsSync(settings.tautProjectPath)) {
      return settings.tautProjectPath;
    }

    // 2. Autodetecção dentro do Diretório Base dos Repositórios Git (projectsPath)
    const testFolderCandidates = [...TEST_FOLDER_CANDIDATES];
    if (settings.projectsPath && fs.existsSync(settings.projectsPath)) {
      try {
        const tautDirs = fs
          .readdirSync(settings.projectsPath, { withFileTypes: true })
          .filter((e) => e.isDirectory() && e.name.toLowerCase().startsWith('taut') && !testFolderCandidates.includes(e.name))
          .map((e) => e.name);
        testFolderCandidates.unshift(...tautDirs);
      } catch {
        // pasta ilegível: segue só com os nomes genéricos
      }
      for (const candidate of testFolderCandidates) {
        const candidateInProjects = path.join(settings.projectsPath, candidate);
        if (fs.existsSync(candidateInProjects) && fs.existsSync(path.join(candidateInProjects, 'cypress.config.ts'))) {
          return candidateInProjects;
        }
      }
      for (const candidate of testFolderCandidates) {
        const candidateInProjects = path.join(settings.projectsPath, candidate);
        if (fs.existsSync(candidateInProjects)) {
          return candidateInProjects;
        }
      }
    }

    // 3. Procura no diretório pai/irmão de process.cwd() (ex: quando clonados lado a lado)
    for (const candidate of testFolderCandidates) {
      const siblingPath = path.resolve(process.cwd(), `../${candidate}`);
      if (fs.existsSync(siblingPath)) {
        return siblingPath;
      }
    }

    // 4. Se o usuário preencheu mas a pasta ainda não existe, preserva o caminho configurado
    if (settings.tautProjectPath && settings.tautProjectPath.trim()) {
      return settings.tautProjectPath.trim();
    }

    // 5. Fallback para detecção no diretório de projetos configurado ou vazio
    if (settings.projectsPath && settings.projectsPath.trim()) {
      return path.join(settings.projectsPath.trim(), 'taut');
    }

    return '';
  }

  /**
   * Salva o caminho do projeto TAUT nas configurações do Hub Manager.
   */
  public saveProjectPath(targetPath: string): void {
    if (!targetPath || !targetPath.trim()) {
      throw new Error('O caminho do projeto não pode ser vazio.');
    }
    const cleanPath = targetPath.trim();
    this.configService.saveSettings({ tautProjectPath: cleanPath });
  }

  /**
   * Retorna o status de integridade do projeto TAUT, incluindo
   * existência de package.json, cypress.config.ts, .env e variáveis configuradas.
   */
  public async getProjectStatus(customPath?: string): Promise<TautProjectStatus> {
    const projectPath = this.resolveProjectPath(customPath);
    const exists = fs.existsSync(projectPath);

    if (!exists) {
      return {
        exists: false,
        projectPath,
        hasPackageJson: false,
        hasCypressConfig: false,
        hasEnv: false
      };
    }

    const pkgPath = path.join(projectPath, 'package.json');
    const cypressConfigPath = path.join(projectPath, 'cypress.config.ts');
    const envPath = path.join(projectPath, '.env');

    const hasPackageJson = fs.existsSync(pkgPath);
    const hasCypressConfig = fs.existsSync(cypressConfigPath);
    const hasEnv = fs.existsSync(envPath);

    let cypressVersion: string | undefined;
    if (hasPackageJson) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        cypressVersion = pkg.devDependencies?.cypress || pkg.dependencies?.cypress;
      } catch {
        // Ignora erro de parse
      }
    }

    let envVariables: TautProjectStatus['envVariables'];
    if (hasEnv) {
      try {
        const content = fs.readFileSync(envPath, 'utf-8');
        const envMap: Record<string, string> = {};
        content.split(/\r?\n/).forEach((line) => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const [k, ...rest] = trimmed.split('=');
            if (k) envMap[k.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
          }
        });

        envVariables = {
          hasOracleUser: !!envMap['ORACLE_USER'],
          hasOraclePassword: !!envMap['ORACLE_PASSWORD'],
          hasOracleConnectString: !!envMap['ORACLE_CONNECT_STRING'],
          hasBaseUrl: !!envMap['CYPRESS_BASE_URL'],
          oracleConnectString: envMap['ORACLE_CONNECT_STRING'] || undefined,
          baseUrl: envMap['CYPRESS_BASE_URL'] || undefined,
          apiUrlMode: envMap['CYPRESS_API_URL_MODE'] || undefined,
          reporterZephyr: envMap['ZEPHYR_REPORTER_ENABLED'] === 'true',
          cycleKey: envMap['ZEPHYR_CYCLE_KEY'] || undefined
        };
      } catch {
        // Ignora erro de leitura do .env
      }
    }

    return {
      exists: true,
      projectPath,
      hasPackageJson,
      hasCypressConfig,
      hasEnv,
      cypressVersion,
      envVariables
    };
  }

  /**
   * Analisa a cobertura de testes automatizados cruzando os arquivos CSV em /Insumo
   * com os testes implementados em cypress/e2e/api.
   */
  public async getCoverage(customPath?: string): Promise<TautCoverageReport> {
    const projectPath = this.resolveProjectPath(customPath);
    const insumoDir = path.join(projectPath, 'Insumo');
    const testsDir = path.join(projectPath, 'cypress', 'e2e');

    const keyPrefix = this.configService.getSettings().tautKeyPrefix;
    const anchoredKeyRegex = buildAnchoredTautKeyRegex(keyPrefix);
    const zephyrIds = new Set<string>();

    // 1. Extrai IDs do Zephyr dos CSVs em Insumo/
    if (fs.existsSync(insumoDir)) {
      const csvFiles = fs.readdirSync(insumoDir).filter((f) => f.endsWith('.csv'));
      csvFiles.forEach((file) => {
        try {
          const content = fs.readFileSync(path.join(insumoDir, file), 'utf-8');
          content.split(/\r?\n/).forEach((line) => {
            const match = line.trim().match(anchoredKeyRegex);
            if (match) {
              zephyrIds.add(match[0]);
            }
          });
        } catch (err: any) {
          console.warn(`[TautAutomationService] Erro ao ler CSV ${file}:`, err.message);
        }
      });
    }

    // 2. Extrai IDs dos testes automatizados em cypress/e2e/
    const idToFile = new Map<string, string>();
    if (fs.existsSync(testsDir)) {
      const walk = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name.endsWith('.cy.ts')) {
            try {
              const content = fs.readFileSync(fullPath, 'utf-8');
              const matches = content.match(buildTautKeyRegex(keyPrefix, 'g'));
              if (matches) {
                const relPath = path.relative(projectPath, fullPath).replace(/\\/g, '/');
                matches.forEach((id) => {
                  idToFile.set(id, relPath);
                });
              }
            } catch {
              // Ignora arquivo corrompido
            }
          }
        }
      };
      walk(testsDir);
    }

    // Se nenhum CSV foi encontrado, usa os IDs encontrados nos testes como baseline
    const targetIds = zephyrIds.size > 0 ? Array.from(zephyrIds).sort() : Array.from(idToFile.keys()).sort();

    const items: TautCoverageItem[] = [];
    let automatedCount = 0;
    let pendingCount = 0;

    targetIds.forEach((key) => {
      const filePath = idToFile.get(key);
      if (filePath) {
        automatedCount++;
        items.push({ key, status: 'automated', filePath });
      } else {
        pendingCount++;
        items.push({ key, status: 'pending' });
      }
    });

    const totalScenarios = targetIds.length;
    // Sem CSV de insumo não há universo de cenários: medir os testes contra eles mesmos daria 100% trivial
    const baselineMissing = zephyrIds.size === 0;
    const coveragePercentage =
      totalScenarios > 0 && !baselineMissing ? Number(((automatedCount / totalScenarios) * 100).toFixed(2)) : 0;

    return {
      totalScenarios,
      automatedCount,
      pendingCount,
      coveragePercentage,
      baselineMissing,
      items,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Lista todas as suítes e arquivos de testes (.cy.ts) cadastrados no projeto TAUT,
   * agrupando por módulo e extraindo as tags e IDs do Zephyr.
   */
  public async listSpecs(customPath?: string): Promise<TautSpecSummary[]> {
    const projectPath = this.resolveProjectPath(customPath);
    const testsDir = path.join(projectPath, 'cypress', 'e2e');
    const specs: TautSpecSummary[] = [];

    if (!fs.existsSync(testsDir)) return [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.name.endsWith('.cy.ts')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const relativePath = path.relative(testsDir, fullPath).replace(/\\/g, '/');
            const pathParts = relativePath.split('/');
            const moduleName = pathParts.length > 1 ? pathParts[pathParts.length - 2] : 'Geral';

            // Contagem de it()
            const testMatches = content.match(/\bit\s*\(/g) || [];
            const testCount = testMatches.length;

            // Extrai IDs Zephyr
            const zephyrMatches = Array.from(new Set(content.match(buildTautKeyRegex(this.configService.getSettings().tautKeyPrefix, 'g')) || []));

            // Extrai tags do array tags: ['...']
            const tagsSet = new Set<string>();
            const tagArrayRegex = /tags\s*:\s*\[([^\]]+)\]/g;
            let tagMatch: RegExpExecArray | null;
            while ((tagMatch = tagArrayRegex.exec(content)) !== null) {
              const rawTags = tagMatch[1];
              rawTags.split(',').forEach((t) => {
                const clean = t.trim().replace(/['"]/g, '');
                if (clean) tagsSet.add(clean);
              });
            }

            specs.push({
              module: moduleName,
              specFile: entry.name,
              relativePath: path.relative(projectPath, fullPath).replace(/\\/g, '/'),
              testCount,
              testIds: zephyrMatches,
              tags: Array.from(tagsSet)
            });
          } catch {
            // Ignora falha em arquivo individual
          }
        }
      }
    };

    walk(testsDir);
    return specs.sort((a, b) => a.module.localeCompare(b.module) || a.specFile.localeCompare(b.specFile));
  }

  /**
   * Sincroniza o arquivo .env do projeto TAUT utilizando a conexão Oracle ativa
   * e as credenciais/URLs configuradas no Hub Manager.
   */
  public async syncEnvFromDevManager(
    customPath?: string,
    connectionId?: string
  ): Promise<TautEnvSyncResult> {
    const projectPath = this.resolveProjectPath(customPath);
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Diretório do projeto TAUT não encontrado: "${projectPath}"`);
    }

    const settings = this.configService.getSettings();
    const connections = settings.databaseConnections || [];

    let targetConn: DatabaseConnectionConfig | undefined;
    if (connectionId) {
      targetConn = connections.find((c) => c.id === connectionId);
    }
    if (!targetConn) {
      targetConn = connections.find((c) => c.type === 'oracle');
    }

    if (!targetConn) {
      throw new Error('Nenhuma conexão Oracle configurada no Hub Manager para sincronização.');
    }

    const resolved = this.databaseService.resolveConnectionConfig(targetConn);
    const connectString = `${resolved.host || 'localhost'}:${resolved.port || 1521}/${resolved.database || 'LOCAL'}`;

    const envPath = path.join(projectPath, '.env');
    let existingLines: string[] = [];
    if (fs.existsSync(envPath)) {
      existingLines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
    }

    const keysToSet: Record<string, string> = {
      ORACLE_CLIENT_ENV: process.platform === 'win32' ? 'windows' : 'linux',
      ORACLE_USER: resolved.user || '',
      ORACLE_PASSWORD: resolved.password || '',
      ORACLE_CONNECT_STRING: connectString,
      CYPRESS_BASE_URL: settings.wtaUrl || 'http://localhost:8889',
      // Sem login configurado, não grava credencial padrão no .env do projeto
      ...(settings.wtaLogin && settings.wtaPassword
        ? { CYPRESS_API_USUARIO: settings.wtaLogin, CYPRESS_API_SENHA: settings.wtaPassword }
        : {})
    };

    const updatedKeys: string[] = [];
    const modifiedLines: string[] = [];
    const touchedKeys = new Set<string>();

    for (const line of existingLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        modifiedLines.push(line);
        continue;
      }

      const [key] = trimmed.split('=');
      const cleanKey = key.trim();
      if (cleanKey in keysToSet) {
        modifiedLines.push(`${cleanKey}=${keysToSet[cleanKey]}`);
        touchedKeys.add(cleanKey);
        updatedKeys.push(cleanKey);
      } else {
        modifiedLines.push(line);
      }
    }

    // Adiciona chaves que ainda não existiam no .env
    for (const [k, v] of Object.entries(keysToSet)) {
      if (!touchedKeys.has(k)) {
        modifiedLines.push(`${k}=${v}`);
        updatedKeys.push(k);
      }
    }

    fs.writeFileSync(envPath, modifiedLines.join('\n'), 'utf-8');

    return {
      success: true,
      envPath,
      updatedKeys,
      message: `.env do projeto TAUT atualizado com sucesso (${updatedKeys.length} chaves sincronizadas com a conexão "${resolved.name}").`
    };
  }

  /**
   * Processa um arquivo CSV exportado do Zephyr Scale da pasta Insumo/,
   * validando as 11 regras arquiteturais do Orquestrador de Intake (Agents.md)
   * e gerando o bloco de intake estruturado e plano de implementação.
   */
  public async processCsvIntake(
    csvFilePath: string,
    customProjectPath?: string
  ): Promise<TautCsvIntakeResult> {
    const projectPath = this.resolveProjectPath(customProjectPath);
    let resolvedCsv = csvFilePath;

    if (!path.isAbsolute(resolvedCsv)) {
      const candidates = [
        path.join(projectPath, resolvedCsv),
        path.join(projectPath, 'Insumo', resolvedCsv),
        path.join(projectPath, 'Insumo', `${resolvedCsv}.csv`)
      ];
      const found = candidates.find((c) => fs.existsSync(c));
      if (!found) {
        throw new Error(`Arquivo CSV não encontrado: "${csvFilePath}". Verifique se o arquivo está na pasta Insumo/.`);
      }
      resolvedCsv = found;
    }

    if (!fs.existsSync(resolvedCsv)) {
      throw new Error(`Arquivo CSV não encontrado: "${resolvedCsv}"`);
    }

    const content = fs.readFileSync(resolvedCsv, 'utf-8');
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('O arquivo CSV está vazio ou contém apenas o cabeçalho.');
    }

    // Parse simples de CSV com suporte a campos entre aspas
    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    const header = parseCsvLine(lines[0]);
    const colIndex = (name: string): number => {
      return header.findIndex((h) => h.toLowerCase().trim() === name.toLowerCase().trim());
    };

    const idxKey = colIndex('Key');
    const idxName = colIndex('Name');
    const idxApi = colIndex('API/Endpoint/Rotina');
    const idxStep = colIndex('Test Script - Step');
    const idxTestData = colIndex('Test Script - Test Data');
    const idxExpected = colIndex('Test Script - Expected Result');
    const idxService = colIndex('Serviço');
    const idxPriority = colIndex('Priority');
    const idxFolder = colIndex('Folder');

    const keyPrefix = this.configService.getSettings().tautKeyPrefix;
    const intakeKeyRegex = buildAnchoredTautKeyRegex(keyPrefix);
    const blockers: string[] = [];
    const warnings: string[] = [];
    const scenarios: TautCsvIntakeScenario[] = [];

    let commonEndpoint = '';
    let commonMethod = 'GET';
    let commonWtaService = '';
    let inferredModule = 'Geral';
    let inferredId = '';

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);
      if (row.length === 0 || !row[0]) continue;

      const key = idxKey >= 0 ? row[idxKey] : row[0];
      const name = idxName >= 0 ? row[idxName] : '';
      const endpoint = idxApi >= 0 ? row[idxApi] : '';
      const step = idxStep >= 0 ? row[idxStep] : '';
      const testData = idxTestData >= 0 ? row[idxTestData] : '';
      const expected = idxExpected >= 0 ? row[idxExpected] : '';
      const service = idxService >= 0 ? row[idxService] : '';
      const priority = idxPriority >= 0 ? row[idxPriority] : '';
      const folder = idxFolder >= 0 ? row[idxFolder] : '';

      if (!key || !intakeKeyRegex.test(key)) {
        blockers.push(`Linha ${i + 1}: Chave "${key || 'Vazia'}" inválida. Deve seguir o padrão ${describeTautKeyPattern(keyPrefix)}.`);
      }

      if (endpoint && !commonEndpoint) commonEndpoint = endpoint;
      if (service && !commonWtaService) commonWtaService = service;

      // Extrai método HTTP do step
      const stepMethodMatch = step.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/i);
      if (stepMethodMatch) {
        commonMethod = stepMethodMatch[1].toUpperCase();
      }

      // Inferência de módulo do Folder ou Name
      if (inferredModule === 'Geral' && folder) {
        const folderParts = folder.split('/');
        const lastPart = folderParts[folderParts.length - 1] || '';
        const cleanModule = lastPart.replace(/^API\s*-\s*/i, '').trim();
        if (cleanModule) {
          inferredModule = cleanModule.replace(/[^a-zA-Z0-9]/g, '');
        }
      }

      // Inferência de ID da rotina
      if (!inferredId) {
        const idMatch = (folder + ' ' + name).match(/\b(\d{3,4})\b/);
        if (idMatch) inferredId = idMatch[1];
      }

      // Classificação do cenário
      let type: 'contrato' | 'positivo' | 'negativo' = 'positivo';
      const lowerAll = `${name} ${expected}`.toLowerCase();
      if (lowerAll.includes('contrato') || lowerAll.includes('schema')) {
        type = 'contrato';
      } else if (lowerAll.includes('erro') || lowerAll.includes('sem autentic') || expected.includes('40')) {
        type = 'negativo';
      }

      scenarios.push({
        key,
        name,
        testData,
        expectedResult: expected,
        type,
        priority
      });
    }

    if (!commonEndpoint) blockers.push('Nenhum endpoint de API identificado no CSV.');
    if (!commonWtaService) blockers.push('Coluna "Serviço" (WTA) não preenchida nos cenários.');

    const hasContract = scenarios.some((s) => s.type === 'contrato');
    if (!hasContract) warnings.push('Nenhum cenário de contrato (JSON Schema) identificado no CSV.');

    const hasNegative = scenarios.some((s) => s.type === 'negativo');
    if (!hasNegative) warnings.push('Nenhum cenário negativo (status 4xx) identificado no CSV.');

    // Modelo de IA recomendado conforme complexidade (Agents.md)
    const isComplex = commonMethod === 'POST' || commonMethod === 'PUT' || scenarios.length > 5;
    const recommendedModel = isComplex ? 'GPT-4o ou Claude Sonnet' : 'GPT-4o-mini ou Claude Haiku';

    const moduleFinal = inferredModule || 'Modulo';
    const idFinal = inferredId || '1';

    const intakeBlock = [
      `Crie os testes baseados no .csv da pasta Insumo nos caminhos abaixo:`,
      ``,
      `CSV:          Insumo/${path.basename(resolvedCsv)}`,
      `Módulo:       ${moduleFinal}`,
      `Service:      cypress/support/services/${moduleFinal}Services.ts`,
      `Fixture:      cypress/fixtures/${moduleFinal}/`,
      `Logic:        cypress/support/logic/${moduleFinal}/${moduleFinal}${idFinal}Logic.ts`,
      `Teste:        cypress/e2e/api/${moduleFinal}/${moduleFinal}${idFinal}.cy.ts`,
      `Endpoint:     ${commonMethod} ${commonEndpoint || '/winthor/' + commonWtaService + '/v1/rota'}`,
      `Serviço WTA:  ${commonWtaService || 'winthor-integracao-xxx'}`,
      ``,
      `📋 Cenários identificados (${scenarios.length} total):`,
      ...scenarios.map((s) => `  - [${s.key}] ${s.name} | [${s.testData}] → [${s.expectedResult}] (${s.type})`),
      ``,
      `🤖 Modelo recomendado: ${recommendedModel}`
    ].join('\n');

    const implementationPlan = [
      `📐 PLANO DE IMPLEMENTAÇÃO — ${moduleFinal}${idFinal}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `1️⃣ Schema (Fixture): cypress/fixtures/${moduleFinal}/${moduleFinal}${idFinal}Schema.json`,
      `2️⃣ Service: cypress/support/services/${moduleFinal}Services.ts`,
      `3️⃣ Logic: cypress/support/logic/${moduleFinal}/${moduleFinal}${idFinal}Logic.ts`,
      `4️⃣ Teste: cypress/e2e/api/${moduleFinal}/${moduleFinal}${idFinal}.cy.ts`,
      `5️⃣ Validação de Cobertura: npx -y ts-node scripts/CheckCoverage.ts (gerando COVERAGE.md)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    ].join('\n');

    return {
      csvFile: path.basename(resolvedCsv),
      module: moduleFinal,
      endpoint: commonEndpoint,
      method: commonMethod,
      wtaService: commonWtaService,
      scenariosCount: scenarios.length,
      scenarios,
      intakeBlock,
      implementationPlan,
      recommendedModel,
      checklistWarnings: warnings,
      checklistBlockers: blockers
    };
  }

  /**
   * Dispara a execução da suíte de testes Cypress no projeto TAUT
   * com streaming de logs em tempo real, suporte a tags (@cypress/grep) e modos de API.
   */
  public async runTests(
    options: TautRunOptions,
    onChunk: (chunk: string) => void = () => {}
  ): Promise<TestExecutionResult> {
    const projectPath = this.resolveProjectPath(options.projectPath);

    if (!fs.existsSync(projectPath)) {
      throw new Error(`Diretório do projeto TAUT não encontrado: "${projectPath}"`);
    }

    const apiUrlMode = options.apiUrlMode || 'v39';

    if (options.openInteractive) {
      // Dispara Cypress aberto com interface visual (npm run cy:open)
      const commandArgs = `open --env API_URL_MODE=${apiUrlMode}`;
      return this.testRunnerService.executeRunner(
        {
          id: `taut-open-${Date.now()}`,
          name: `TAUT Cypress Interativo (${apiUrlMode})`,
          type: 'cypress',
          workingDir: projectPath,
          commandArgs,
          timeoutSeconds: 3600
        },
        onChunk
      );
    }

    // Modo Headless com argumentos de tags e spec
    const args: string[] = ['run', `--env API_URL_MODE=${apiUrlMode}`];

    if (options.spec && options.spec.trim()) {
      args.push(`--spec "${options.spec.trim()}"`);
    }

    if (options.tags && options.tags.trim()) {
      // @cypress/grep aceita expose grepTags
      args.push(`--expose grepTags="${options.tags.trim()}"`);
    }

    const commandArgs = args.join(' ');
    const runnerName = `TAUT Cypress [${options.tags || options.spec || 'Geral'}] (${apiUrlMode})`;

    return this.testRunnerService.executeRunner(
      {
        id: `taut-run-${Date.now()}`,
        name: runnerName,
        type: 'cypress',
        workingDir: projectPath,
        commandArgs,
        timeoutSeconds: 900
      },
      onChunk
    );
  }

  /**
   * Cancela a execução ativa do runner.
   */
  public abortExecution(): boolean {
    return this.testRunnerService.abortExecution();
  }
}
