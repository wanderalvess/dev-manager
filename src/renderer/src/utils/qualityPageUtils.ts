export type ValidationItemStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'blocked';
export type ValidationCategory = 'routine' | 'service' | 'api' | 'e2e';

export interface QualityValidationItem {
  id: string;
  title: string;
  category: ValidationCategory;
  status: ValidationItemStatus;
  targetName: string;
  testedVersion?: string;
  testerName?: string;
  notes?: string;
  updatedAt?: string;
}

export interface QualityMetrics {
  total: number;
  passed: number;
  failed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  passRate: number;
  readinessScore: number;
}

// Cenários-modelo: todos nascem "pendente", pois nenhum foi verificado de fato.
export function getDefaultValidationItems(): QualityValidationItem[] {
  return [
    {
      id: 'val-1',
      title: 'Validar Conexão com Banco de Homologação',
      category: 'service',
      status: 'pending',
      targetName: 'Oracle / MySQL',
      notes: 'Conexão ativa e tabelas acessíveis.',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'val-2',
      title: 'Subida e Carregamento de Bundles Karaf',
      category: 'service',
      status: 'pending',
      targetName: 'Apache Karaf (SSH:8101)',
      notes: 'Verificar se todos os bundles essenciais atingiram o estado Active.',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'val-3',
      title: 'Fluxo Principal de Vendas e Faturamento',
      category: 'routine',
      status: 'pending',
      targetName: 'Rotina de Faturamento',
      notes: 'Validar emissão, cálculo de impostos e gravação dos dados.',
      updatedAt: new Date().toISOString()
    },
    {
      id: 'val-4',
      title: 'Consulta e Contratos de APIs REST',
      category: 'api',
      status: 'pending',
      targetName: 'WinThor Gateway API',
      notes: 'Verificar respostas HTTP 200 e payloads conforme documentação OpenAPI.',
      updatedAt: new Date().toISOString()
    }
  ];
}

export function calculateQualityMetrics(items: QualityValidationItem[]): QualityMetrics {
  const total = items.length;
  if (total === 0) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      inProgress: 0,
      pending: 0,
      blocked: 0,
      passRate: 0,
      readinessScore: 0
    };
  }

  let passed = 0;
  let failed = 0;
  let inProgress = 0;
  let pending = 0;
  let blocked = 0;

  for (const item of items) {
    switch (item.status) {
      case 'passed':
        passed++;
        break;
      case 'failed':
        failed++;
        break;
      case 'in_progress':
        inProgress++;
        break;
      case 'blocked':
        blocked++;
        break;
      case 'pending':
      default:
        pending++;
        break;
    }
  }

  const passRate = Math.round((passed / total) * 100);
  // Readiness score: aprovações pesam 100%, em progresso 40%, bloqueios e falhas reduzem a prontidão
  const weighted = passed * 100 + inProgress * 40 - failed * 50 - blocked * 30;
  const normalized = Math.max(0, Math.min(100, Math.round(weighted / total)));

  return {
    total,
    passed,
    failed,
    inProgress,
    pending,
    blocked,
    passRate,
    readinessScore: normalized
  };
}

export function filterValidationItems(
  items: QualityValidationItem[],
  searchTerm: string,
  statusFilter: string,
  categoryFilter: string
): QualityValidationItem[] {
  const search = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    if (categoryFilter !== 'all' && item.category !== categoryFilter) {
      return false;
    }
    if (!search) {
      return true;
    }
    return (
      item.title.toLowerCase().includes(search) ||
      item.targetName.toLowerCase().includes(search) ||
      (item.notes && item.notes.toLowerCase().includes(search)) ||
      (item.testerName && item.testerName.toLowerCase().includes(search))
    );
  });
}

export function generateQualityMarkdownReport(options: {
  releaseVersion: string;
  metrics: QualityMetrics;
  items: QualityValidationItem[];
}): string {
  const { releaseVersion, metrics, items } = options;
  const now = new Date().toLocaleString('pt-BR');

  const lines: string[] = [
    `# Relatório de Homologação e Qualidade (QA)`,
    `**Versão da Release:** ${releaseVersion || 'Não especificada'}  `,
    `**Data do Relatório:** ${now}  `,
    `**Status de Prontidão (Readiness Score):** ${metrics.readinessScore}%  `,
    `**Taxa de Aprovação:** ${metrics.passRate}% (${metrics.passed}/${metrics.total} aprovados)  `,
    '',
    `## Resumo Executivo`,
    `- Total de Itens: **${metrics.total}**`,
    `- Aprovados: **${metrics.passed}** ✅`,
    `- Em Andamento: **${metrics.inProgress}** ⏳`,
    `- Falhas/Bugs: **${metrics.failed}** ❌`,
    `- Bloqueados: **${metrics.blocked}** ⛔`,
    `- Pendentes: **${metrics.pending}** ⚪`,
    '',
    `## Matriz de Validação`,
    `| Item / Cenário | Alvo | Categoria | Status | Responsável | Notas |`,
    `| :--- | :--- | :--- | :--- | :--- | :--- |`
  ];

  const statusIcons: Record<ValidationItemStatus, string> = {
    passed: 'Aprovado ✅',
    failed: 'Falha ❌',
    in_progress: 'Em Teste ⏳',
    blocked: 'Bloqueado ⛔',
    pending: 'Pendente ⚪'
  };

  const categoryLabels: Record<ValidationCategory, string> = {
    routine: 'Rotina Delphi',
    service: 'Serviço/Karaf',
    api: 'API REST',
    e2e: 'Fluxo E2E'
  };

  for (const item of items) {
    const statusText = statusIcons[item.status] || item.status;
    const catText = categoryLabels[item.category] || item.category;
    const notesText = (item.notes || '-').replace(/\|/g, '-');
    const tester = item.testerName || '-';
    lines.push(`| ${item.title} | ${item.targetName} | ${catText} | ${statusText} | ${tester} | ${notesText} |`);
  }

  lines.push('');
  lines.push(`---`);
  lines.push(`*Gerado automaticamente pelo Hub Manager (Cockpit de Desenvolvimento & Qualidade)*`);

  return lines.join('\n');
}
