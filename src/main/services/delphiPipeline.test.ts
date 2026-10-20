import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDelphiPipeline, type DelphiPipelineDeps } from './delphiPipeline';
import type { DelphiBuildResult, DelphiPipelineRequest } from '../../shared/types';

let tmp: string;

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'delphi-pipeline-'));
});

afterEach(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

function makeBuild(overrides: Partial<DelphiBuildResult> = {}): DelphiBuildResult {
  return {
    success: true,
    exitCode: 0,
    cancelled: false,
    durationMs: 2500,
    errorCount: 0,
    warningCount: 1,
    diagnostics: [],
    ...overrides
  };
}

function makeRequest(overrides: Partial<DelphiPipelineRequest> = {}): DelphiPipelineRequest {
  return {
    dprojPath: 'C:\\Fontes\\Rotina\\Rotina.dproj',
    rsvarsPath: 'C:\\Embarcadero\\bin\\rsvars.bat',
    config: 'Debug',
    platform: 'Win32',
    killRunning: true,
    launch: true,
    ...overrides
  };
}

function makeDeps(build: DelphiBuildResult, overrides: Partial<DelphiPipelineDeps> = {}): DelphiPipelineDeps {
  return {
    build: vi.fn(async () => build),
    killImage: vi.fn(async () => true),
    launch: vi.fn(),
    log: vi.fn(),
    ...overrides
  };
}

describe('runDelphiPipeline', () => {
  it('encerra, compila, publica com backup .bak e abre o executável publicado', async () => {
    const built = path.join(tmp, 'Win32', 'Rotina.exe');
    const publishDir = path.join(tmp, 'Prod');
    fs.mkdirSync(path.dirname(built), { recursive: true });
    fs.mkdirSync(publishDir);
    fs.writeFileSync(built, 'novo');
    fs.writeFileSync(path.join(publishDir, 'Rotina.exe'), 'antigo');
    const deps = makeDeps(makeBuild({ outputExePath: built }));

    const result = await runDelphiPipeline(makeRequest({ publishDir }), deps);

    expect(result.success).toBe(true);
    expect(result.steps.map((s) => s.status)).toEqual(['success', 'success', 'success', 'success']);
    expect(deps.killImage).toHaveBeenCalledWith('Rotina.exe');
    expect(fs.readFileSync(path.join(publishDir, 'Rotina.exe'), 'utf8')).toBe('novo');
    expect(fs.readFileSync(path.join(publishDir, 'Rotina.exe.bak'), 'utf8')).toBe('antigo');
    expect(deps.launch).toHaveBeenCalledWith(path.join(publishDir, 'Rotina.exe'), publishDir);
  });

  it('publicar na própria pasta de saída não copia o arquivo sobre si mesmo', async () => {
    const built = path.join(tmp, 'Rotina.exe');
    fs.writeFileSync(built, 'conteudo');
    const deps = makeDeps(makeBuild({ outputExePath: built }));

    const result = await runDelphiPipeline(makeRequest({ publishDir: tmp, launch: false }), deps);

    expect(result.success).toBe(true);
    expect(fs.readFileSync(built, 'utf8')).toBe('conteudo');
    expect(fs.existsSync(`${built}.bak`)).toBe(false);
  });

  it('não publica nem abre nada quando o build falha', async () => {
    const deps = makeDeps(makeBuild({ success: false, exitCode: 1, errorCount: 3 }));

    const result = await runDelphiPipeline(makeRequest({ publishDir: tmp }), deps);

    expect(result.success).toBe(false);
    expect(result.steps.find((s) => s.id === 'build')?.status).toBe('failed');
    expect(result.steps.find((s) => s.id === 'publish')?.status).toBe('skipped');
    expect(deps.launch).not.toHaveBeenCalled();
  });

  it('pula etapas desativadas e abre o .exe da própria pasta de build', async () => {
    const built = path.join(tmp, 'Rotina.exe');
    fs.writeFileSync(built, 'x');
    const deps = makeDeps(makeBuild({ outputExePath: built }));

    const result = await runDelphiPipeline(makeRequest({ killRunning: false }), deps);

    expect(result.success).toBe(true);
    expect(deps.killImage).not.toHaveBeenCalled();
    expect(result.steps.find((s) => s.id === 'publish')?.status).toBe('skipped');
    expect(deps.launch).toHaveBeenCalledWith(built, tmp);
  });

  it('falha ao publicar quando o build não produziu o .exe esperado', async () => {
    const result = await runDelphiPipeline(makeRequest({ publishDir: tmp }), makeDeps(makeBuild()));

    expect(result.success).toBe(false);
    expect(result.steps.find((s) => s.id === 'publish')?.status).toBe('failed');
  });

  it('recusa pasta de publicação com caractere perigoso antes de qualquer etapa', async () => {
    const deps = makeDeps(makeBuild());

    const result = await runDelphiPipeline(makeRequest({ publishDir: 'C:\\x"&calc' }), deps);

    expect(result.success).toBe(false);
    expect(deps.build).not.toHaveBeenCalled();
  });

  it('não encerra o processo quando o pedido é inválido', async () => {
    const deps = makeDeps(makeBuild());

    const result = await runDelphiPipeline(makeRequest({ rsvarsPath: 'C:\\x\\malware.bat' }), deps);

    expect(result.success).toBe(false);
    expect(deps.killImage).not.toHaveBeenCalled();
    expect(deps.build).not.toHaveBeenCalled();
  });

  it('converte exceção do build em etapa falha', async () => {
    const deps = makeDeps(makeBuild(), { build: vi.fn(async () => { throw new Error('rsvars.bat não encontrado.'); }) });

    const result = await runDelphiPipeline(makeRequest(), deps);

    expect(result.success).toBe(false);
    expect(result.steps.find((s) => s.id === 'build')?.detail).toContain('rsvars.bat');
  });
});
