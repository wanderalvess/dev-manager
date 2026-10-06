import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../../shared/types';
import {
  DEFAULT_AUTOMATION,
  DEFAULT_PORTS,
  createInitialSettings,
  normalizeLoadedSettings
} from './settingsDefaults';

describe('normalizeLoadedSettings', () => {
  it('preenche com os padrões o que veio vazio do disco', () => {
    const loaded = normalizeLoadedSettings({ appPath: 'C:/app', monitoredPorts: [], trackedServices: [] } as unknown as AppSettings);

    expect(loaded.appPath).toBe('C:/app');
    expect(loaded.monitoredPorts).toBe(DEFAULT_PORTS);
    expect(loaded.automationDefaults).toBe(DEFAULT_AUTOMATION);
    expect(loaded.webPort).toBe(8889);
    expect(loaded.winthorStartEnabled).toBe(true);
    expect(loaded.wtaLogin).toBe('PCADMIN');
    expect(loaded.ccwWinthorVersion).toBe('30');
  });

  it('respeita valores salvos, inclusive wtaLogin vazio e winthorStartEnabled desligado', () => {
    const loaded = normalizeLoadedSettings({
      wtaLogin: '',
      winthorStartEnabled: false,
      webPort: 9000,
      monitoredPorts: [{ port: 1, label: 'x', enabled: true }]
    } as unknown as AppSettings);

    expect(loaded.wtaLogin).toBe('');
    expect(loaded.winthorStartEnabled).toBe(false);
    expect(loaded.webPort).toBe(9000);
    expect(loaded.monitoredPorts).toEqual([{ port: 1, label: 'x', enabled: true }]);
  });

  it('já entrega o mapa do launcher normalizado, para não gerar "não salvo" falso na abertura', () => {
    const loaded = normalizeLoadedSettings({ routineLauncherMap: { exe: ' C:/a.exe ' } } as unknown as AppSettings);
    expect(loaded.routineLauncherMap).toEqual({ '.EXE': 'C:/a.exe' });
  });

  it('é idempotente: normalizar duas vezes dá o mesmo resultado (snapshot estável)', () => {
    const once = normalizeLoadedSettings({ routineLauncherMap: { bat: 'x' } } as unknown as AppSettings);
    expect(JSON.stringify(normalizeLoadedSettings(once))).toBe(JSON.stringify(once));
  });
});

describe('createInitialSettings', () => {
  it('devolve um objeto novo a cada chamada, com as listas padrão', () => {
    const a = createInitialSettings();
    const b = createInitialSettings();
    expect(a).not.toBe(b);
    expect(a.monitoredPorts).toBe(DEFAULT_PORTS);
    expect(a.karafEnvironment).toBe('local');
  });
});
