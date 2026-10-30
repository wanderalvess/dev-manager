import type { BackupHelp } from '../../../shared/types';

/** Utilitários do cliente PostgreSQL usados no backup e na restauração. */
const POSTGRES_TOOLS = new Set(['pg_dump', 'pg_dumpall', 'pg_restore', 'psql']);

export const POSTGRES_DETAIL_LABEL = 'Saída do PostgreSQL';

export function isPostgresTool(binary: string): boolean {
  const name = (binary.split(/[\\/]/).pop() || '').toLowerCase().replace(/\.exe$/, '');
  return POSTGRES_TOOLS.has(name);
}

export interface PostgresFailureContext {
  /** Executável chamado (nome ou caminho completo). */
  binary: string;
  operation: 'backup' | 'restore';
  host: string;
  port: number;
  user: string;
  database: string;
  /** Bancos do servidor (pg_database), quando deu para consultar. */
  databases?: string[];
}

export interface PostgresFailureExplanation {
  message: string;
  help?: BackupHelp;
}

/** Linhas de erro do pg_dump/psql/pg_restore (em inglês ou com o servidor em português), sem repetição. */
export function extractPostgresErrorLines(output: string): string[] {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /(error|erro|fatal|aborting|abortando|detail:|detalhe:|hint:|dica:|warning: errors ignored)/i.test(l));
  return Array.from(new Set(lines));
}

/** O banco da conexão não existe no servidor. */
export function isPostgresMissingDatabase(output: string): boolean {
  return /database "[^"]+" does not exist|banco de dados "[^"]+" não existe/i.test(output);
}

function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function toolName(binary: string): string {
  return (binary.split(/[\\/]/).pop() || binary).replace(/\.exe$/i, '');
}

/**
 * Traduz a saída de erro do pg_dump/psql/pg_restore em uma mensagem curta e nos passos para resolver.
 * Retorna null quando não reconhece o erro (quem chama mostra a saída crua).
 */
