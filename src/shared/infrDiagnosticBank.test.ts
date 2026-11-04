import { describe, expect, it } from 'vitest';
import { buildCompactDiagnostic, buildDiagnosticReport, diagnosticProbeScript, normalizeBankProbe, parseDiagnosticProbe, type DiagnosticInput } from './infrDiagnostic';
import { matchKnownFailures } from './infrAiKnownFailures';

const input = (probe: string): DiagnosticInput => ({
  generatedAt: '2026-11-03 18:20',
  hubVersion: '1.67.0',
  os: 'Windows',
  name: 'local',
  distro: 'ubuntu',
  infrPath: 'C:\\INFR',
  scripts: [],
  files: [],
  containers: [{ name: 'oracle-local', exists: true, state: 'running', health: 'healthy', ports: [] }],
  probe: parseDiagnosticProbe(probe)
});

const RAW_23AI = ['Error 6 initializing SQL*Plus', 'SP2-0667: Message file sp1<lang>.msb not found', 'SP2-0750: You may need to set ORACLE_HOME to your Oracle software directory'];

describe('leitura do banco em imagens diferentes', () => {
  it('o roteiro usa o ORACLE_HOME e o SID do container, com o do XE só de reserva, e entra no PDB do 23ai', () => {
    const s = diagnosticProbeScript('local', '/tmp/x.log', 'winthor');
    expect(s).toContain('ORACLE_HOME="${ORACLE_HOME:-/u01/app/oracle/product/11.2.0/xe}"');
    expect(s).toContain('ORACLE_SID="${ORACLE_SID:-XE}"');
    expect(s).not.toMatch(/ORACLE_HOME=\/u01[^\n]*ORACLE_SID=XE;/);
    expect(s).toContain('alter session set container = FREEPDB1');
    expect(s).not.toContain('echo lido');
  });

  it('saída do XE 11g: só as linhas úteis, sem linha "lido"', () => {
    expect(normalizeBankProbe(['', 'INVALID TRIGGER TRG_X', 'PCVERSAOBD [ROTINA ]', ''], 'oracle-winthor:11.2.0.2-xe')).toEqual(['INVALID TRIGGER TRG_X', 'PCVERSAOBD [ROTINA ]']);
    expect(normalizeBankProbe(['', ''])).toEqual([]);
    expect(normalizeBankProbe(undefined)).toBeUndefined();
  });

  it('saída crua do 23ai quebrado vira uma frase com a imagem, sem SP2- nem Error 6', () => {
    expect(normalizeBankProbe(RAW_23AI, 'hub-oracle-local:snap')).toEqual(['Não deu para ler o banco: o sqlplus não iniciou nesta imagem (hub-oracle-local:snap)']);
    const probe = `@@banco\n${RAW_23AI.join('\n')}\n@@bancoimg\nhub-oracle-local:snap\n@@fim\n`;
    const report = buildDiagnosticReport(input(probe));
    expect(report).toContain('o sqlplus não iniciou nesta imagem (hub-oracle-local:snap)');
    expect(report).not.toMatch(/SP2-|Error 6/);
    const compact = buildCompactDiagnostic(input(probe));
    expect(compact).not.toMatch(/SP2-|Error 6/);
    expect(matchKnownFailures(compact).map((f) => f.id)).not.toContain(6);
  });

  it('banco lido e sem nada errado diz isso', () => {
    expect(buildCompactDiagnostic(input('@@banco\n\n@@bancoimg\nhub-oracle-local:snap\n@@fim\n'))).toContain('Nenhum objeto inválido');
  });
});
