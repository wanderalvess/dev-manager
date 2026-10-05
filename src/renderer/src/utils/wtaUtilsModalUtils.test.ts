import { describe, expect, it } from 'vitest';
import {
  WTA_DEFAULT_CREDENTIALS_CLIPBOARD,
  WTA_ENV_SAMPLE,
  wtaUtilsModalCleanName,
  wtaUtilsModalPortalUrls,
  wtaUtilsModalTabClass
} from './wtaUtilsModalUtils';

describe('wtaUtilsModalUtils', () => {
  it('remove apenas a barra inicial do nome do container', () => {
    expect(wtaUtilsModalCleanName('/linux-winthor')).toBe('linux-winthor');
    expect(wtaUtilsModalCleanName('a/b')).toBe('a/b');
  });

  it('monta as URLs do portal e do instalador', () => {
    expect(wtaUtilsModalPortalUrls(9090)).toEqual({
      portalUrl: 'http://localhost:9090/wta/',
      installerUrl: 'http://localhost:9090/instalador'
    });
  });

  it('mantém credenciais separadas por TAB e modelo wta.env terminado em quebra de linha', () => {
    expect(WTA_DEFAULT_CREDENTIALS_CLIPBOARD).toBe('PCADMIN\t1');
    expect(WTA_ENV_SAMPLE.startsWith('DB_HOST=172.17.0.1\n')).toBe(true);
    expect(WTA_ENV_SAMPLE.endsWith('DB_PASSWORD=pcinfo\n')).toBe(true);
  });

  it('diferencia aba ativa e inativa', () => {
    expect(wtaUtilsModalTabClass(true)).toContain('border-cyan-500');
    expect(wtaUtilsModalTabClass(false)).toContain('border-transparent');
  });
});
