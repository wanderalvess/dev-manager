import { describe, expect, it } from 'vitest';
import { buildCompactDiagnostic, parseDiagnosticProbe } from './infrDiagnostic';
import type { InfrEnvCheck } from './infrEnvCheck';
import { buildGuideUserMessage, continueConversation, envFailureSignature, failureToExplain, maskForAi, parseGuideReply, type GuideContext } from './infrAiGuide';

const UPDATE = 'git fetch origin && git checkout feature/imagem-por-versao && git pull';

const failedCheck = (over: Partial<InfrEnvCheck> = {}): InfrEnvCheck => ({
  success: true,
  name: 'homolog',
  containers: [],
  buildLog: { exists: true, path: '/tmp/x.log', tail: [], failure: '[ERRO] Flag desconhecida: --version', stage: '4/5 WTA' } as InfrEnvCheck['buildLog'],
  summary: { status: 'fail', title: 'A criação parou antes de terminar', detail: 'Falta: WTA, WSH.' },
  ...over
});

describe('falha da criação: contexto e resposta esperada (cenário do Nathan)', () => {
  const diagnostic = buildCompactDiagnostic({
    generatedAt: '2026-11-03 18:20',
    hubVersion: '1.67.0',
    os: 'Windows',
    name: 'homolog',
    distro: 'ubuntu',
    infrPath: 'C:\\Projetos\\INFR-Docker',
    summary: { status: 'fail', title: 'A criação parou antes de terminar', detail: 'Criado: Banco Oracle. Falta: WTA, WSH.' },
    git: { branch: 'main', commit: 'abc1234 2026-09-01 velho', changes: [] },
    scripts: [{ script: 'wta_setup.sh', path: 'linux-winthor/scripts/wta_setup.sh', exists: true, bytes: 4100, modified: '2026-09-01 10:00', missing: ['--version'] }],
    gapsMessage: `Os scripts estão desatualizados: linux-winthor/scripts/wta_setup.sh não conhece --version. Como resolver: ${UPDATE}, dentro de C:\\Projetos\\INFR-Docker.`,
    files: [],
    containers: [
      { name: 'oracle-homolog', exists: true, state: 'running', health: 'healthy', ports: [] },
      { name: 'wta-homolog', exists: false, ports: [] },
      { name: 'wsh-homolog', exists: false, ports: [] }
    ],
    probe: parseDiagnosticProbe('@@erros\n12:[ERRO] Flag desconhecida: --version\n@@log\n4/5 WTA wta-homolog\n[ERRO] Flag desconhecida: --version\n@@fim\n'),
    buildLog: { path: '/tmp/x.log', failure: '[ERRO] Flag desconhecida: --version', stage: '4/5 WTA wta-homolog' }
  });
  const ctx = (over: Partial<GuideContext> = {}): GuideContext => ({
    goal: 'criar o ambiente homolog na 40',
    envs: ['master'],
    form: { from: 'master', version: '40', name: 'homolog', dbMode: 'clone', oraclePort: '', wtaPort: '', wshPort: '', dryRun: '' },
    review: [],
    history: ['generate: terminal aberto, build em andamento'],
    diagnostic,
    ...over
  });

  it('o contexto da IA traz as evidências: erro do log, script desatualizado, banco criado e WTA/WSH ausentes', () => {
    const msg = buildGuideUserMessage(ctx());
    for (const part of ['[ERRO] Flag desconhecida: --version', 'SCRIPTS DESATUALIZADOS', 'não conhece --version', '- oracle-homolog: running/healthy', '- wta-homolog: não existe', '- wsh-homolog: não existe', UPDATE]) {
      expect(msg).toContain(part);
    }
    expect(msg.trimEnd().endsWith('Responda só com o JSON.')).toBe(true);
    expect(msg.length).toBeLessThan(18000);
  });

  it('a resposta esperada (say com a atualização da pasta) passa na validação e o comando fica', () => {
    const reply = JSON.stringify({ action: 'say', why: 'O wta_setup.sh da pasta está desatualizado e não conhece --version. Atualize a pasta.', commands: [UPDATE] });
    expect(parseGuideReply(reply, ['master'])).toMatchObject({ ok: true, action: { action: 'say', commands: [UPDATE] } });
  });

  it('senha, token, usuário:senha@ e Authorization nunca chegam ao modelo, nem pelo que foi colado', () => {
    const msg = buildGuideUserMessage(
      ctx({
        diagnostic: `${diagnostic}\nAuthorization: Basic dXNlcjpwYXNz\nrepo http://deploy:S3nh4Secreta@nexus.exemplo.com/r`,
        pasted: 'DB_PASSWORD=pcinfo\nhttps://ci:tok3nzinho@nexus.exemplo.com/x\nAuthorization: Bearer abc.def.ghi',
        history: ['o usuário respondeu: minha senha=hunter2']
      })
    );
    expect(msg).not.toMatch(/dXNlcjpwYXNz|S3nh4Secreta|pcinfo|tok3nzinho|abc\.def\.ghi|hunter2/);
    expect(maskForAi('Authorization: Basic dXNlcjpwYXNz')).toBe('Authorization: Basic ***');
  });
});

