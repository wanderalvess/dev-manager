import path from 'path';
import type { BackupHelp } from '../../../shared/types';
import { isMissingOracleHomeOutput } from './oracleToolEnv';

export interface OracleDirectoryInfo {
  name: string;
  path: string;
}

export interface OracleFailureContext {
  /** Executável chamado (nome ou caminho completo). */
  binary: string;
  operation: 'backup' | 'restore';
  user: string;
  /** Service name ou SID da conexão. */
  database: string;
  oracleMode?: 'serviceName' | 'sid';
  /** DIRECTORY usado no comando. */
  directory: string;
  /** Pasta de destino informada na tela (backup) ou caminho do dump (restauração). */
  localPath: string;
  /** DIRECTORY que o usuário enxerga (ALL_DIRECTORIES), quando deu para consultar. */
  directories?: OracleDirectoryInfo[];
}

export interface OracleFailureExplanation {
  message: string;
  help?: BackupHelp;
}

// ORA-39002 ("operação inválida") e ORA-39001 só embrulham o erro de verdade (versão do dump,
// formato exp...), então não indicam DIRECTORY sozinhos: vale o código específico que vem junto.
const DIRECTORY_ERRORS = ['ORA-39087', 'ORA-39070', 'ORA-29283'];

/** Linhas de erro do Oracle na saída do utilitário, sem repetição. */
export function extractOracleErrorLines(output: string): string[] {
  const lines = output
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^(ORA|UDE|LRM|EXP|IMP|KUP)-\d{5}/.test(l));
  return Array.from(new Set(lines));
}

/** A saída indica problema de DIRECTORY (inexistente, sem acesso ou pasta sem permissão no servidor). */
export function isOracleDirectoryError(output: string): boolean {
  return DIRECTORY_ERRORS.some((code) => output.includes(code));
}

/** Identificador entre aspas, em maiúsculas, como o Oracle guarda nomes sem aspas. */
function quoted(name: string): string {
  return `"${name.toUpperCase().replace(/"/g, '')}"`;
}

/** Pasta do servidor que o comando deveria usar: a pasta de destino no backup, a pasta do dump na restauração. */
function serverFolder(ctx: OracleFailureContext): string {
  return ctx.operation === 'restore' ? path.dirname(ctx.localPath) : ctx.localPath;
}

