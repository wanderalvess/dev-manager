import { spawn } from 'child_process';
import type { OracleDataPumpParams, OracleMaintenanceResult } from '../../../shared/types';
import { execFileAsync } from '../../utils/security';
import type { DockerContext } from './dockerContext';

/**
 * Executa a ferramenta de diagnóstico ou autocorreção do Oracle Database (db_health.sh).
 * Script localizado dentro do container em /home/oracle/tools/db_health.sh.
 */
export async function execOracleHealth(
  ctx: DockerContext,
  containerName: string,
  schema?: string,
  fix = false,
  user = 'sys',
  password?: string
): Promise<OracleMaintenanceResult> {
  if (!password) {
    return { success: false, output: '', error: 'Senha do usuário Oracle (sys/system) é obrigatória.' };
  }
  const cleanContainer = containerName.replace(/^\//, '');
  const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
  const cleanPass = password;
  const cleanSchema = schema ? schema.trim().toUpperCase().replace(/[^a-zA-Z0-9_]/g, '') : '';

  const args = ['exec', '-i', cleanContainer, '/home/oracle/tools/db_health.sh', cleanUser, cleanPass];
  if (cleanSchema) {
    args.push(cleanSchema);
  }
  if (fix) {
    args.push('--fix');
  }

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
    const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
      timeout: 180000, // 3 min (recompilação de objetos pode demorar)
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024
    });

    return {
      success: true,
      output: (stdout + '\n' + (stderr || '')).trim()
    };
  } catch (err: any) {
    return {
      success: false,
      output: (err?.stdout || '') + '\n' + (err?.stderr || ''),
      error: err?.message || String(err),
      exitCode: err?.code
    };
  }
}

/**
 * Abre um terminal interativo executando sqlplus_conn.sh dentro do container Oracle.
 */
