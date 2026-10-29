import { describe, expect, it } from 'vitest';
import {
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

  it('WSH usa o .env da versão', () => {
    expect(buildWshSetupCommand()).toBe('./wsh_setup.sh');
    expect(buildWshSetupCommand('40')).toBe('./wsh_setup.sh .env.40');
    expect(buildWshSetupCommand('4x')).toBe('./wsh_setup.sh');
  });
});
