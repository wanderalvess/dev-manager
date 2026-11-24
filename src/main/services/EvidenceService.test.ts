import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '../../shared/types';
import { EvidenceService } from './EvidenceService';

const PNG = Buffer.from('89504e470d0a1a0a', 'hex');

describe('EvidenceService', () => {
  let root: string;
  let fetchImpl: ReturnType<typeof vi.fn>;
  let settings: Partial<AppSettings>;

  const make = () =>
    new EvidenceService({
      rootDir: root,
      getSettings: () => settings as AppSettings,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      renderPdf: async () => Buffer.from('%PDF'),
      now: () => new Date(2026, 0, 2, 3, 4, 5)
    });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'evid-'));
    fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }));
    settings = { jiraSources: [{ id: 'j', name: 'Jira', baseUrl: 'https://jira.example.com/', authToken: 'S3CRET', enabled: true }] } as Partial<AppSettings>;
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('registra, edita e remove provas em texto do passo e gera slides em arquivo próprio', async () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-2', kind: 'dev' });
    const stepId = svc.addStep(s.id, null, 'Pedido').steps[0].id;

    const added = svc.addBlock(s.id, stepId, { kind: 'sql', phase: 'before', request: 'select 1 from dual', response: 'X\n-\n1' });
    const block = added.steps[0].blocks![0];
    expect(block).toMatchObject({ kind: 'sql', phase: 'before' });

    const edited = svc.updateBlock(s.id, stepId, block.id, { phase: 'after', meta: '1 linha(s)' });
    expect(edited.steps[0].blocks![0]).toMatchObject({ phase: 'after', meta: '1 linha(s)' });
    expect(() => svc.addBlock(s.id, stepId, { kind: 'xml' as never, phase: 'single' })).toThrow('Tipo de prova inválido.');
    expect(() => svc.addBlock(s.id, 'nao-existe', { kind: 'text', phase: 'single', response: 'x' })).toThrow('Passo não encontrado.');

    const files = await svc.generateReport(s.id, true, 'slides');
    expect(path.basename(files.html)).toBe('apresentacao.html');
    expect(path.basename(files.pdf!)).toBe('apresentacao.pdf');
    expect(fs.readFileSync(files.html, 'utf-8')).toContain('select 1 from dual');

    expect(svc.deleteBlock(s.id, stepId, block.id).steps[0].blocks).toEqual([]);
  });

  it('avalia as regras da prova e reprova/aprova o passo sozinho', () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-4', kind: 'qa' });
    const stepId = svc.addStep(s.id, null, 'API').steps[0].id;

    // "Antes" reprovado não pesa no passo: é o estado antigo que a correção deve mudar.
    const before = svc.addBlock(s.id, stepId, { kind: 'api', phase: 'before', meta: '500 Erro · 10 ms', response: 'x', checks: 'status 200' });
    expect(before.steps[0].blocks![0].verdict?.passed).toBe(false);
    expect(before.steps[0].result).toBe('pending');

    const failed = svc.addBlock(s.id, stepId, { kind: 'api', phase: 'after', environment: 'HML', meta: '404 Not Found · 9 ms', response: '{}', checks: 'status 200' });
    expect(failed.steps[0].result).toBe('failed');
    expect(failed.steps[0].blocks![1]).toMatchObject({ environment: 'HML', verdict: { passed: false } });

    const afterId = failed.steps[0].blocks![1].id;
    const fixed = svc.updateBlock(s.id, stepId, afterId, { meta: '200 OK · 9 ms' });
    expect(fixed.steps[0].blocks![1].verdict?.passed).toBe(true);
    expect(fixed.steps[0].result).toBe('passed');
  });

  it('guarda ações e marcador do passo e cria sessão de reexecução vazia', () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-3', title: 'Fluxo', kind: 'qa', environment: 'hml' });
    const withStep = svc.addStep(s.id, PNG, 'Clicar em Salvar', {
      actions: [{ id: 'a1', type: 'click', x: 100, y: 200, button: 'left' }],
      marker: { x: 0.1, y: 2 },
      expected: 'abre a tela'
    });
    const step = withStep.steps[0];
    expect(step.actions).toHaveLength(1);
    expect(step.marker).toBeUndefined();
    expect(step.expected).toBe('abre a tela');

    const edited = svc.setActions(s.id, step.id, [{ type: 'type', text: 'oi' }, { type: 'bogus' }]);
    expect(edited.steps[0].actions).toMatchObject([{ type: 'type', text: 'oi' }]);

    const replay = svc.createReplaySession(s.id);
    expect(replay).toMatchObject({ title: 'Fluxo (reexecução)', task: 'WT-3', environment: 'hml', steps: [] });
  });

  it('grava sessão, passos e vídeo em disco', () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'qa' });
    expect(s.id).toBe('WT-1__20260102-030405');
    const withStep = svc.addStep(s.id, PNG, 'Abrir tela');
    const step = withStep.steps[0];
    expect(fs.existsSync(path.join(svc.getSessionDir(s.id), step.screenshot!))).toBe(true);

    const updated = svc.updateStep(s.id, step.id, { result: 'failed', actual: 'erro' });
    expect(updated.steps[0].result).toBe('failed');

    expect(svc.saveVideo(s.id, Buffer.from('abc')).videos).toEqual(['video-01.webm']);
    expect(svc.list()).toMatchObject([{ id: s.id, stepCount: 1, failed: 1, videoCount: 1 }]);

    expect(svc.deleteStep(s.id, step.id).steps).toHaveLength(0);
    expect(fs.existsSync(path.join(svc.getSessionDir(s.id), step.screenshot!))).toBe(false);
  });

  it('rejeita ids que escapam da pasta raiz', () => {
    const svc = make();
    expect(() => svc.get('../x__20260102-030405')).toThrow();
    expect(() => svc.deleteSession('..__20260102-030405')).toThrow();
  });

  it('a tarefa é opcional: sem ela a pasta é "sem-tarefa" e o título ganha um nome', () => {
    const s = make().createSession({ task: '  ', kind: 'dev' });
    expect(s.task).toBe('');
    expect(s.id.startsWith('sem-tarefa__')).toBe(true);
    expect(s.title).toMatch(/^Evidência de /);
  });

  it('sem tarefa só a publicação no Jira é recusada', async () => {
    const svc = make();
    const s = svc.createSession({ task: '', kind: 'qa' });
    const result = await svc.publishToJira(s.id, '', { includeVideos: false });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Chave do Jira/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('gera HTML e PDF', async () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'dev' });
    const files = await svc.generateReport(s.id, true);
    expect(fs.readFileSync(files.html, 'utf-8')).toContain('<!doctype html>');
    expect(fs.readFileSync(files.pdf!, 'utf-8')).toBe('%PDF');
  });

  it('publica no Jira: anexa o PDF, pula vídeo grande e comenta', async () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'qa' });
    svc.saveVideo(s.id, Buffer.from('abc'));
    const result = await svc.publishToJira(s.id, 'wt-1', { includeVideos: true });
    expect(result).toMatchObject({ success: true, issueKey: 'WT-1', attached: ['relatorio.pdf', 'video-01.webm'] });
    const urls = fetchImpl.mock.calls.map((c) => c[0]);
    expect(urls).toEqual([
      'https://jira.example.com/rest/api/2/issue/WT-1/attachments',
      'https://jira.example.com/rest/api/2/issue/WT-1/attachments',
      'https://jira.example.com/rest/api/2/issue/WT-1/comment'
    ]);
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer S3CRET');
  });

  it('edita os dados da evidência sem mudar a pasta', () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'qa', title: 'Antigo', tester: 'Ana', environment: 'v1' });
    const updated = svc.updateSession(s.id, { task: 'WT-2', title: 'Novo', kind: 'dev', tester: '', environment: 'v2 / branch x' });
    expect(updated).toMatchObject({ id: s.id, task: 'WT-2', title: 'Novo', kind: 'dev', tester: undefined, environment: 'v2 / branch x' });
    expect(svc.get(s.id).title).toBe('Novo');
    expect(svc.updateSession(s.id, { title: '  ' }).title).toBe('WT-2');
    expect(svc.updateSession(s.id, { task: ' ', title: ' ' })).toMatchObject({ task: '', title: 'Evidência sem título' });
    expect(svc.updateSession(s.id, { kind: 'xx' as never }).kind).toBe('dev');
  });

  it('prévia da publicação: mesmo comentário e anexos do envio, sem tocar no Jira', async () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'qa', title: 'Teste da carga' });
    svc.saveVideo(s.id, Buffer.from('abc'));
    const preview = svc.previewJiraPublication(s.id, true);
    expect(preview.attachments.map((a) => a.name)).toEqual(['relatorio.pdf', 'video-01.webm']);
    expect(preview.comment).toContain('Teste da carga');
    expect(preview.comment).toContain('[^relatorio.pdf]');
    expect(preview.comment).toContain('[^video-01.webm]');
    expect(svc.previewJiraPublication(s.id, false).comment).not.toContain('video-01.webm');
    expect(fetchImpl).not.toHaveBeenCalled();
    const sent = await svc.publishToJira(s.id, 'WT-1', { includeVideos: true });
    expect(sent.attached).toEqual(preview.attachments.map((a) => a.name));
  });

  it('devolve erro amigável sem vazar o token', async () => {
    fetchImpl.mockResolvedValue({ ok: false, status: 401 });
    const s = make().createSession({ task: 'WT-1', kind: 'qa' });
    const result = await make().publishToJira(s.id, 'WT-1', { includeVideos: false });
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
    expect(result.error).not.toContain('S3CRET');
  });

  it('busca título, status e responsável da issue no Jira', async () => {
    fetchImpl.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ fields: { summary: 'Corrigir NF', status: { name: 'Em teste' }, assignee: { displayName: 'Ana' } } })
    });
    const result = await make().lookupIssue('wt-9');
    expect(result).toMatchObject({ success: true, issueKey: 'WT-9', summary: 'Corrigir NF', status: 'Em teste', assignee: 'Ana' });
    expect(String(fetchImpl.mock.calls[0][0])).toContain('/rest/api/2/issue/WT-9');
  });

  it('informa issue inexistente e chave inválida', async () => {
    fetchImpl.mockResolvedValue({ ok: false, status: 404 });
    expect((await make().lookupIssue('WT-9')).error).toMatch(/não encontrada/);
    expect((await make().lookupIssue('xx')).success).toBe(false);
  });

  it('valida chave e configuração do Jira', async () => {
    const svc = make();
    const s = svc.createSession({ task: 'WT-1', kind: 'qa' });
    expect((await svc.publishToJira(s.id, 'abc', { includeVideos: false })).success).toBe(false);
    settings = {};
    expect((await svc.publishToJira(s.id, 'WT-1', { includeVideos: false })).error).toMatch(/Cadastre/);
  });
});
