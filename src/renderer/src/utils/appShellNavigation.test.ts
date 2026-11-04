import { describe, it, expect } from 'vitest';
import {
  ALT_SHORTCUT_TABS,
  collectPageTourKeys,
  isQuickLauncherToggle,
  resolveAltShortcutTab,
  resolveEnterTab,
  resolveInitialTab
} from './appShellNavigation';

const ev = (key: string, mods: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) => ({
  key,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods
});

describe('appShellNavigation', () => {
  it('mapeia Alt+0..9 e Alt+Q para as abas', () => {
    expect(resolveAltShortcutTab(ev('1', { altKey: true }))).toBe('env');
    expect(resolveAltShortcutTab(ev('0', { altKey: true }))).toBe('apm');
    expect(resolveAltShortcutTab(ev('9', { altKey: true }))).toBe('http-client');
    expect(resolveAltShortcutTab(ev('h', { altKey: true }))).toBe('help');
    expect(resolveAltShortcutTab(ev('q', { altKey: true }))).toBe('quality');
    expect(resolveAltShortcutTab(ev('Q', { altKey: true }))).toBe('quality');
    expect(Object.keys(ALT_SHORTCUT_TABS)).toHaveLength(12);
  });

  it('ignora teclas sem Alt ou sem mapeamento', () => {
    expect(resolveAltShortcutTab(ev('1'))).toBeNull();
    expect(resolveAltShortcutTab(ev('x', { altKey: true }))).toBeNull();
    expect(resolveAltShortcutTab(ev('constructor', { altKey: true }))).toBeNull();
  });

  it('detecta Ctrl+K e Cmd+K', () => {
    expect(isQuickLauncherToggle(ev('k', { ctrlKey: true }))).toBe(true);
    expect(isQuickLauncherToggle(ev('K', { metaKey: true }))).toBe(true);
    expect(isQuickLauncherToggle(ev('k'))).toBe(false);
  });

  it('resolve a aba inicial', () => {
    expect(resolveInitialTab(true)).toBe('env');
    expect(resolveInitialTab(false)).toBe('help');
    expect(resolveInitialTab(true, 'git')).toBe('git');
    expect(resolveInitialTab(true, 'aba-que-nao-existe')).toBe('env');
    expect(resolveInitialTab(false, 'git')).toBe('help');
  });

  it('ao entrar, usa a aba das Configurações só se existir e estiver ligada', () => {
    expect(resolveEnterTab('database', [])).toBe('database');
    expect(resolveEnterTab('database', ['database'])).toBeNull();
    expect(resolveEnterTab('', [])).toBeNull();
    expect(resolveEnterTab(undefined, [])).toBeNull();
    expect(resolveEnterTab('xpto', [])).toBeNull();
    expect(resolveEnterTab('help', ['env'])).toBe('help');
  });

  it('filtra chaves de tours de página', () => {
    expect(collectPageTourKeys(['devManager:tour:db', null, 'outra', 'devManager:tour:git'])).toEqual([
      'devManager:tour:db',
      'devManager:tour:git'
    ]);
  });
});
