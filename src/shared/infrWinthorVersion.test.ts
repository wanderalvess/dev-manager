import { describe, expect, it } from 'vitest';
import {
  groupInfrEnvironments,
  buildNewVersionEnvCommand,
  buildWshSetupCommand,
  buildWtaSetupCommand,
  isAutoVersionedName,
  isAutoWtaContainerName,
  isValidWinthorVersion,
  winthorVersionDefaults,
  winthorVersionOracleDefaults,
  winthorVersionPorts
} from './infrWinthorVersion';

describe('versão do WinThor nos scripts do INFR-Docker', () => {
  it('aceita só dígitos e deriva portas que não colidem entre versões', () => {
    expect(isValidWinthorVersion('38')).toBe(true);
    expect(isValidWinthorVersion(' 40 ')).toBe(true);
    expect(isValidWinthorVersion('')).toBe(false);
    expect(isValidWinthorVersion('38; rm -rf /')).toBe(false);
    expect(isValidWinthorVersion(undefined)).toBe(false);
    expect(winthorVersionPorts('38')).toEqual({ oracle: 1538, web: 8038, ssh: 8138, jmx: 1038, jms: 61638, wsh: 9038 });
    expect(winthorVersionDefaults('39')).toEqual({ container: 'wta-39', port: 8039 });
    expect(winthorVersionOracleDefaults('40')).toEqual({ container: 'oracle-40', port: 1540 });
  });

  it('troca o container ao mudar a versão só enquanto o nome não foi personalizado', () => {
    expect(isAutoWtaContainerName('linux-winthor', 'linux-winthor')).toBe(true);
    expect(isAutoWtaContainerName('wta-39', 'linux-winthor')).toBe(true);
    expect(isAutoWtaContainerName('', 'linux-winthor')).toBe(true);
    expect(isAutoWtaContainerName('meu-wta', 'linux-winthor')).toBe(false);
    expect(isAutoVersionedName('oracle-38', 'oracle-winthor', 'oracle')).toBe(true);
    expect(isAutoVersionedName('oracle-cliente', 'oracle-winthor', 'oracle')).toBe(false);
  });

  it('sem versão mantém o comando de antes; com versão gera a imagem se faltar e usa portas próprias', () => {
    expect(buildWtaSetupCommand({ container: 'linux-winthor', port: 8080 })).toBe(
      './wta_setup.sh --container linux-winthor --port 8080'
    );
    expect(buildWtaSetupCommand({ container: 'wta-38', port: 8038, version: '38' })).toBe(
      '(docker image inspect linux-winthor:38-debian >/dev/null 2>&1 || ./build_version.sh 38 debian) && ' +
        './wta_setup.sh --container wta-38 --port 8038 --version 38 --distro debian --ssh-port 8138 --jmx-port 1038 --jms-port 61638'
    );
    expect(buildWtaSetupCommand({ container: 'x', port: 1, version: '38', distro: 'deb;ian' })).toContain('38-debian');
  });

  it('ambiente novo a partir de outro: valida nomes, versão e jar antes de montar o comando', () => {
    expect(buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'master' })).toBe(
      './new_version_env.sh --version 40 --name develop --from master'
    );
    expect(
      buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'master', wshJar: '/opt/wsh/40/winthor-integracao-core.jar' })
    ).toBe('./new_version_env.sh --version 40 --name develop --from master --wsh-jar /opt/wsh/40/winthor-integracao-core.jar');
    expect(buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'develop' })).toBeNull();
    expect(buildNewVersionEnvCommand({ version: '40', name: 'dev;rm', from: 'master' })).toBeNull();
    expect(buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'master', wshJar: '/opt/x.jar && rm -rf /' })).toBeNull();
    expect(buildNewVersionEnvCommand({ version: 'quarenta', name: 'develop', from: 'master' })).toBeNull();
  });

  it('leva as escolhas do usuário (banco, origem e portas) só quando diferem do padrão', () => {
    expect(
      buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'master', dbMode: 'existing', dbContainer: 'oracle-qa', wtaPort: 8086 })
    ).toBe('./new_version_env.sh --version 40 --name develop --from master --db-mode existing --db-container oracle-qa --wta-port 8086');
    expect(buildNewVersionEnvCommand({ version: '40', name: 'develop', from: 'master', dbSource: 'oracle-suport' })).toBe(
      './new_version_env.sh --version 40 --name develop --from master --db-source oracle-suport'
    );
    expect(buildNewVersionEnvCommand({ version: '40', name: 'd', from: 'm', dbContainer: 'x;y' })).toBeNull();
    expect(buildNewVersionEnvCommand({ version: '40', name: 'd', from: 'm', wshPort: 70000 })).toBeNull();
    expect(buildNewVersionEnvCommand({ version: '40', name: 'd', from: 'm', dbMode: 'drop' as any })).toBeNull();
  });

  it('agrupa os containers da distro em ambientes e lista os Oracles', () => {
    const { environments, oracles } = groupInfrEnvironments([
      'oracle-master|oracle-winthor:11.2.0.2-xe|exited|',
      'wta-master|linux-winthor:1.9.3-debian|exited|0.0.0.0:8086->8080/tcp',
      'wsh-master|wsh:1.38.14.51|running|0.0.0.0:8090->8090/tcp',
      'oracle-suport|oracle-winthor:11.2.0.2-xe|running|',
      'wta-suport|linux-winthor:1.9.3-debian|running|',
      'oracle-sozinho|oracle-winthor:11.2.0.2-xe|running|',
      'banco-cliente|oracle-winthor:11.2.0.2-xe|running|'
    ]);
    expect(environments.map((e) => [e.name, e.oracle?.name, e.wta?.name, e.wsh?.name])).toEqual([
      ['master', 'oracle-master', 'wta-master', 'wsh-master'],
      ['suport', 'oracle-suport', 'wta-suport', undefined]
    ]);
    expect(oracles.map((o) => o.name)).toEqual(['banco-cliente', 'oracle-master', 'oracle-sozinho', 'oracle-suport']);
  });

  it('WSH usa o .env da versão', () => {
    expect(buildWshSetupCommand()).toBe('./wsh_setup.sh');
    expect(buildWshSetupCommand('40')).toBe('./wsh_setup.sh .env.40');
    expect(buildWshSetupCommand('4x')).toBe('./wsh_setup.sh');
  });
});