export function explainPostgresFailure(output: string, ctx: PostgresFailureContext): PostgresFailureExplanation | null {
  const errorLines = extractPostgresErrorLines(output);
  const detail = errorLines.length > 0 ? errorLines.join('\n') : undefined;
  const tool = toolName(ctx.binary);
  const target = `${ctx.host}:${ctx.port}`;
  const result = (e: PostgresFailureExplanation): PostgresFailureExplanation => ({
    ...e,
    help: e.help ? { ...e.help, detail, detailLabel: POSTGRES_DETAIL_LABEL } : undefined
  });

  const versionMismatch = output.match(/server version: ([\d.]+)[^\n]*?(?:pg_dump|pg_restore) version: ([\d.]+)/i);
  if (/aborting because of server version mismatch|abortando por causa de incompatibilidade de vers/i.test(output)) {
    const server = versionMismatch?.[1];
    const client = versionMismatch?.[2];
    return result({
      message: server && client
        ? `O ${tool} ${client} é mais antigo que o servidor PostgreSQL ${server}.`
        : `O ${tool} é mais antigo que a versão do servidor PostgreSQL.`,
      help: {
        steps: [
          'O pg_dump precisa ser da mesma versão do servidor ou mais nova (o contrário funciona; esta direção não).',
          `Instale o cliente PostgreSQL ${server ? server.split('.')[0] : 'da versão do servidor'} ou mais novo e aponte o caminho do ${tool}.exe nas configurações de backup.`
        ],
        snippets: [{ label: 'Ver a versão do servidor', code: 'SELECT version();' }]
      }
    });
  }

  if (/no pg_hba\.conf entry|nenhuma entrada no pg_hba\.conf/i.test(output)) {
    return result({
      message: `O servidor ${target} recusou a conexão de ${ctx.user}: não há regra no pg_hba.conf para esta máquina.`,
      help: {
        steps: [
          'No servidor, abra o pg_hba.conf (a pasta aparece com SHOW hba_file;) e acrescente uma linha liberando o usuário a partir do IP desta máquina.',
          'Recarregue a configuração; não precisa reiniciar o PostgreSQL.',
          'Se a mensagem fala em "no encryption", o servidor só aceita conexão com SSL: ligue o SSL na conexão.'
        ],
        snippets: [
          { label: 'Linha para o pg_hba.conf (troque o IP pelo desta máquina)', code: `host    all    ${ctx.user}    192.168.0.10/32    scram-sha-256` },
          { label: 'Recarregar a configuração (como superusuário)', code: 'SHOW hba_file;\nSELECT pg_reload_conf();' }
        ]
      }
    });
  }

  if (/password authentication failed|autenticação do tipo (senha|password) falhou|autenticação password falhou/i.test(output)) {
    return result({
      message: `Usuário ou senha incorretos para ${ctx.user} no PostgreSQL ${target}.`,
      help: {
        steps: [
          'Confira a senha salva na conexão: use Testar conexão na tela de Banco de Dados.',
          `O PostgreSQL responde assim também quando o usuário ${ctx.user} não existe: confira o nome na lista de usuários do servidor.`,
          'Se o usuário existe e a senha está certa, redefina-a no servidor e atualize a conexão.'
        ],
        snippets: [
          { label: 'Ver os usuários com login (como superusuário)', code: 'SELECT rolname FROM pg_roles WHERE rolcanlogin ORDER BY rolname;' },
          { label: 'Redefinir a senha (como superusuário)', code: `ALTER ROLE ${ident(ctx.user)} WITH PASSWORD 'nova_senha';` }
        ]
      }
    });
  }

  const roleMatch = output.match(/role "([^"]+)" does not exist|role "([^"]+)" não existe|função "([^"]+)" não existe/i);
  if (roleMatch) {
    const role = roleMatch[1] || roleMatch[2] || roleMatch[3];
    if (role === ctx.user || ctx.operation === 'backup') {
      return result({
        message: `O usuário ${role} não existe no servidor PostgreSQL ${target}.`,
        help: {
          steps: ['Confira o usuário da conexão ou crie o usuário no servidor.'],
          snippets: [
            { label: 'Criar o usuário (como superusuário)', code: `CREATE ROLE ${ident(role)} LOGIN PASSWORD 'senha';\nGRANT CONNECT ON DATABASE ${ident(ctx.database)} TO ${ident(role)};` }
          ]
        }
      });
    }
    return result({
      message: `O dump atribui objetos ao usuário ${role}, que não existe neste servidor.`,
      help: {
        steps: [
          `O backup veio de um servidor onde os objetos pertencem a ${role}. Crie esse usuário aqui (pode ser sem login) e restaure de novo.`,
          `Ou, no modo Personalizado, gere o backup com --no-owner --no-privileges: os objetos passam a pertencer a quem restaura (${ctx.user}).`
        ],
        snippets: [{ label: 'Criar o dono dos objetos (como superusuário)', code: `CREATE ROLE ${ident(role)};\nGRANT ${ident(role)} TO ${ident(ctx.user)};` }]
      }
    });
  }

  if (isPostgresMissingDatabase(output)) {
    const steps: string[] = [];
    if (ctx.databases && ctx.databases.length > 0) {
      steps.push(
        `O banco ${ctx.database} não existe em ${target}. Os bancos deste servidor: ${ctx.databases.join(', ')}.`,
        'Se o nome estava errado, corrija o banco na conexão.'
      );
    } else {
      steps.push(`O banco ${ctx.database} não existe em ${target}. Confira o nome na conexão (ele diferencia maiúsculas se foi criado entre aspas).`);
    }
    steps.push(
      ctx.operation === 'restore'
        ? `Para restaurar num banco novo, crie ${ctx.database} vazio e restaure de novo.`
        : `Se o banco deveria existir, crie-o (vazio) ou aponte a conexão para o banco certo.`
    );
    return result({
      message: `O banco ${ctx.database} não existe no servidor PostgreSQL ${target}.`,
      help: {
        steps,
        snippets: [
          { label: 'Criar o banco (como superusuário ou usuário com CREATEDB)', code: `CREATE DATABASE ${ident(ctx.database)} OWNER ${ident(ctx.user)};` },
          { label: 'Listar os bancos do servidor', code: 'SELECT datname FROM pg_database WHERE NOT datistemplate ORDER BY datname;' }
        ]
      }
    });
  }

  if (
    /could not connect|connection refused|connection timed out|could not translate host name|ECONNREFUSED|não foi possível conectar|não pôde conectar|conexão com (o )?servidor .* falhou|conexão recusada/i.test(
      output
    )
  ) {
    return result({
      message: `Nenhum servidor PostgreSQL respondeu em ${target}.`,
      help: {
        steps: [
          'Confira o host e a porta da conexão (o padrão é 5432).',
          'Veja se o PostgreSQL está rodando: o serviço postgresql-x64-NN no Windows ou o container no Docker.',
          'Se o servidor é de outra máquina, confira se ele escuta na rede (listen_addresses no postgresql.conf) e se o firewall libera a porta.'
        ],
        snippets: [{ label: 'Testar se o servidor responde (vem com o cliente PostgreSQL)', code: `pg_isready -h ${ctx.host} -p ${ctx.port}` }]
      }
    });
  }

  if (/could not open output file|não pôde abrir arquivo de saída/i.test(output)) {
    return result({
      message: `O ${tool} não conseguiu gravar o arquivo na pasta de destino.`,
      help: {
        steps: [
          'Confira se a pasta de destino existe e se o seu usuário do Windows pode gravar nela.',
          'Pastas sincronizadas (OneDrive) ou protegidas pelo antivírus podem bloquear a gravação: teste outra pasta, como C:\\Backups.'
        ]
      }
    });
  }

  if (/permission denied|permissão negada/i.test(output)) {
    if (ctx.operation === 'backup') {
      return result({
        message: `O usuário ${ctx.user} não pode ler todos os objetos do banco ${ctx.database}.`,
        help: {
          steps: [
            'O pg_dump precisa ler todas as tabelas e sequências do banco. Conceda leitura ao usuário da conexão, ou faça o backup com o dono do banco.',
            'Se houver outros schemas além do public, repita os GRANTs para cada um.'
          ],
          snippets: [
            {
              label: 'Conceder leitura (como dono do banco ou superusuário)',
              code: `GRANT USAGE ON SCHEMA public TO ${ident(ctx.user)};\nGRANT SELECT ON ALL TABLES IN SCHEMA public TO ${ident(ctx.user)};\nGRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ident(ctx.user)};`
            }
          ]
        }
      });
    }
    return result({
      message: `O usuário ${ctx.user} não tem permissão para recriar os objetos no banco ${ctx.database}.`,
      help: {
        steps: [
          'A restauração apaga e recria tabelas: o usuário da conexão precisa ser dono do banco (ou dos objetos).',
          'Torne-o dono do banco, ou restaure com o dono atual.'
        ],
        snippets: [{ label: 'Tornar dono do banco (como superusuário)', code: `ALTER DATABASE ${ident(ctx.database)} OWNER TO ${ident(ctx.user)};` }]
      }
    });
  }

  if (/input file appears to be a text format dump/i.test(output)) {
    return result({
      message: 'O arquivo é um dump em SQL puro, que o pg_restore não lê.',
      help: {
        steps: ['Renomeie o arquivo para .sql: o Dev Manager restaura .sql com o psql e .dump com o pg_restore.']
      }
    });
  }

  if (/does not appear to be a valid archive|could not read input file|unsupported version .* in file header/i.test(output)) {
    return result({
      message: 'O pg_restore não reconheceu o arquivo como um backup válido.',
      help: {
        steps: [
          'O arquivo pode estar incompleto ou corrompido (backup interrompido, cópia pela metade).',
          'Se ele foi gerado por um pg_dump mais novo que o pg_restore, use um pg_restore da mesma versão ou mais nova.',
          'Teste outro backup da lista, ou gere um novo.'
        ]
      }
    });
  }

  if (/already exists|já existe/i.test(output) && ctx.operation === 'restore') {
    return result({
      message: `Objetos do backup já existem no banco ${ctx.database}.`,
      help: {
        steps: [
          'Backups recentes do Dev Manager apagam os objetos antes de recriá-los; este arquivo não traz essa limpeza (backup antigo ou feito fora do app).',
          `Restaure num banco vazio: crie um banco novo ou apague e recrie ${ctx.database}.`
        ],
        snippets: [
          {
            label: 'Recriar o banco vazio (apaga todos os dados dele; como superusuário)',
            code: `DROP DATABASE ${ident(ctx.database)};\nCREATE DATABASE ${ident(ctx.database)} OWNER ${ident(ctx.user)};`
          }
        ]
      }
    });
  }

  return null;
}
