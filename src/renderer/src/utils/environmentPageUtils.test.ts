import { describe, expect, it } from 'vitest';
import {
  resolveActiveProfile,
  getMissingRequiredPaths,
  filterLogLines,
  resolveStepRuntimeTarget
} from './environmentPageUtils';
import type { AppSettings, AutomationProfile, AutomationStep, PortStatus, ProcessStatus, ServiceStatus } from '../../../shared/types';

function makeProfile(id: string): AutomationProfile {
  return { id, name: `Perfil ${id}`, steps: [] };
}

function makeStep(overrides: Partial<AutomationStep>): AutomationStep {
  return { id: 's1', name: 'Passo', type: 'command', enabled: true, ...overrides };
}

describe('resolveActiveProfile', () => {
  it('retorna null quando não há perfis', () => {
    expect(resolveActiveProfile([], 'x')).toBeNull();
    expect(resolveActiveProfile(null, 'x')).toBeNull();
    expect(resolveActiveProfile(undefined, 'x')).toBeNull();
  });

  it('retorna o perfil cujo id bate com activeProfileId', () => {
    const profiles = [makeProfile('a'), makeProfile('b')];
    expect(resolveActiveProfile(profiles, 'b')?.id).toBe('b');
  });

  it('cai para o primeiro perfil quando activeProfileId não corresponde a nenhum (ex: perfil excluído)', () => {
    const profiles = [makeProfile('a'), makeProfile('b')];
    expect(resolveActiveProfile(profiles, 'inexistente')?.id).toBe('a');
  });
});

describe('getMissingRequiredPaths', () => {
  it('retorna array vazio quando settings é null', () => {
    expect(getMissingRequiredPaths(null)).toEqual([]);
  });

  it('aponta os dois diretórios quando nenhum está configurado', () => {
    const missing = getMissingRequiredPaths({} as AppSettings);
    expect(missing).toEqual(['Diretório de Repositórios Git', 'IDE / Editor de Código']);
  });

  it('não aponta um diretório já configurado', () => {
    const missing = getMissingRequiredPaths({ projectsPath: 'C:/repos' } as AppSettings);
    expect(missing).toEqual(['IDE / Editor de Código']);
  });

  it('retorna array vazio quando tudo está configurado', () => {
    const missing = getMissingRequiredPaths({ projectsPath: 'C:/repos', intellijPath: 'C:/idea.exe' } as AppSettings);
    expect(missing).toEqual([]);
  });
});

describe('filterLogLines', () => {
  const text = 'linha 1: iniciando\nlinha 2: ERRO ao conectar\nlinha 3: finalizado';

  it('retorna o texto original quando não há termo de busca', () => {
    expect(filterLogLines(text, '')).toBe(text);
    expect(filterLogLines(text, '   ')).toBe(text);
  });

  it('filtra só as linhas que contêm o termo, case-insensitive', () => {
    expect(filterLogLines(text, 'erro')).toBe('linha 2: ERRO ao conectar');
  });

  it('retorna string vazia quando nenhuma linha bate', () => {
    expect(filterLogLines(text, 'inexistente')).toBe('');
  });
});

describe('resolveStepRuntimeTarget', () => {
  const services: ServiceStatus[] = [{ name: 'MeuServico', displayName: 'Meu Serviço', state: 'RUNNING' }];
  const processes: ProcessStatus[] = [{ name: 'meuapp.exe', displayName: 'Meu App', isRunning: true, pid: '123' }];
  const ports: PortStatus[] = [{ port: 8181, label: 'Karaf', inUse: true }];

  it('resolve porta karaf efetiva: usa a porta do step quando definida', () => {
    const step = makeStep({ type: 'karaf', port: 8181 });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports, karafDebugPort: 5005 });
    expect(result.effectiveKarafPort).toBe(8181);
    expect(result.targetPort).toBe(8181);
    expect(result.isPortActive).toBe(true);
  });

  it('cai para karafDebugPort global e depois para 5005 quando o step não define porta', () => {
    const step = makeStep({ type: 'karaf', port: undefined });
    expect(resolveStepRuntimeTarget(step, { services, processes, ports, karafDebugPort: 9999 }).effectiveKarafPort).toBe(9999);
    expect(resolveStepRuntimeTarget(step, { services, processes, ports }).effectiveKarafPort).toBe(5005);
  });

  it('isPortActive é falso quando a porta do step não está em uso', () => {
    const step = makeStep({ type: 'command', port: 12345 });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports });
    expect(result.isPortActive).toBe(false);
  });

  it('resolve o serviço alvo de um step service-start por targetName, case-insensitive', () => {
    const step = makeStep({ type: 'service-start', targetName: 'meuservico' });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports });
    expect(result.serviceTargetName).toBe('meuservico');
    expect(result.service?.name).toBe('MeuServico');
  });

  it('cai para step.name quando targetName não está definido', () => {
    const step = makeStep({ type: 'service-stop', name: 'MEUSERVICO', targetName: undefined });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports });
    expect(result.serviceTargetName).toBe('MEUSERVICO');
    expect(result.service?.name).toBe('MeuServico');
  });

  it('resolve o processo alvo de um step kill-process por targetName, case-insensitive', () => {
    const step = makeStep({ type: 'kill-process', targetName: 'MEUAPP.EXE' });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports });
    expect(result.processTargetName).toBe('MEUAPP.EXE');
    expect(result.process?.pid).toBe('123');
  });

  it('não resolve serviço/processo para tipos de step não relacionados', () => {
    const step = makeStep({ type: 'command', targetName: 'MeuServico' });
    const result = resolveStepRuntimeTarget(step, { services, processes, ports });
    expect(result.serviceTargetName).toBeNull();
    expect(result.service).toBeUndefined();
    expect(result.processTargetName).toBeNull();
    expect(result.process).toBeUndefined();
  });
});