export async function openOracleSqlPlus(
  ctx: DockerContext,
  containerName: string,
  user = 'sys',
  password?: string
): Promise<boolean> {
  const cleanContainer = containerName.replace(/^\//, '');
  if (!ctx.isValidContainerId(cleanContainer)) {
    throw new Error('Identificador de container inválido.');
  }
  if (!password) {
    throw new Error('Senha do usuário Oracle (sys/system) é obrigatória.');
  }
  const cleanUser = user.replace(/[^a-zA-Z0-9_]/g, '') || 'sys';
  const cleanPass = password.replace(/[^a-zA-Z0-9_!@#%^*+=.-]/g, '');

  const cmdInside = `/home/oracle/tools/sqlplus_conn.sh ${cleanUser} ${cleanPass}`;

  try {
    if (ctx.useWsl && ctx.targetWslDistro) {
      const distro = ctx.targetWslDistro;
      const wtArgs = [
        '-w', '0', 'nt',
        '--title', `Oracle SQL*Plus: ${cleanContainer} (${cleanUser})`,
        'wsl.exe', '-d', distro, '--',
        'docker', 'exec', '-it', cleanContainer, 'bash', '-c', cmdInside
      ];

      const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtChild.on('error', () => {
        const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${cleanContainer} bash -c "${cmdInside}"`;
        const child = spawn('cmd.exe', ['/c', 'start', `SQL*Plus ${cleanContainer}`, 'cmd.exe', '/k', fallbackCmd], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      });
      wtChild.unref();
      return true;
    }

    const engine = await ctx.getEngineCommand();
    const dockerArgs = `${engine} exec -it ${cleanContainer} bash -c "${cmdInside}"`;
    const child = spawn('cmd.exe', ['/c', 'start', `SQL*Plus ${cleanContainer}`, 'cmd.exe', '/k', dockerArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return true;
  } catch (err) {
    console.error(`[DockerService] Falha ao abrir SQL*Plus no container ${cleanContainer}:`, err);
    return false;
  }
}

/**
 * Abre um terminal interativo com o console de cliente Karaf (/opt/pcsist/apache-karaf/bin/client) no container WTA.
 */
export async function openWtaKarafClient(ctx: DockerContext, containerName: string): Promise<boolean> {
  const cleanContainer = containerName.replace(/^\//, '');
  if (!ctx.isValidContainerId(cleanContainer)) {
    throw new Error('Identificador de container inválido.');
  }

  const clientCmd =
    'if [ -x /opt/pcsist/apache-karaf/bin/client ]; then /opt/pcsist/apache-karaf/bin/client; elif [ -x /opt/karaf/bin/client ]; then /opt/karaf/bin/client; else bash; fi';

  try {
    if (ctx.useWsl && ctx.targetWslDistro) {
      const distro = ctx.targetWslDistro;
      const wtArgs = [
        '-w', '0', 'nt',
        '--title', `WTA Karaf Client: ${cleanContainer}`,
        'wsl.exe', '-d', distro, '--',
        'docker', 'exec', '-it', cleanContainer, 'bash', '-c', clientCmd
      ];

      const wtChild = spawn('wt.exe', wtArgs, { detached: true, stdio: 'ignore' });
      wtChild.on('error', () => {
        const fallbackCmd = `wsl -d ${distro} -- docker exec -it ${cleanContainer} bash -c "${clientCmd}"`;
        const child = spawn('cmd.exe', ['/c', 'start', `Karaf ${cleanContainer}`, 'cmd.exe', '/k', fallbackCmd], {
          detached: true,
          stdio: 'ignore'
        });
        child.unref();
      });
      wtChild.unref();
      return true;
    }

    const engine = await ctx.getEngineCommand();
    const dockerArgs = `${engine} exec -it ${cleanContainer} bash -c "${clientCmd}"`;
    const child = spawn('cmd.exe', ['/c', 'start', `Karaf ${cleanContainer}`, 'cmd.exe', '/k', dockerArgs], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false
    });
    child.unref();
    return true;
  } catch (err) {
    console.error(`[DockerService] Falha ao abrir Karaf client no container ${cleanContainer}:`, err);
    return false;
  }
}

/**
 * Executa import_dump.sh para importar e calibrar um dump no banco Oracle.
 */
export async function execOracleDataPump(
  ctx: DockerContext,
  params: OracleDataPumpParams
): Promise<OracleMaintenanceResult> {
  if (!params?.containerName || !params?.dumpfile || !params?.schemaOrig) {
    return {
      success: false,
      output: '',
      error: 'Parâmetros obrigatórios ausentes: containerName, dumpfile ou schemaOrig.'
    };
  }
  if (!params.password) {
    return { success: false, output: '', error: 'Senha do usuário Oracle (sys/system) é obrigatória.' };
  }

  const cleanContainer = params.containerName.replace(/^\//, '');
  const cleanUser = (params.user || 'system').replace(/[^a-zA-Z0-9_]/g, '');
  const cleanPass = params.password;
  const cleanDumpfile = params.dumpfile.replace(/[^a-zA-Z0-9_.-]/g, '');
  const cleanOrig = params.schemaOrig.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '');
  const cleanDest = params.schemaDest ? params.schemaDest.toUpperCase().replace(/[^a-zA-Z0-9_]/g, '') : '';
  const rawCodcli =
    params.codclipc !== undefined && params.codclipc !== null && String(params.codclipc).trim() !== ''
      ? String(params.codclipc).trim()
      : '-999';
  const cleanCodcli = /^-?[0-9]+$/.test(rawCodcli) ? rawCodcli : '-999';

  if (!cleanDumpfile || !cleanOrig || !cleanCodcli) {
    return {
      success: false,
      output: '',
      error: 'Parâmetros obrigatórios ausentes: dumpfile, schemaOrig ou codclipc.'
    };
  }

  const scriptCmd =
    'if [ -x /home/oracle/tools/import_dump.sh ]; then exec /home/oracle/tools/import_dump.sh "$@"; else exec import_dump.sh "$@"; fi';
  const scriptArgs = [cleanUser, cleanPass, cleanDumpfile, cleanOrig];
  if (cleanDest && cleanDest !== cleanOrig) {
    scriptArgs.push(cleanDest);
  }
  scriptArgs.push(cleanCodcli);

  const args = [
    'exec',
    '-i',
    cleanContainer,
    'bash',
    '-c',
    scriptCmd,
    'bash',
    ...scriptArgs
  ];

  try {
    const { binary, finalArgs } = await ctx.resolveCommandAndArgs(args[0], args.slice(1));
    const { stdout, stderr } = await execFileAsync(binary, finalArgs, {
      timeout: 600000, // 10 min para dumps grandes
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024
    });

    return {
      success: true,
      output: (stdout + '\n' + (stderr || '')).trim()
    };
  } catch (err: any) {
    return {
      success: false,
      output: (err?.stdout || '') + '\n' + (err?.stderr || ''),
      error: err?.message || String(err),
      exitCode: err?.code
    };
  }
}