describe('gatilho único da falha', () => {
  it('só dispara com a criação em andamento, para o ambiente do formulário e uma vez por falha', () => {
    const check = failedCheck();
    const sig = envFailureSignature(check) as string;
    expect(sig).toContain('Flag desconhecida');
    expect(failureToExplain({ check, status: 'building', formName: 'homolog', lastSignature: null })).toBe(sig);
    // a mesma falha lida de novo (a cada 15 s ou ao reabrir a tela) não chama o modelo de novo
    expect(failureToExplain({ check, status: 'building', formName: 'homolog', lastSignature: sig })).toBeNull();
    // outra falha dispara de novo
    const other = failedCheck({ buildLog: { exists: true, path: '/tmp/x.log', tail: [], failure: '[ERRO] outro', stage: '2/5' } as InfrEnvCheck['buildLog'] });
    expect(failureToExplain({ check: other, status: 'building', formName: 'homolog', lastSignature: sig })).not.toBeNull();
  });

  it('não dispara se a IA parou (stop), já está pensando ou o ambiente é outro; sem falha não há assinatura', () => {
    const check = failedCheck();
    for (const status of ['idle', 'thinking', 'confirm', 'done']) expect(failureToExplain({ check, status, formName: 'homolog', lastSignature: null })).toBeNull();
    expect(failureToExplain({ check, status: 'building', formName: 'outro', lastSignature: null })).toBeNull();
    expect(envFailureSignature(failedCheck({ summary: { status: 'ok', title: 'No ar', detail: '' } }))).toBeNull();
    expect(envFailureSignature(failedCheck({ summary: { status: 'starting', title: 'Subindo', detail: '' } }))).toBeNull();
    expect(envFailureSignature(failedCheck({ success: false }))).toBeNull();
    expect(envFailureSignature(null)).toBeNull();
  });
});

describe('conversa depois da falha, sem apagar o contexto', () => {
  it('a resposta soma ao histórico e ao pedido; a saída colada é mascarada e entra no contexto', () => {
    const prev = { goal: 'criar o homolog na 40', history: ['generate: terminal aberto', 'a criação falhou: fail'], pasted: undefined };
    const next = continueConversation(prev, 'já atualizei a pasta', '[ERRO] Flag desconhecida: --version\nDB_PASSWORD=pcinfo');
    expect(next.goal).toBe('criar o homolog na 40');
    expect(next.history.slice(0, 2)).toEqual(prev.history);
    expect(next.history).toContain('o usuário respondeu: já atualizei a pasta');
    expect(next.pasted).toContain('Flag desconhecida');
    expect(next.pasted).not.toContain('pcinfo');
    expect(prev.history).toHaveLength(2);
    // uma resposta só de texto mantém o que já tinha sido colado
    expect(continueConversation(next, 'e agora?').pasted).toBe(next.pasted);
  });

  it('sem pedido anterior, o primeiro texto vira o pedido', () => {
    expect(continueConversation({ goal: '', history: [] }, '', 'erro qualquer').goal).toBe('Entender o erro do terminal');
    expect(continueConversation({ goal: '', history: [] }, 'não subiu').goal).toBe('não subiu');
  });
});