function createDirectorySnippet(ctx: OracleFailureContext): { label: string; code: string } {
  const folder = serverFolder(ctx).replace(/'/g, "''");
  return {
    label: 'Criar o DIRECTORY e dar acesso (conectado como SYS ou SYSTEM)',
    code: [
      `CREATE OR REPLACE DIRECTORY ${quoted(ctx.directory)} AS '${folder}';`,
      `GRANT READ, WRITE ON DIRECTORY ${quoted(ctx.directory)} TO ${quoted(ctx.user)};`
    ].join('\n')
  };
}

function explainDirectory(ctx: OracleFailureContext, code: string): OracleFailureExplanation {
  const wanted = ctx.directory.toUpperCase();
  const found = ctx.directories?.find((d) => d.name.toUpperCase() === wanted);
  const listDirectories = {
    label: `Ver os DIRECTORY que o usuário ${ctx.user} pode usar`,
    code: 'SELECT directory_name, directory_path FROM all_directories ORDER BY directory_name;'
  };

  // Existe e o usuário tem acesso: quem falhou foi o Oracle ao abrir a pasta no servidor.
  if (found) {
    const folderDiffers = path.normalize(found.path).toLowerCase() !== path.normalize(serverFolder(ctx)).toLowerCase();
    const steps = [
      `O DIRECTORY ${found.name} existe e aponta para ${found.path}, mas o Oracle não conseguiu abrir essa pasta no servidor.`,
      `Confira se a pasta ${found.path} existe na máquina do banco (o Oracle não cria a pasta).`,
      'Dê permissão de gravação nela à conta do serviço do Oracle. Pastas dentro do perfil do usuário (C:\\Users\\...) costumam bloquear o serviço: prefira algo como C:\\oracle\\backup.'
    ];
    if (folderDiffers && ctx.operation === 'backup') {
      steps.push(`Use ${found.path} como Pasta de destino, para o Dev Manager achar o dump depois.`);
    }
    const snippets = [
      {
        label: 'Dar permissão à conta do serviço (no servidor do banco, como administrador)',
        code: `icacls "${found.path}" /grant "NT SERVICE\\OracleService${ctx.database.toUpperCase()}":(OI)(CI)M`
      },
      { ...createDirectorySnippet(ctx), label: 'Ou apontar o DIRECTORY para outra pasta (como SYS ou SYSTEM)' }
    ];
    return {
      message: `O Oracle não conseguiu gravar na pasta do DIRECTORY ${found.name} (${found.path}).`,
      help: { code, steps, snippets }
    };
  }

  const steps: string[] = [];
  if (ctx.directories && ctx.directories.length > 0) {
    steps.push(
      `O DIRECTORY ${wanted} não existe ou o usuário ${ctx.user} não tem acesso a ele. Os que ele pode usar: ${ctx.directories
        .map((d) => `${d.name} (${d.path})`)
        .join(', ')}.`,
      `Para usar um deles, coloque o nome no campo DIRECTORY Oracle e a pasta dele em Pasta de destino.`
    );
  } else if (ctx.directories) {
    steps.push(`O usuário ${ctx.user} não tem acesso a nenhum DIRECTORY, então é preciso criar um.`);
  } else {
    steps.push(
      `O DIRECTORY ${wanted} não existe ou o usuário ${ctx.user} não tem acesso a ele.`,
      'O campo DIRECTORY Oracle recebe o nome de um objeto do banco que aponta para uma pasta do servidor, não o caminho da pasta.'
    );
  }
  steps.push(
    `Para criar ${wanted}, rode o SQL abaixo como SYS ou SYSTEM. A pasta precisa existir no servidor e a conta do serviço do Oracle precisa gravar nela.`
  );
  return {
    message: `O DIRECTORY Oracle ${wanted} não existe ou o usuário ${ctx.user} não tem acesso a ele.`,
    help: { code, steps, snippets: [createDirectorySnippet(ctx), listDirectories] }
  };
}

/**
 * Traduz a saída de erro do exp/expdp/impdp em uma mensagem curta e nos passos para resolver.
 * Retorna null quando não reconhece o erro (quem chama mostra a saída crua).
 */
export function explainOracleFailure(output: string, ctx: OracleFailureContext): OracleFailureExplanation | null {
  const errorLines = extractOracleErrorLines(output);
  const detail = errorLines.length > 0 ? errorLines.join('\n') : undefined;
  const has = (code: string) => output.includes(code);
  const tool = path.basename(ctx.binary);

  const result = (explanation: OracleFailureExplanation): OracleFailureExplanation => ({
    ...explanation,
    help: explanation.help ? { ...explanation.help, detail } : undefined
  });

  if (isMissingOracleHomeOutput(output)) {
    return result({
      message: `${tool} não encontrou os arquivos de mensagem do Oracle: o ORACLE_HOME não está definido ou aponta para outra instalação.`,
      help: {
        steps: [
          'Descubra a pasta da instalação Oracle: é a que contém bin\\ e rdbms\\mesg\\ (ex.: C:\\oracle\\product\\11.2.0\\client_1).',
          'Defina a variável de ambiente ORACLE_HOME com essa pasta e reinicie o Dev Manager.',
          `Ou informe nas configurações o caminho completo do ${tool} dentro dessa instalação: o Dev Manager deduz o ORACLE_HOME a partir dele.`
        ],
        snippets: [{ label: 'Definir ORACLE_HOME para o seu usuário (no Prompt de Comando)', code: 'setx ORACLE_HOME "C:\\oracle\\product\\11.2.0\\client_1"' }]
      }
    });
  }

  if (has('ORA-12541') || has('TNS:no listener')) {
    return result({
      message: 'Nenhum listener Oracle respondendo no host e porta da conexão (ORA-12541).',
      help: {
        code: 'ORA-12541',
        steps: [
          'Confira o host e a porta da conexão (o padrão é 1521).',
          'Veja se o serviço do listener está rodando (OracleOraDb...TNSListener em services.msc) e, se não estiver, inicie.'
        ],
        snippets: [{ label: 'Ver o estado do listener (na máquina do banco)', code: 'lsnrctl status' }]
      }
    });
  }

  if (has('ORA-12514') || has('ORA-12504') || has('ORA-12505')) {
    const code = has('ORA-12514') ? 'ORA-12514' : has('ORA-12505') ? 'ORA-12505' : 'ORA-12504';
    const kind = ctx.oracleMode === 'sid' ? 'SID' : 'service name';
    return result({
      message: `O listener não reconhece o ${kind} ${ctx.database} (${code}).`,
      help: {
        code,
        steps: [
          `Liste os serviços que o listener conhece e use um deles como ${kind} da conexão.`,
          ctx.oracleMode === 'sid'
            ? 'Se o nome que aparece é um service name, troque o modo da conexão para Service Name.'
            : 'Se o nome que você tem é o SID da instância, troque o modo da conexão para SID.'
        ],
        snippets: [
          { label: 'Ver os serviços registrados (na máquina do banco)', code: 'lsnrctl status' },
          { label: 'Ou, conectado ao banco por outra ferramenta', code: "SELECT instance_name FROM v$instance;\nSELECT value FROM v$parameter WHERE name = 'service_names';" }
        ]
      }
    });
  }

  if (has('ORA-28000')) {
    return result({
      message: `A conta ${ctx.user} está bloqueada (ORA-28000).`,
      help: {
        code: 'ORA-28000',
        steps: ['Desbloqueie a conta como SYS ou SYSTEM e tente de novo.'],
        snippets: [{ label: 'Desbloquear (como SYS ou SYSTEM)', code: `ALTER USER ${quoted(ctx.user)} ACCOUNT UNLOCK;` }]
      }
    });
  }

  if (has('ORA-28001')) {
    return result({
      message: `A senha de ${ctx.user} expirou (ORA-28001).`,
      help: {
        code: 'ORA-28001',
        steps: ['Defina uma senha nova como SYS ou SYSTEM e atualize a senha na conexão do Dev Manager.'],
        snippets: [{ label: 'Nova senha (como SYS ou SYSTEM)', code: `ALTER USER ${quoted(ctx.user)} IDENTIFIED BY "nova_senha";` }]
      }
    });
  }

  if (has('ORA-01017')) {
    return result({
      message: `Usuário ou senha incorretos para ${ctx.user} (ORA-01017).`,
      help: {
        code: 'ORA-01017',
        steps: [
          'Confira a senha salva na conexão: use Testar conexão na tela de Banco de Dados.',
          'A senha diferencia maiúsculas e minúsculas a partir do Oracle 11g.'
        ]
      }
    });
  }

  if (isOracleDirectoryError(output)) {
    const code = DIRECTORY_ERRORS.find(has)!;
    return result(explainDirectory(ctx, code));
  }

  if (has('ORA-31626') || has('ORA-31633') || has('ORA-01031') || has('ORA-01950')) {
    const code = ['ORA-01950', 'ORA-01031', 'ORA-31633', 'ORA-31626'].find(has)!;
    return result({
      message: `O usuário ${ctx.user} não tem os privilégios que o Data Pump exige (${code}).`,
      help: {
        code,
        steps: [
          `O ${tool} cria uma tabela de controle no schema de ${ctx.user}: ele precisa de CREATE TABLE e de cota no tablespace.`,
          'Conceda os privilégios como SYS ou SYSTEM e tente de novo.'
        ],
        snippets: [
          {
            label: 'Conceder (como SYS ou SYSTEM)',
            code: `GRANT CREATE SESSION, CREATE TABLE TO ${quoted(ctx.user)};\nALTER USER ${quoted(ctx.user)} QUOTA UNLIMITED ON USERS;`
          }
        ]
      }
    });
  }

  if (has('ORA-00439')) {
    return result({
      message: 'A edição deste Oracle não tem o recurso pedido (ORA-00439), provavelmente a compactação.',
      help: {
        code: 'ORA-00439',
        steps: ['Desmarque Compactar backup: compression=ALL só existe no Oracle Enterprise Edition com Advanced Compression.']
      }
    });
  }

  if (has('ORA-31640')) {
    const dumpName = path.basename(ctx.localPath);
    return result({
      message: `O dump ${dumpName} não foi encontrado na pasta do DIRECTORY ${ctx.directory.toUpperCase()} no servidor.`,
      help: {
        code: 'ORA-31640',
        steps: [
          `O impdp lê o arquivo do servidor, pela pasta do DIRECTORY ${ctx.directory.toUpperCase()}, não da sua máquina.`,
          `Copie ${dumpName} para essa pasta no servidor e tente de novo.`
        ],
        snippets: [
          {
            label: `Ver a pasta do DIRECTORY ${ctx.directory.toUpperCase()}`,
            code: `SELECT directory_path FROM all_directories WHERE directory_name = '${ctx.directory.toUpperCase().replace(/'/g, "''")}';`
          }
        ]
      }
    });
  }

  if (has('ORA-31684')) {
    return result({
      message: 'Objetos do dump já existem no schema de destino (ORA-31684).',
      help: {
        code: 'ORA-31684',
        steps: [
          'Por padrão o impdp pula o que já existe.',
          'Para substituir, use o modo Personalizado e acrescente table_exists_action=REPLACE (apaga e recria as tabelas) ou TRUNCATE (mantém a estrutura e troca os dados).'
        ]
      }
    });
  }

  return null;
}
