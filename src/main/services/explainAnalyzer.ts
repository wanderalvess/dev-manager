export interface ExplainAnalysisFinding {
  type: 'full-table-scan' | 'disk-sort' | 'temp-table' | 'missing-index' | 'cartesian-join' | 'high-cost' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  detail: string;
  recommendation?: string;
}

export interface ExplainAnalysisResult {
  summary: string;
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  findings: ExplainAnalysisFinding[];
  suggestions: string[];
}

/**
 * Motor heurístico de análise de Explain Plan para Oracle, PostgreSQL e MySQL.
 * Avalia operadores caros, varreduras completas e gargalos de I/O em tempo de execução.
 */
export function analyzeExplainPlan(
  planLines: string[],
  dbType: 'oracle' | 'postgres' | 'mysql' | string,
  sql: string = ''
): ExplainAnalysisResult {
  const findings: ExplainAnalysisFinding[] = [];
  const suggestions: string[] = [];

  const rawText = planLines.join('\n');
  const normalizedType = (dbType || '').toLowerCase();

  // 1. Análise Heurística: ORACLE
  if (normalizedType === 'oracle') {
    // Detecta TABLE ACCESS FULL
    for (const line of planLines) {
      if (/TABLE ACCESS FULL/i.test(line)) {
        const match = line.match(/TABLE ACCESS FULL\s*\|\s*([a-zA-Z0-9_$#]+)/i) || line.match(/TABLE ACCESS FULL\s+([a-zA-Z0-9_$#]+)/i);
        const tableName = match ? match[1] : 'tabela alvo';
        findings.push({
          type: 'full-table-scan',
          severity: 'high',
          title: `Full Table Scan detectado em '${tableName}'`,
          detail: `A linha do plano indica leitura de todos os blocos de disco: "${line.trim()}".`,
          recommendation: `Considere criar um índice B-Tree nas colunas filtradas no WHERE ou JOIN envolvendo '${tableName}'.`
        });
      }

      if (/CARTESIAN/i.test(line) || /MERGE JOIN CARTESIAN/i.test(line)) {
        findings.push({
          type: 'cartesian-join',
          severity: 'critical',
          title: 'Produto Cartesiano (MERGE JOIN CARTESIAN)',
          detail: `Operação de junção cartesiana detectada: "${line.trim()}". Multiplica todas as linhas das tabelas sem predicado de união.`,
          recommendation: 'Verifique se há condições de JOIN ausentes na cláusula ON/WHERE entre as tabelas.'
        });
      }

      if (/TEMP TABLE TRANSFORMATION/i.test(line) || /SORT TEMP/i.test(line)) {
        findings.push({
          type: 'disk-sort',
          severity: 'medium',
          title: 'Uso de Tablespace Temporário (TEMP)',
          detail: 'A ordenação ou agregação excedeu o PGA_AGGREGATE_TARGET e precisou gravar em disco temporário.',
          recommendation: 'Avalie simplificar ORDER BY / DISTINCT ou indexar as colunas de ordenação para obter ordenação por índice.'
        });
      }
    }
  }

  // 2. Análise Heurística: POSTGRESQL
  else if (normalizedType === 'postgres' || normalizedType === 'postgresql') {
    for (const line of planLines) {
      // Seq Scan
      if (/Seq Scan on/i.test(line)) {
        const match = line.match(/Seq Scan on\s+([a-zA-Z0-9_".]+)/i);
        const tbl = match ? match[1] : 'tabela';
        findings.push({
          type: 'full-table-scan',
          severity: 'high',
          title: `Varredura Sequencial Completa (Seq Scan) em '${tbl}'`,
          detail: `O PostgreSQL percorreu linha por linha: "${line.trim()}".`,
          recommendation: `Crie um índice nas colunas filtradas ou avalie se o volume de dados da tabela '${tbl}' justifica o scan sequencial.`
        });
      }

      // External Merge Disk Sort
      if (/Sort Method:\s*external/i.test(line) || /Disk:/i.test(line)) {
        findings.push({
          type: 'disk-sort',
          severity: 'high',
          title: 'Ordenação em Disco (Spill para Disco)',
          detail: `A ordenação excedeu o 'work_mem' configurado: "${line.trim()}".`,
          recommendation: 'Aumente temporariamente o work_mem desta sessão ou crie um índice para evitar o sort em memória/disco.'
        });
      }

      // Nested Loop com custo alto
      if (/Nested Loop/i.test(line) && /cost=\d+\.\d+\.\.(\d+)/i.test(line)) {
        const costMatch = line.match(/cost=\d+\.\d+\.\.(\d+)/i);
        const costVal = costMatch ? parseInt(costMatch[1], 10) : 0;
        if (costVal > 100000) {
          findings.push({
            type: 'high-cost',
            severity: 'medium',
            title: 'Nested Loop com Custo Elevado',
            detail: `O custo estimado do Nested Loop é de ${costVal}: "${line.trim()}".`,
            recommendation: 'Assegure que as chaves estrangeiras da tabela interna estejam indexadas para viabilizar Index Scan.'
          });
        }
      }
    }
  }

  // 3. Análise Heurística: MYSQL
  else if (normalizedType === 'mysql') {
    for (const line of planLines) {
      if (/type:\s*ALL/i.test(line)) {
        const match = line.match(/table:\s*([a-zA-Z0-9_]+)/i);
        const tbl = match ? match[1] : 'tabela';
        findings.push({
          type: 'full-table-scan',
          severity: 'high',
          title: `Full Table Scan (type: ALL) na tabela '${tbl}'`,
          detail: `O MySQL está varrendo todas as linhas da tabela: "${line.trim()}".`,
          recommendation: `Adicione um índice composto ou simples cobrindo as colunas de busca em '${tbl}'.`
        });
      }

      if (/Using filesort/i.test(line)) {
        findings.push({
          type: 'disk-sort',
          severity: 'medium',
          title: 'Ordenação Extra (Using filesort)',
          detail: 'O MySQL precisa realizar uma passagem extra para ordenar as linhas recuperadas.',
          recommendation: 'Crie um índice composto cobrindo o predicado WHERE junto com as colunas de ORDER BY.'
        });
      }

      if (/Using temporary/i.test(line)) {
        findings.push({
          type: 'temp-table',
          severity: 'medium',
          title: 'Tabela Temporária Interna (Using temporary)',
          detail: 'Uma tabela temporária em memória/disco foi necessária para computar a agregação ou GROUP BY.',
          recommendation: 'Alinhe a ordem de colunas do GROUP BY com os índices existentes.'
        });
      }
    }
  }

  // 4. Verificações Gerais (Independente do banco)
  if (sql && /SELECT\s+\*\s+FROM/i.test(sql)) {
    findings.push({
      type: 'info',
      severity: 'low',
      title: 'Uso de SELECT *',
      detail: 'Selecionar todas as colunas impede a otimização de Index-Only Scan e consome largura de banda desnecessária.',
      recommendation: 'Substitua o caractere curinga (*) apenas pelas colunas estritamente necessárias para a sua rotina.'
    });
  }

  // Calcular Risco Geral
  let overallRisk: ExplainAnalysisResult['overallRisk'] = 'low';
  if (findings.some((f) => f.severity === 'critical')) {
    overallRisk = 'critical';
  } else if (findings.some((f) => f.severity === 'high')) {
    overallRisk = 'high';
  } else if (findings.some((f) => f.severity === 'medium')) {
    overallRisk = 'medium';
  }

  // Coletar Recomendações Únicas
  for (const f of findings) {
    if (f.recommendation && !suggestions.includes(f.recommendation)) {
      suggestions.push(f.recommendation);
    }
  }

  // Resumo
  let summary = '';
  if (findings.length === 0) {
    summary = `Plano de execução otimizado para ${dbType.toUpperCase()}. Nenhuma anomalia crítica ou varredura desnecessária detectada.`;
  } else {
    summary = `Detectado(s) ${findings.length} ponto(s) de atenção no plano de execução (${dbType.toUpperCase()}) com nível de risco ${overallRisk.toUpperCase()}.`;
  }

  return {
    summary,
    overallRisk,
    findings,
    suggestions
  };
}
