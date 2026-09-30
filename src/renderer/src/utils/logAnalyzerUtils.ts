import { LogExceptionMatch, LogAnalysisSummary, LogExceptionType } from '../../../shared/types';

/**
 * Catálogo de diagnósticos para erros conhecidos de banco Oracle (ORA-XXXXX).
 */
const ORA_CATALOG: Record<string, { title: string; explanation: string; suggestedCommands: string[] }> = {
  'ORA-00001': {
    title: 'Violação de Restrição Única (Unique Constraint)',
    explanation: 'Tentativa de inserir ou atualizar registro com valor duplicado em índice ou chave única.',
    suggestedCommands: [
      "SELECT * FROM USER_CONSTRAINTS WHERE CONSTRAINT_TYPE = 'U';",
      'Verificar parâmetros de chave primária/sequência no banco.'
    ]
  },
  'ORA-00942': {
    title: 'Tabela ou View Inexistente',
    explanation: 'O objeto SQL informado não existe no schema atual ou o usuário conectado não possui permissões (GRANTS) de SELECT/INSERT.',
    suggestedCommands: [
      "SELECT OWNER, TABLE_NAME FROM ALL_TABLES WHERE UPPER(TABLE_NAME) = '<TABELA>';",
      'GRANT SELECT, INSERT, UPDATE, DELETE ON <TABELA> TO <USUARIO>;'
    ]
  },
  'ORA-01017': {
    title: 'Usuário ou Senha Inválidos',
    explanation: 'Falha de autenticação ao conectar no banco Oracle. Usuário, senha ou papel (SYSDBA) incorretos.',
    suggestedCommands: [
      'Conferir credenciais no DB Studio ou em config.json.',
      'ALTER USER <USUARIO> IDENTIFIED BY <NOVA_SENHA>;'
    ]
  },
  'ORA-01400': {
    title: 'Inserção de NULL em Coluna Obrigatória',
    explanation: 'Uma coluna definida como NOT NULL recebeu valor nulo.',
    suggestedCommands: [
      "SELECT COLUMN_NAME, NULLABLE FROM USER_TAB_COLS WHERE UPPER(TABLE_NAME) = '<TABELA>';"
    ]
  },
  'ORA-01403': {
    title: 'Nenhum Dado Encontrado (NO_DATA_FOUND)',
    explanation: 'Uma instrução SELECT INTO ou rotina PL/SQL não encontrou nenhum registro correspondente.',
    suggestedCommands: [
      'Verificar filtros WHERE e parâmetros de busca informados pela rotina WinThor.'
    ]
  },
  'ORA-01422': {
    title: 'Mais Linhas do que o Esperado (TOO_MANY_ROWS)',
    explanation: 'Um SELECT INTO no Oracle retornou mais de um registro para uma variável escalar.',
    suggestedCommands: [
      'Revisar a consulta para usar ROWNUM = 1 ou garantir cláusula WHERE com chave exclusiva.'
    ]
  },
  'ORA-01653': {
    title: 'Tablespace Esgotada (Sem Espaço em Disco)',
    explanation: 'A tabela não pôde ser estendida porque a tablespace correspondente atingiu a capacidade máxima.',
    suggestedCommands: [
      'SELECT TABLESPACE_NAME, BYTES/1024/1024 AS MB_USADOS FROM DBA_FREE_SPACE;',
      'ALTER TABLESPACE <TABLESPACE> ADD DATAFILE SIZE 500M AUTOEXTEND ON;'
    ]
  },
  'ORA-02291': {
    title: 'Violação de Chave Estrangeira - Pai Não Encontrado',
    explanation: 'O valor da Foreign Key (FK) informado não existe na tabela referenciada.',
    suggestedCommands: [
      'Verificar existência do ID na tabela pai correspondente antes de vincular o registro.'
    ]
  },
  'ORA-02292': {
    title: 'Violação de Integridade - Registro Filho Encontrado',
    explanation: 'Tentativa de excluir registro que possui filhos dependentes em outra tabela vinculada por FK.',
    suggestedCommands: [
      'Excluir ou desvincular os registros filhos antes de remover o pai.'
    ]
  },
  'ORA-04031': {
    title: 'Memória Compartilhada Esgotada na SGA (Shared Pool)',
    explanation: 'O Oracle esgotou a memória da Shared Pool para armazenar planos de execução e código PL/SQL compilado.',
    suggestedCommands: [
      'ALTER SYSTEM FLUSH SHARED_POOL;',
      'Aumentar o parâmetro SHARED_POOL_SIZE no Oracle init/spfile.'
    ]
  },
  'ORA-12541': {
    title: 'TNS: Sem Listener Ativo',
    explanation: 'O serviço Oracle TNS Listener não está escutando na porta configurada (padrão 1521).',
    suggestedCommands: [
      'Verificar se o container Oracle está rodando no Docker.',
      'lsnrctl status'
    ]
  }
};

