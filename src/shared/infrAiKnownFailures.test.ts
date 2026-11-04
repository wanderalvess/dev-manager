import { describe, expect, it } from 'vitest';
import { buildCompactDiagnostic, diagnosticProbeScript, parseDiagnosticProbe, type DiagnosticInput } from './infrDiagnostic';
import { GUIDE_SYSTEM_PROMPT, buildGuideUserMessage, parseGuideReply, type GuideContext } from './infrAiGuide';
import { KNOWN_FAILURES, matchKnownFailures } from './infrAiKnownFailures';

const ids = (text: string) => matchKnownFailures(text).map((f) => f.id);

describe('catálogo de falhas conhecidas', () => {
  it('está no prompt, com as 13 entradas, e o SQL e os comandos que apagam ficam no texto', () => {
    expect(KNOWN_FAILURES).toHaveLength(13);
    for (const f of KNOWN_FAILURES) expect(GUIDE_SYSTEM_PROMPT).toContain(`${f.id}. ${f.name}.`);
    expect(GUIDE_SYSTEM_PROMPT).toContain('git fetch origin && git checkout feature/imagem-por-versao && git pull');
    expect(GUIDE_SYSTEM_PROMPT).toContain('TRG_PCGRUPOSCAMPANHAI_LOG_EXCL');
    expect(GUIDE_SYSTEM_PROMPT).toContain('NUMBER(9)');
    expect(GUIDE_SYSTEM_PROMPT).toContain('ambiente de teste, com backup');
  });

  it('casos de log: cada sintoma acha a sua entrada', () => {
    expect(ids('[ERRO] Flag desconhecida: --version')).toContain(1);
    expect(ids('docker: Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:8140 failed: port is already allocated')).toContain(3);
    expect(ids('- [warn] wta-homolog, wta-homolog-data já existe: O script não recria o que existe')).toContain(4);
    expect(ids("Falha na Atualização! '-1'")).toContain(6);
    expect(ids('ORA-04098: trigger TRG_PCGRUPOSCAMPANHAI_LOG_EXCL is invalid and failed re-validation')).toContain(6);
    expect(ids('PCVERSAOBD [PCGRUPOSCAMPANHAI_LOG_EXCL ]')).toContain(6);
    expect(ids('[ERRO] Jar do WSH não encontrado: /opt/wsh/40/x.jar')).toContain(8);
    expect(ids('wta-homolog: exited (Exited (137) 3 minutes ago)')).toContain(11);
    expect(ids('WTA HTTP http://localhost:8140: 500')).toContain(7);
    expect(ids('write /opt/dumps/x: No space left on device')).toContain(12);
    expect(ids('tudo certo, container healthy')).toEqual([]);
  });

  it('o contexto da IA ganha a pista da falha que combina, também com a saída colada', () => {
    const ctx: GuideContext = {
      goal: 'criar homolog',
      envs: ['master'],
      form: { from: 'master', version: '40', name: 'homolog', dbMode: 'clone', oraclePort: '', wtaPort: '', wshPort: '', dryRun: '' },
      review: [],
      history: [],
      pasted: 'docker: Bind for 0.0.0.0:8140 failed: port is already allocated'
    };
    const msg = buildGuideUserMessage(ctx);
    expect(msg).toContain('Pista do Hub');
    expect(msg).toContain('3 (porta já em uso)');
    expect(buildGuideUserMessage({ ...ctx, pasted: undefined })).not.toContain('Pista do Hub');
  });

  it('a IA descreve o SQL no texto: comandos destrutivos são descartados de "commands"', () => {
    const reply = JSON.stringify({
      action: 'say',
      why: 'No ambiente de teste, com backup: DROP TRIGGER TRG_PCGRUPOSCAMPANHAI_LOG_EXCL;',
      commands: ['docker rm -f wta-homolog', 'docker volume rm wta-homolog-data', 'docker rmi linux-winthor:40-debian', 'free -m', 'df -h / /opt']
    });
    const r = parseGuideReply(reply, ['master']);
    expect(r).toMatchObject({ ok: true, action: { action: 'say', commands: ['free -m', 'df -h / /opt'] } });
  });
});

describe('banco clonado da Central: leitura só do que está no relatório', () => {
  const input = (probe: string): DiagnosticInput => ({
    generatedAt: '2026-11-03 18:20',
    hubVersion: '1.67.0',
    os: 'Windows',
    name: 'homolog',
    distro: 'ubuntu',
    infrPath: 'C:\\INFR',
    scripts: [],
    files: [],
    containers: [{ name: 'oracle-homolog', exists: true, state: 'running', health: 'healthy', ports: [] }],
    probe: parseDiagnosticProbe(probe)
  });

  it('o roteiro lê como usuário oracle, sem senha, só o schema do DB_USER e só com select', () => {
    const s = diagnosticProbeScript('homolog', '/tmp/x.log', 'winthor');
    expect(s).toContain('docker exec -i -u oracle oracle-homolog');
    expect(s).toContain('sqlplus -S / as sysdba');
    expect(s).toContain("owner = 'WINTHOR' and status = 'INVALID'");
    expect(s).toContain("from WINTHOR.pcversaobd where rotina like '% '");
    // só select; o único "alter" é a troca de sessão para o PDB do 23ai
    expect(s.replace('alter session set container = FREEPDB1', '')).not.toMatch(/\b(drop|delete|update|insert|alter|truncate)\b/i);
    expect(s).not.toMatch(/system\/|password|senha/i);
    expect(s).toContain("printf '%s\\n'");
    // usuário fora do padrão não entra no SQL
    const bad = diagnosticProbeScript('homolog', '/tmp/x.log', "x'; drop user y; --");
    expect(bad).not.toContain('dba_objects');
    expect(bad).toContain('Não deu para ler o banco');
    expect(diagnosticProbeScript('homolog', '/tmp/x.log')).toContain('DB_USER');
  });

  it('o compacto da IA traz a trigger INVALID e a rotina com espaço', () => {
    const text = buildCompactDiagnostic(input('@@banco\nINVALID TRIGGER TRG_PCGRUPOSCAMPANHAI_LOG_EXCL\nPCVERSAOBD [PCGRUPOSCAMPANHAI_LOG_EXCL ]\n@@fim\n'));
    expect(text).toContain('Banco (somente leitura');
    expect(text).toContain('INVALID TRIGGER TRG_PCGRUPOSCAMPANHAI_LOG_EXCL');
    expect(ids(text)).toContain(6);
  });
});
