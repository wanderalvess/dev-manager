import { describe, expect, it } from 'vitest';
import { computeWinthorGuide, friendlyEnvListError, nodeStatusLabel, type GuideInput } from './winthorGuide';

type Node = { exists: boolean; running: boolean };
const node = (exists: boolean, running: boolean): GuideInput['topology']['oracle'] => ({ container: null, name: 'x', running, port: '', exists });
const input = (o: Node, w: Node, s: Node, extra: Partial<GuideInput> = {}, flags: { complete?: boolean; orphan?: boolean } = {}): GuideInput => ({
  daemonRunning: true,
  sequenceRunning: false,
  topology: {
    oracle: node(o.exists, o.running),
    wta: node(w.exists, w.running),
    wsh: node(s.exists, s.running),
    isStackComplete: flags.complete ?? (o.running && w.running && (!s.exists || s.running)),
    hasMissingDependency: flags.orphan ?? ((w.running || s.running) && !o.running)
  },
  ...extra
});
const up = { exists: true, running: true };
const down = { exists: true, running: false };
const none = { exists: false, running: false };

describe('computeWinthorGuide', () => {
  it('manda ligar o Docker antes de qualquer outra coisa', () => {
    const g = computeWinthorGuide(input(up, up, up, { daemonRunning: false }));
    expect(g.status).toBe('docker-off');
    expect(g.primary?.id).toBe('start-docker');
    expect(g.tone).toBe('danger');
  });

  it('com o Runtime errado, manda trocar para a distro do WinThor em vez de dizer que nada existe', () => {
    const windows = computeWinthorGuide(input(none, none, none, { selectedDistro: '', winthorDistro: 'ubuntu-winthor' }));
    expect(windows.status).toBe('wrong-runtime');
    expect(windows.title).toMatch(/Docker do Windows/);
    expect(windows.primary).toEqual({ id: 'use-distro', label: 'Usar ubuntu-winthor', value: 'ubuntu-winthor' });
    expect(computeWinthorGuide(input(none, none, none, { selectedDistro: 'Debian', winthorDistro: 'ubuntu-winthor' })).title).toMatch(/distro Debian/);
    // Já na distro do WinThor, sem containers: aí sim é criar
    expect(computeWinthorGuide(input(none, none, none, { selectedDistro: 'ubuntu-winthor', winthorDistro: 'ubuntu-winthor' })).status).toBe('not-created');
    // Se o Runtime atual já tem containers da pilha, não mexe
    expect(computeWinthorGuide(input(down, down, none, { selectedDistro: '', winthorDistro: 'ubuntu-winthor' })).status).toBe('stopped');
  });

  it('sem nenhum container, manda criar o ambiente', () => {
    const g = computeWinthorGuide(input(none, none, none));
    expect(g.status).toBe('not-created');
    expect(g.primary).toEqual({ id: 'create', label: 'Criar o ambiente' });
    expect(g.steps.map((s) => s.state)).toEqual(['done', 'current', 'todo', 'todo']);
  });

  it('com parte criada, diz o que falta', () => {
    const g = computeWinthorGuide(input(up, none, none));
    expect(g.status).toBe('incomplete');
    expect(g.title).toBe('Falta criar o WTA');
    expect(computeWinthorGuide(input(none, none, down)).title).toBe('Falta criar o banco Oracle e o WTA');
  });

  it('tudo criado e parado: manda subir e explica a ordem', () => {
    const g = computeWinthorGuide(input(down, down, down));
    expect(g.status).toBe('stopped');
    expect(g.primary?.id).toBe('start-stack');
    expect(g.detail).toMatch(/banco.*WTA.*WSH/);
    expect(g.steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo']);
  });

  it('parte no ar: lista o que está parado', () => {
    const g = computeWinthorGuide(input(up, down, down));
    expect(g.status).toBe('partial');
    expect(g.title).toBe('Parte do ambiente está parada: o WTA e o WSH');
    expect(g.tone).toBe('warning');
  });

  it('banco parado com serviços ligados é perigo', () => {
    const g = computeWinthorGuide(input(down, up, up));
    expect(g.tone).toBe('danger');
    expect(g.primary?.id).toBe('start-stack');
  });

  it('enquanto sobe, não oferece ação', () => {
    const g = computeWinthorGuide(input(down, down, down, { sequenceRunning: true }));
    expect(g.status).toBe('starting');
    expect(g.primary).toBeUndefined();
  });

  it('no ar com WSH: abre o portal e oferece atualizar o WSH', () => {
    const g = computeWinthorGuide(input(up, up, up));
    expect(g.status).toBe('running');
    expect(g.primary?.id).toBe('open-portal');
    expect(g.secondary).toEqual([{ id: 'update-wsh', label: 'Atualizar o WSH' }]);
    expect(g.steps.every((s) => s.state === 'done')).toBe(true);
  });

  it('no ar sem WSH: oferece criar o WSH em vez de atualizar', () => {
    const g = computeWinthorGuide(input(up, up, none));
    expect(g.status).toBe('running');
    expect(g.secondary).toEqual([{ id: 'create', label: 'Criar o WSH' }]);
    expect(g.steps[3].state).toBe('current');
  });

  it('não decide nada contra o Docker enquanto não sabe se ele está ligado', () => {
    expect(computeWinthorGuide(input(up, up, up, { daemonRunning: null })).status).toBe('running');
  });
});

describe('nodeStatusLabel', () => {
  it('separa "não criado", "parado" e "no ar"', () => {
    expect(nodeStatusLabel({ exists: false, running: false })).toEqual({ label: 'NÃO CRIADO', tone: 'absent' });
    expect(nodeStatusLabel({ exists: true, running: false })).toEqual({ label: 'PARADO', tone: 'stopped' });
    expect(nodeStatusLabel({ exists: true, running: true })).toEqual({ label: 'NO AR', tone: 'running' });
  });
});

describe('friendlyEnvListError', () => {
  it('troca o erro cru do wsl.exe por um motivo e um passo', () => {
    const msg = friendlyEnvListError("Command failed: wsl.exe -d ubuntu -- bash -c docker ps -a --format '{{.Names}}'");
    expect(msg).toMatch(/Docker desta distro/);
    expect(msg).not.toMatch(/wsl\.exe/);
  });
  it('mantém mensagens que já são claras e cobre o vazio', () => {
    expect(friendlyEnvListError('Distro WSL inválida.')).toBe('Distro WSL inválida.');
    expect(friendlyEnvListError(undefined)).toMatch(/Não consegui ler/);
  });
});
