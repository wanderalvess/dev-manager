import { describe, expect, it } from 'vitest';
import { scriptGaps, scriptGapsMessage, scriptKnowsFlag, scriptRequirements } from './infrScriptSupport';
import { buildNewVersionEnvCommand, buildWtaSetupCommand } from './infrWinthorVersion';

// O wta_setup.sh de antes da imagem por versão (o da pasta do Nathan) e o de agora
const WTA_OLD = 'while [[ $# -gt 0 ]]; do\n  case "$1" in\n    --container) C="$2"; shift 2 ;;\n    --port)      P="$2"; shift 2 ;;\n    *) echo "[ERRO] Flag desconhecida: $1"; exit 1 ;;\n  esac\ndone\n';
const WTA_NEW = WTA_OLD.replace('    *)', '    --version)   V="$2"; shift 2 ;;\n    --distro|-d) D="$2"; shift 2 ;;\n    --ssh-port)  S="$2"; shift 2 ;;\n    --jmx-port)  J="$2"; shift 2 ;;\n    --jms-port)  M="$2"; shift 2 ;;\n    *)');

const wtaCommand = `cd "/mnt/c/Projetos/INFR-Docker/linux-winthor/scripts" && chmod +x ./*.sh && ${buildWtaSetupCommand({ container: 'wta-40', port: 8040, version: '40' })}`;

describe('scripts do INFR-Docker desatualizados', () => {
  it('lê do comando cada script e as opções que ele recebe', () => {
    expect(scriptRequirements(wtaCommand)).toEqual([
      { script: 'build_version.sh', flags: [] },
      { script: 'wta_setup.sh', flags: ['--container', '--port', '--version', '--distro', '--ssh-port', '--jmx-port', '--jms-port'] }
    ]);
  });

  it('acha a opção nos casos do case, inclusive com alternativa', () => {
    expect(scriptKnowsFlag(WTA_NEW, '--version')).toBe(true);
    expect(scriptKnowsFlag(WTA_NEW, '--distro')).toBe(true);
    expect(scriptKnowsFlag(WTA_OLD, '--version')).toBe(false);
    // Citada só numa mensagem não conta
    expect(scriptKnowsFlag('echo "use --version 40"', '--version')).toBe(false);
  });

  it('wta_setup.sh antigo: aponta as opções que faltam antes de abrir o terminal (erro do Nathan)', () => {
    const files: Record<string, string> = { 'linux-winthor/scripts/wta_setup.sh': WTA_OLD, 'linux-winthor/scripts/build_version.sh': '#!/bin/bash' };
    const gaps = scriptGaps(wtaCommand, (p) => files[p] ?? null);
    expect(gaps).toEqual([{ script: 'wta_setup.sh', path: 'linux-winthor/scripts/wta_setup.sh', missing: ['--version', '--distro', '--ssh-port', '--jmx-port', '--jms-port'] }]);
    const msg = scriptGapsMessage(gaps, 'C:\\Projetos\\INFR-Docker');
    expect(msg).toContain('não conhece --version');
    expect(msg).toContain('feature/imagem-por-versao');
    expect(scriptGaps(wtaCommand, (p) => ({ ...files, 'linux-winthor/scripts/wta_setup.sh': WTA_NEW })[p] ?? null)).toEqual([]);
  });

  it('Nova versão confere também o que o new_version_env.sh chama por dentro, e o script que falta', () => {
    const command = `cd linux-winthor/scripts && { set -o pipefail; echo hub; ${buildNewVersionEnvCommand({ version: '40', name: 'homolog', from: 'master' })}; } 2>&1 | tee /tmp/x.log`;
    const reqs = scriptRequirements(command).map((r) => r.script);
    expect(reqs).toEqual(expect.arrayContaining(['new_version_env.sh', 'wta_setup.sh', 'restore_rman.sh']));
    const gaps = scriptGaps(command, () => null);
    expect(gaps.find((g) => g.script === 'new_version_env.sh')).toMatchObject({ absent: true });
  });

  it('setup sem versão não exige nada além do que o script antigo já conhece', () => {
    const plain = `./wta_setup.sh --container linux-winthor --port 8080`;
    expect(scriptGaps(plain, () => WTA_OLD)).toEqual([]);
  });
});
