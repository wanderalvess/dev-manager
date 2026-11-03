import { describe, expect, it } from 'vitest';
import type { AppSettings } from '../../../../shared/types';
import { APP_MODULE_IDS } from '../../../../shared/appModules';
import {
  MCP_EXAMPLES,
  ONBOARDING_STEPS,
  ONBOARDING_THEMES,
  bootItemState,
  buildEnvSections,
  countEnabled,
  sectionProgress,
  setModulesEnabled,
  summarizeChecklist,
  toggleDisabledModule
} from './onboardingContent';

describe('onboardingContent', () => {
  it('tem as etapas na ordem do onboarding, terminando em Pronto', () => {
    expect(ONBOARDING_STEPS.map((s) => s.id)).toEqual(['welcome', 'modules', 'theme', 'env', 'mcp', 'done']);
  });

  it('oferece um card por variante de tema', () => {
    expect(ONBOARDING_THEMES.map((t) => t.id)).toEqual(['paper', 'default', 'midnight', 'cyberpunk', 'nebula', 'nordic']);
  });

  it('cita só ferramentas MCP com prefixos existentes', () => {
    const prefixes = ['env_', 'karaf_', 'db_', 'git_', 'qa_', 'rag_'];
    for (const ex of MCP_EXAMPLES) {
      expect(ex.tools.length).toBeGreaterThan(0);
      ex.tools.forEach((t) => expect(prefixes.some((p) => t.startsWith(p))).toBe(true));
    }
  });

  describe('buildEnvSections', () => {
    it('sem configurações: tudo pendente', () => {
      const sections = buildEnvSections(null);
      expect(sections.map((s) => s.id)).toEqual(['dirs', 'karaf', 'winthor', 'azure', 'quality', 'services']);
      expect(sections.flatMap((s) => s.rows).every((r) => !r.done && r.value === '')).toBe(true);
    });

    it('mostra o que já está configurado', () => {
      const sections = buildEnvSections({
        projectsPath: 'C:\\repos',
        intellijPath: '',
        karafUser: 'karaf',
        hasKarafPass: true,
        karafSshPort: 8101,
        karafDebugPort: 5005,
        databaseConnections: [{}, {}]
      } as unknown as Partial<AppSettings>);
      const find = (label: string) => sections.flatMap((s) => s.rows).find((r) => r.label === label)!;
      expect(find('Diretório de Repositórios Git')).toMatchObject({ done: true, value: 'C:\\repos' });
      expect(find('IDE / Editor de Código').done).toBe(false);
      expect(find('Credenciais').value).toBe('karaf');
      expect(find('Portas SSH e Debug').value).toBe(':8101 · :5005');
      expect(find('Banco de Dados').value).toBe('2 conexão(ões)');
      expect(find('Diretório de Repositórios Git').key).toBe('projectsPath');
      expect(sectionProgress(sections[0])).toBe('1/3');
    });

    it('credencial sem senha não conta como configurada', () => {
      const rows = buildEnvSections({ karafUser: 'karaf' } as Partial<AppSettings>).flatMap((s) => s.rows);
      expect(rows.find((r) => r.label === 'Credenciais')!.done).toBe(false);
    });
  });

  describe('toggleDisabledModule', () => {
    it('desliga e religa', () => {
      expect(toggleDisabledModule([], 'env', 14)).toEqual(['env']);
      expect(toggleDisabledModule(['env', 'git'], 'env', 14)).toEqual(['git']);
    });

    it('não deixa desligar o último módulo ligado', () => {
      const allButOne = APP_MODULE_IDS.slice(1);
      expect(toggleDisabledModule([...allButOne], APP_MODULE_IDS[0], APP_MODULE_IDS.length)).toEqual(allButOne);
    });
  });

  describe('bootItemState', () => {
    it('marca os concluídos, o que está carregando e os da fila', () => {
      expect([0, 1, 2, 3].map((i) => bootItemState(i, 2))).toEqual(['done', 'done', 'loading', 'queued']);
    });
  });

  describe('módulos em grupo', () => {
    it('conta os ligados de um grupo', () => {
      expect(countEnabled(['env', 'git', 'docs'], ['git'])).toBe(2);
    });

    it('liga e desliga um grupo inteiro', () => {
      expect(setModulesEnabled(['git', 'env'], ['git', 'docs'], true, 19)).toEqual(['env']);
      expect(setModulesEnabled(['env'], ['git', 'docs'], false, 19)).toEqual(['env', 'git', 'docs']);
    });

    it('não desliga um grupo se nada mais ficaria ligado', () => {
      const ids = [...APP_MODULE_IDS];
      expect(setModulesEnabled([], ids, false, ids.length)).toEqual([]);
    });
  });

  it('resume o checklist com os itens que faltam', () => {
    expect(
      summarizeChecklist([
        { label: 'A', done: true },
        { label: 'B', done: false }
      ])
    ).toEqual({ done: 1, total: 2, missing: ['B'] });
  });
});
