import { describe, expect, it } from 'vitest';
import { buildSectionSummaries } from './settingsOverviewSummary';

describe('buildSectionSummaries', () => {
  it('mostra só a última pasta dos caminhos', () => {
    const s = buildSectionSummaries({ projectsPath: 'C:\\Projetos\\', karafPath: '/opt/karaf/apache-karaf' }, 10);
    expect(s.dirs).toBe('Projetos');
    expect(s.karaf).toBe('apache-karaf');
  });

  it('resume o motor de IA em uso', () => {
    const s = buildSectionSummaries(
      { llmProviders: [{ id: 'a', name: 'Ollama local' } as never, { id: 'b', name: 'OpenAI' } as never], activeLlmProviderId: 'a' },
      10
    );
    expect(s.ai).toBe('em uso: Ollama local');
  });

  it('conta módulos ligados e itens das listas', () => {
    const s = buildSectionSummaries(
      { disabledModules: ['apm', 'docs'], trackedServices: [{} as never], trackedProcesses: [] },
      19
    );
    expect(s.appearance).toBe('17/19 módulos');
    expect(s.debug).toBe('1 serviço · 0 processos');
  });

  it('deixa vazio o que não está configurado', () => {
    const s = buildSectionSummaries({}, 5);
    expect(s.azure).toBe('');
    expect(s.debug).toBe('');
    expect(s.usage).toBe('contagem ligada');
  });
});