/**
 * Analisa uma única linha de log e retorna a exceção crítica identificada, ou null se não houver erro crítico.
 */
export function analyzeLogLine(line: string, lineIndex: number): LogExceptionMatch | null {
  if (!line || typeof line !== 'string') return null;

  // 1. Erro Oracle ORA-XXXXX
  const oraMatch = line.match(/\bORA-(\d{5})\b/i);
  if (oraMatch) {
    const code = `ORA-${oraMatch[1]}`;
    const catalogEntry = ORA_CATALOG[code];
    const title = catalogEntry ? `${catalogEntry.title} (${code})` : `Erro Oracle ${code}`;
    const explanation = catalogEntry
      ? catalogEntry.explanation
      : `O banco de dados Oracle retornou o código de erro ${code}. Inspecione a instrução SQL associada.`;
    const suggestedCommands = catalogEntry
      ? [...catalogEntry.suggestedCommands]
      : [`Consultar documentação do código ${code} no portal Oracle.`];

    return {
      id: `ora_${lineIndex}_${Date.now()}`,
      type: 'ORA',
      title,
      code,
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands,
      explanation
    };
  }

  // 2. OutOfMemoryError
  if (/OutOfMemoryError/i.test(line)) {
    const oomSubtype = /Metaspace/i.test(line) ? 'Metaspace' : /heap space/i.test(line) ? 'Java heap space' : 'JVM Memory';
    return {
      id: `oom_${lineIndex}_${Date.now()}`,
      type: 'OOM',
      title: `OutOfMemoryError: ${oomSubtype}`,
      code: 'OOM',
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands: [
        'jmx:run java.lang:type=Memory gc',
        'Aumentar parâmetros de memória -Xmx e -XX:MaxMetaspaceSize no setenv.bat do Karaf.',
        'Abrir o Monitor de Memória JVM no Cockpit para inspecionar curva de consumo.'
      ],
      explanation:
        'A JVM do Apache Karaf esgotou a memória disponível. Risco imediato de travamento ou instabilidade dos serviços OSGi.'
    };
  }

  // 3. NullPointerException (NPE)
  if (/NullPointerException/i.test(line)) {
    const classMatch = line.match(/at\s+([a-zA-Z0-9_$.]+)\.([a-zA-Z0-9_$]+)\(/);
    const context = classMatch ? ` em ${classMatch[1]}.${classMatch[2]}()` : '';

    return {
      id: `npe_${lineIndex}_${Date.now()}`,
      type: 'NPE',
      title: `NullPointerException${context}`,
      code: 'NPE',
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands: [
        'log:display -n 200',
        'Verificar se as referências @Reference OSGi ou beans Blueprint foram injetados corretamente.',
        'Inspecionar parâmetros de entrada e variáveis nulas no trecho apontado pelo stacktrace.'
      ],
      explanation:
        'Uma variável ou objeto com valor nulo foi acessado em tempo de execução sem validação prévia.'
    };
  }

  // 4. BundleException & Falhas de Resolução OSGi
  if (/BundleException|ResolutionException|Unsatisfied requirement|Unable to resolve/i.test(line)) {
    const bMatch = line.match(/(?:bundle\s+|in bundle\s+)([a-zA-Z0-9_.-]+)/i);
    const bundleName = bMatch ? bMatch[1] : undefined;

    return {
      id: `bundle_${lineIndex}_${Date.now()}`,
      type: 'BUNDLE',
      title: bundleName ? `Falha de Resolução OSGi: ${bundleName}` : 'BundleException / Conflito OSGi',
      code: 'BUNDLE_ERR',
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands: [
        'bundle:diag',
        bundleName ? `bundle:headers ${bundleName}` : 'bundle:list -s',
        'Verificar dependências ausentes na aba Gerenciador de Bundles do Cockpit.'
      ],
      explanation:
        'O container OSGi não conseguiu resolver fiações, pacotes importados ou dependências necessárias para ativar o bundle.'
    };
  }

  // 5. ClassNotFoundException / NoClassDefFoundError
  const classErrMatch = line.match(/(?:ClassNotFoundException|NoClassDefFoundError):\s*([a-zA-Z0-9_$.]+)/i);
  if (classErrMatch) {
    const missingClass = classErrMatch[1];
    return {
      id: `class_${lineIndex}_${Date.now()}`,
      type: 'CLASS_NOT_FOUND',
      title: `Classe Não Encontrada: ${missingClass.split('.').pop() || missingClass}`,
      code: 'CLASS_ERR',
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands: [
        `Verificar se o pacote que contém "${missingClass}" está declarado no Import-Package do pom.xml.`,
        'bundle:diag'
      ],
      explanation: `A classe "${missingClass}" não pôde ser carregada pelo ClassLoader do módulo OSGi atual.`
    };
  }

  // 6. Falhas de Conexão de Rede / Sockets
  if (/Communications link failure|Connection refused|ConnectException|SocketTimeoutException/i.test(line)) {
    return {
      id: `comm_${lineIndex}_${Date.now()}`,
      type: 'LINK_COMM',
      title: 'Falha de Conectividade de Rede (Socket / Link)',
      code: 'NET_ERR',
      message: line.trim(),
      lineIndex,
      rawLine: line,
      suggestedCommands: [
        'Checar se o banco de dados e serviços remotos estão ativos e na porta correta.',
        'Verificar firewall local e conectividade no painel de Portas Monitoradas.'
      ],
      explanation:
        'A aplicação tentou estabelecer conexão com um recurso de rede (banco de dados, API externa ou porta local), mas o endpoint estava inacessível.'
    };
  }

  return null;
}

/**
 * Analisa um bloco de texto ou array de linhas de log e retorna o resumo estruturado com todas as exceções identificadas.
 */
export function analyzeLogText(textOrLines: string | string[]): LogAnalysisSummary {
  const lines = Array.isArray(textOrLines) ? textOrLines : textOrLines.split(/\r?\n/);
  const matches: LogExceptionMatch[] = [];

  let oraErrorsCount = 0;
  let npeCount = 0;
  let bundleErrorsCount = 0;
  let oomCount = 0;
  let otherErrorsCount = 0;

  lines.forEach((line, idx) => {
    const match = analyzeLogLine(line, idx);
    if (match) {
      matches.push(match);
      if (match.type === 'ORA') oraErrorsCount++;
      else if (match.type === 'NPE') npeCount++;
      else if (match.type === 'BUNDLE') bundleErrorsCount++;
      else if (match.type === 'OOM') oomCount++;
      else otherErrorsCount++;
    }
  });

  return {
    totalErrors: matches.length,
    oraErrorsCount,
    npeCount,
    bundleErrorsCount,
    oomCount,
    otherErrorsCount,
    matches
  };
}

export { ORA_CATALOG };
