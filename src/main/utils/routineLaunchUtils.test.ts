import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isConnectionRefusedError,
  buildWinthorStartPayload,
  shouldUseWinthorStart,
  formatRoutineLaunchErrorMessage,
  launchProcessSafely
} from './routineLaunchUtils';

const spawnMock = vi.fn((..._args: unknown[]) => ({ unref: vi.fn(), on: vi.fn() }));
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    spawn: (...args: unknown[]) => spawnMock(...args)
  };
});

describe('routineLaunchUtils', () => {
  describe('launchProcessSafely', () => {
    beforeEach(() => {
      spawnMock.mockClear();
    });

    it('dispara o processo desacoplado sem erro', () => {
      launchProcessSafely('C:\\Winthor\\Prod\\PCSIS132.EXE', []);
      expect(spawnMock).toHaveBeenCalled();
    });
  });
  describe('isConnectionRefusedError', () => {
    it('reconhece erros de conexão recusada e rede fechada', () => {
      expect(isConnectionRefusedError(new Error('connect ECONNREFUSED 127.0.0.1:8889'))).toBe(true);
      expect(isConnectionRefusedError(new Error('TypeError: fetch failed'))).toBe(true);
      expect(isConnectionRefusedError(new Error('Connection timeout reached'))).toBe(true);
      expect(isConnectionRefusedError('ECONNRESET by peer')).toBe(true);
    });

    it('retorna false para outros erros ou valores nulos', () => {
      expect(isConnectionRefusedError(null)).toBe(false);
      expect(isConnectionRefusedError(undefined)).toBe(false);
      expect(isConnectionRefusedError(new Error('Arquivo não encontrado'))).toBe(false);
      expect(isConnectionRefusedError(new Error('Invalid JSON input'))).toBe(false);
    });
  });

  describe('buildWinthorStartPayload', () => {
    it('valida payload completo vindo do WTA', () => {
      const res = buildWinthorStartPayload({
        m: '01',
        u: 'PCADMIN',
        p: '1',
        t: 'tok-123',
        s: 'sess-456'
      });

      expect(res.hasValidParams).toBe(true);
      expect(res.fromDefault).toBe(false);
      expect(res.payload.u).toBe('PCADMIN');
      expect(res.payload.t).toBe('tok-123');
    });

    it('rejeita payload do WTA com campos faltantes e usa fallback se válido', () => {
      const defaultJson = JSON.stringify({
        m: '01',
        u: 'PADRAO',
        p: '1',
        t: 'def-tok',
        s: 'def-sess'
      });

      const res = buildWinthorStartPayload(
        { m: '01', u: 'PCADMIN' }, // faltam p, t, s
        defaultJson
      );

      expect(res.hasValidParams).toBe(true);
      expect(res.fromDefault).toBe(true);
      expect(res.payload.u).toBe('PADRAO');
    });

    it('retorna hasValidParams = false quando ambos estão incompletos', () => {
      const res = buildWinthorStartPayload({ m: '', u: '' }, '{}');
      expect(res.hasValidParams).toBe(false);
      expect(res.fromDefault).toBe(false);
      expect(res.payload.u).toBe('');
    });
  });

  describe('shouldUseWinthorStart', () => {
    it('retorna true quando ativado e rotina possui código numérico', () => {
      expect(shouldUseWinthorStart(true, '132')).toBe(true);
      expect(shouldUseWinthorStart(undefined, '529')).toBe(true); // padrão true
    });

    it('retorna false quando desativado ou sem código', () => {
      expect(shouldUseWinthorStart(false, '132')).toBe(false);
      expect(shouldUseWinthorStart(true, null)).toBe(false);
      expect(shouldUseWinthorStart(true, '')).toBe(false);
    });
  });

  describe('formatRoutineLaunchErrorMessage', () => {
    it('formata mensagem explicativa para Karaf offline', () => {
      const res = formatRoutineLaunchErrorMessage(
        {
          success: false,
          karafOffline: true,
          error: 'KARAF_OFFLINE'
        },
        'PCSIS132.EXE',
        'http://localhost:8889'
      );

      expect(res.isKarafOffline).toBe(true);
      expect(res.title).toContain('Apache Karaf não está em execução');
      expect(res.message).toContain('http://localhost:8889');
      expect(res.message).toContain('Ambiente Dev');
    });

    it('formata mensagem para falha de autenticação', () => {
      const res = formatRoutineLaunchErrorMessage(
        {
          success: false,
          authFailed: true,
          error: 'AUTH_FAILED'
        },
        'PCSIS132.EXE'
      );

      expect(res.isKarafOffline).toBe(false);
      expect(res.title).toContain('Falha de autenticação');
      expect(res.message).toContain('Configurações');
    });
  });
});
