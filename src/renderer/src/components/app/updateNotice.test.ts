import { describe, expect, it } from 'vitest';
import { buildUpdateNotice, noticeKey } from './updateNotice';

describe('buildUpdateNotice', () => {
  it('não mostra aviso sem status, checando, sem novidade ou com erro', () => {
    expect(buildUpdateNotice(null, null)).toBeNull();
    expect(buildUpdateNotice({ status: 'checking' }, null)).toBeNull();
    expect(buildUpdateNotice({ status: 'not-available' }, null)).toBeNull();
    expect(buildUpdateNotice({ status: 'error', message: 'falhou' }, '1.42.0')).toBeNull();
  });

  it('versão disponível no app instalado oferece baixar', () => {
    const n = buildUpdateNotice({ status: 'available', version: '1.42.0' }, null)!;
    expect(n).toMatchObject({ phase: 'available', version: '1.42.0', primaryLabel: 'Baixar atualização' });
    expect(n.manual).toBeUndefined();
    expect(n.title).toBe('Nova versão 1.42.0 disponível');
  });

  it('build portátil abre o download no navegador', () => {
    const n = buildUpdateNotice({ status: 'available', version: '1.42.0', manual: true }, null)!;
    expect(n).toMatchObject({ manual: true, primaryLabel: 'Baixar nova versão' });
  });

  it('baixando usa a versão vista antes e limita a porcentagem', () => {
    expect(buildUpdateNotice({ status: 'downloading', percent: 41.6 }, '1.42.0')).toMatchObject({
      phase: 'downloading',
      version: '1.42.0',
      percent: 42
    });
    expect(buildUpdateNotice({ status: 'downloading', percent: 130 }, '1.42.0')!.percent).toBe(100);
    expect(buildUpdateNotice({ status: 'downloading', percent: 10 }, null)).toBeNull();
  });

  it('baixada: pronta para reiniciar, avisando que instala ao fechar', () => {
    const n = buildUpdateNotice({ status: 'downloaded', version: '1.42.0' }, '1.42.0')!;
    expect(n).toMatchObject({ phase: 'ready', primaryLabel: 'Reiniciar e atualizar' });
    expect(n.description).toContain('instalada sozinha quando você fechar o app');
  });

  it('a chave de "Depois" muda quando a fase avança', () => {
    const a = buildUpdateNotice({ status: 'available', version: '1.42.0' }, null)!;
    const r = buildUpdateNotice({ status: 'downloaded', version: '1.42.0' }, '1.42.0')!;
    expect(noticeKey(a)).not.toBe(noticeKey(r));
  });
});
