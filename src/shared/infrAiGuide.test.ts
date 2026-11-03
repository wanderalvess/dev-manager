import { describe, expect, it } from 'vitest';
import { buildGuideUserMessage, describeEnvCheckForAi, maskForAi, parseGuideReply, validateGuideField, type GuideContext } from './infrAiGuide';

const envs = ['master', 'local'];

describe('parseGuideReply', () => {
  it('aceita set com valor válido, mesmo dentro de cerca de código e com texto em volta', () => {
    const text = 'Claro!\n```json\n{"action":"set","field":"version","value":"40","why":"o usuário pediu a 40"}\n```';
    expect(parseGuideReply(text, envs)).toEqual({ ok: true, action: { action: 'set', field: 'version', value: '40', why: 'o usuário pediu a 40' } });
  });

  it('aceita número como valor e chaves dentro de strings', () => {
    const r = parseGuideReply('{"action":"set","field":"wtaPort","value":8040,"why":"porta {padrão} da 40"}', envs);
    expect(r).toEqual({ ok: true, action: { action: 'set', field: 'wtaPort', value: '8040', why: 'porta {padrão} da 40' } });
  });

  it('recusa origem fora da lista, versão e porta inválidas, campo desconhecido', () => {
    expect(parseGuideReply('{"action":"set","field":"from","value":"prod","why":"x"}', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('{"action":"set","field":"version","value":"4","why":"x"}', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('{"action":"set","field":"wtaPort","value":"80","why":"x"}', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('{"action":"set","field":"infrPath","value":"C:/x","why":"x"}', envs)).toMatchObject({ ok: false });
  });

  it('recusa ação desconhecida, resposta sem JSON, JSON quebrado e sem why', () => {
    expect(parseGuideReply('{"action":"exec","why":"x","command":"rm -rf /"}', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('vou preencher', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('{"action":"preview",', envs)).toMatchObject({ ok: false });
    expect(parseGuideReply('{"action":"preview"}', envs)).toMatchObject({ ok: false });
  });

  it('say limita e filtra os comandos sugeridos', () => {
    const r = parseGuideReply(JSON.stringify({ action: 'say', why: 'veja', commands: ['docker ps', '', 7, 'x'.repeat(500)] }), envs);
    expect(r).toEqual({ ok: true, action: { action: 'say', why: 'veja', commands: ['docker ps'] } });
  });

  it('descarta comandos que apagam ou param algo e mantém os de leitura', () => {
    const r = parseGuideReply(
      JSON.stringify({
        action: 'say',
        why: 'porta em uso',
        commands: ['docker stop wta-local && docker rm -f wta-local', 'docker system prune -af', 'rm -rf /opt/x', 'docker ps', 'docker logs --tail 50 wta-v40', 'git checkout feature/imagem-por-versao']
      }),
      envs
    );
    expect(r).toEqual({ ok: true, action: { action: 'say', why: 'porta em uso', commands: ['docker ps', 'docker logs --tail 50 wta-v40', 'git checkout feature/imagem-por-versao'] } });
  });

  it('preview, generate, verify e done só precisam do motivo', () => {
    for (const action of ['preview', 'generate', 'verify', 'done']) {
      expect(parseGuideReply(JSON.stringify({ action, why: 'ok' }), envs)).toEqual({ ok: true, action: { action, why: 'ok' } });
    }
  });
});

describe('validateGuideField', () => {
  it('dbMode e dryRun', () => {
    expect(validateGuideField('dbMode', 'clone', envs)).toBe('');
    expect(validateGuideField('dbMode', 'drop', envs)).not.toBe('');
    expect(validateGuideField('dryRun', '1', envs)).toBe('');
    expect(validateGuideField('dryRun', 'sim', envs)).not.toBe('');
  });
});

describe('describeEnvCheckForAi', () => {
  it('resume containers, log de quem não subiu e falha do build', () => {
    const v = describeEnvCheckForAi({
      success: true,
      containers: [
        { role: 'oracle', container: 'oracle-v40', exists: true, state: 'running', health: 'healthy', restarts: 0, ports: ['1521/tcp -> 0.0.0.0:1540'], logTail: [] },
        { role: 'wta', container: 'wta-v40', exists: true, state: 'exited', restarts: 3, ports: [], logTail: ['erro: Unable to resolve root'] },
        { role: 'wsh', container: 'wsh-v40', exists: false, ports: [], logTail: [] }
      ],
      wtaHttp: { url: 'http://localhost:8040', error: 'connection refused' },
      buildLog: { path: '/tmp/x.log', exists: true, failure: 'Unable to resolve', stage: '[3/5] build', tail: ['linha final'] },
      summary: { status: 'fail', title: 'WTA caiu', detail: 'veja o log' }
    });
    expect(v.status).toContain('fail');
    expect(v.lines).toContain('oracle-v40: running/healthy, reinícios 0, portas 1521/tcp -> 0.0.0.0:1540');
    expect(v.lines).toContain('wsh-v40: não existe');
    expect(v.lines).toContain('  log: erro: Unable to resolve root');
    expect(v.lines.some((l) => l.includes('WTA HTTP') && l.includes('connection refused'))).toBe(true);
    expect(v.lines).toContain('Log do build: Unable to resolve');
  });
});

describe('maskForAi / buildGuideUserMessage', () => {
  it('mascara credenciais de URL e pares senha/token', () => {
    const out = maskForAi('repo http://pc:Segredo1@nexus:8081/x senha=abc123 token: xyz password="a b"');
    expect(out).not.toMatch(/Segredo1|abc123|xyz|a b/);
    expect(out).toContain('***@nexus');
  });

  it('o contexto leva formulário, conferência e histórico, sem segredos', () => {
    const ctx: GuideContext = {
      goal: 'criar a 40',
      envs,
      form: { from: 'master', version: '40', name: '', dbMode: 'clone', oraclePort: '', wtaPort: '', wshPort: '', dryRun: '' },
      review: [{ id: 'portas', status: 'block', title: 'Portas', detail: 'A 8040 está em uso; senha=zzz' }],
      history: ['preview → falhou'],
      previewError: 'login em http://u:p@host/x'
    };
    const msg = buildGuideUserMessage(ctx);
    expect(msg).toContain('- version: 40');
    expect(msg).toContain('- name: (vazio)');
    expect(msg).toContain('[block] Portas');
    expect(msg).toContain('preview → falhou');
    expect(msg).not.toMatch(/zzz|u:p@/);
  });
});
