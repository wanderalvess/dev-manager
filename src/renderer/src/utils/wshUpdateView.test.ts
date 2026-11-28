import { describe, expect, it } from 'vitest';
import type { WshUpdatePrepareResult } from '../../../shared/wshUpdate';
import { applyConfirmation, canApplyUpdate, fileNameOf, formatMegabytes, formatPublishedDate, installerRows, missingFeatures, verdictView } from './wshUpdateView';

const prepared = (extra: Partial<WshUpdatePrepareResult> = {}): WshUpdatePrepareResult => ({ success: true, version: '1.39.22.31', verdict: 'newer', ...extra });
const check = (ok: boolean) => ({ service: 'winthor-integracao-config', version: '1.39.27.17', found: ok ? '1.39.27.17' : undefined, ok });

describe('wshUpdateView', () => {
  it('formata o tamanho em MB', () => {
    expect(formatMegabytes(74148792)).toBe('71 MB');
    expect(formatMegabytes(3 * 1048576)).toBe('3.0 MB');
    expect(formatMegabytes(undefined)).toBe('—');
  });

  it('traduz o veredito da comparação de versões', () => {
    expect(verdictView('newer').tone).toBe('success');
    expect(verdictView('older').tone).toBe('warning');
    expect(verdictView(undefined).label).toMatch(/desconhecida/);
  });

  it('lista só as features que faltam', () => {
    expect(missingFeatures([check(true), check(false)])).toHaveLength(1);
    expect(missingFeatures(undefined)).toEqual([]);
  });

  it('pede confirmação simples quando está tudo certo', () => {
    const c = applyConfirmation(prepared({ checks: [check(true)] }), 'wsh-local', '1.38.14.57');
    expect(c.tone).toBe('warning');
    expect(c.message).toContain('1.38.14.57 para 1.39.22.31');
  });

  it('avisa com tom de perigo quando falta feature no WTA', () => {
    const c = applyConfirmation(prepared({ checks: [check(false)] }), 'wsh-local', '1.38.14.57');
    expect(c.tone).toBe('danger');
    expect(c.message).toContain('winthor-integracao-config 1.39.27.17');
  });

  it('avisa quando não deu para conferir o WTA e quando a versão é mais antiga', () => {
    const c = applyConfirmation(prepared({ checksError: 'container parado', verdict: 'older' }), 'wsh-local', '1.40.0.1');
    expect(c.tone).toBe('danger');
    expect(c.message).toContain('container parado');
    expect(c.message).toContain('mais antiga');
  });

  it('diz na confirmação quando o jar veio de um arquivo do computador', () => {
    expect(applyConfirmation(prepared({ source: 'local' }), 'wsh-local', '1.38.14.57').message).toContain('arquivo escolhido no computador');
    expect(applyConfirmation(prepared({ source: 'download' }), 'wsh-local', '1.38.14.57').message).not.toContain('arquivo escolhido');
  });

  it('só libera atualizar com jar preparado e nada em andamento', () => {
    expect(canApplyUpdate(prepared(), false)).toBe(true);
    expect(canApplyUpdate(prepared(), true)).toBe(false);
    expect(canApplyUpdate({ success: false, error: 'x' }, false)).toBe(false);
    expect(canApplyUpdate(null, false)).toBe(false);
  });

  it('monta a lista de versões marcando a em uso e a mais recente', () => {
    const rows = installerRows(
      [
        { version: '1.39.22.31', sizeBytes: 100734968, updated: '2026-11-26T15:00:00' },
        { version: '1.38.14.57', sizeBytes: 96837968 },
        { version: '1.38.14.56' }
      ],
      '1.38.14.57'
    );
    expect(rows.map((r) => r.tag)).toEqual(['mais recente', 'em uso', undefined]);
    expect(rows[0].meta).toBe('26/11/2026 · 96 MB');
    expect(rows[2].meta).toBe('');
    expect(installerRows(undefined, undefined)).toEqual([]);
  });

  it('marca como em uso mesmo a versão mais nova da lista', () => {
    expect(installerRows([{ version: '1.39.22.31' }], '1.39.22.31')[0].tag).toBe('em uso');
  });

  it('formata a data e ignora data inválida', () => {
    expect(formatPublishedDate('2026-02-02T15:00:00')).toBe('02/02/2026');
    expect(formatPublishedDate('lixo')).toBe('');
    expect(formatPublishedDate(undefined)).toBe('');
  });

  it('pega o nome do arquivo de caminho do Windows ou do Linux', () => {
    const BS = String.fromCharCode(92);
    expect(fileNameOf(`C:${BS}Downloads${BS}winthor-integracao-core-1.39.22.31.exe`)).toBe('winthor-integracao-core-1.39.22.31.exe');
    expect(fileNameOf('D:/wsh/winthor-integracao-core.jar')).toBe('winthor-integracao-core.jar');
    expect(fileNameOf('sem-pasta.exe')).toBe('sem-pasta.exe');
  });
});
