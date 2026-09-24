import { describe, it, expect } from 'vitest';
import {
  getKarafWtaBadgeInfo,
  shouldShowKarafWarningBanner,
  formatLaunchFeedbackDisplay
} from './routineLaunchUiUtils';

describe('routineLaunchUiUtils', () => {
  describe('getKarafWtaBadgeInfo', () => {
    it('retorna badge Online quando status está ativo', () => {
      const badge = getKarafWtaBadgeInfo(
        { online: true, wtaUrl: 'http://localhost:8889', message: 'Online' },
        false,
        true
      );
      expect(badge.label).toBe('Karaf (WTA): Online');
      expect(badge.isOffline).toBe(false);
      expect(badge.colorClass).toContain('emerald');
    });

    it('retorna badge Parado quando offline e winthorStart ativo com destaque', () => {
      const badge = getKarafWtaBadgeInfo(
        { online: false, wtaUrl: 'http://localhost:8889', message: 'Offline' },
        false,
        true
      );
      expect(badge.label).toBe('Karaf (WTA): Parado');
      expect(badge.isOffline).toBe(true);
      expect(badge.colorClass).toContain('rose');
    });

    it('retorna Checando quando isChecking é true e karafStatus é null', () => {
      const badge = getKarafWtaBadgeInfo(null, true, true);
      expect(badge.label).toContain('Checando');
      expect(badge.isOffline).toBe(false);
    });
  });

  describe('shouldShowKarafWarningBanner', () => {
    it('mostra banner apenas quando winthorStart é ativo e Karaf está offline', () => {
      expect(
        shouldShowKarafWarningBanner(
          { online: false, wtaUrl: 'http://localhost:8889', message: '' },
          true
        )
      ).toBe(true);

      expect(
        shouldShowKarafWarningBanner(
          { online: true, wtaUrl: 'http://localhost:8889', message: '' },
          true
        )
      ).toBe(false);

      expect(
        shouldShowKarafWarningBanner(
          { online: false, wtaUrl: 'http://localhost:8889', message: '' },
          false
        )
      ).toBe(false);

      expect(shouldShowKarafWarningBanner(null, true)).toBe(false);
    });
  });

  describe('formatLaunchFeedbackDisplay', () => {
    it('destaca quando karafOffline for true', () => {
      const formatted = formatLaunchFeedbackDisplay({
        id: '132',
        success: false,
        message: 'Karaf desligado',
        karafOffline: true
      });
      expect(formatted.isKarafOffline).toBe(true);
      expect(formatted.title).toContain('Apache Karaf não está em execução');
    });

    it('formata adequadamente para erro genérico', () => {
      const formatted = formatLaunchFeedbackDisplay({
        id: '132',
        success: false,
        message: 'Arquivo não encontrado'
      });
      expect(formatted.isKarafOffline).toBe(false);
      expect(formatted.title).toContain('Falha ao abrir rotina');
    });
  });
});
