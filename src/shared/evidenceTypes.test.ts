import { describe, expect, it } from 'vitest';
import {
  buildSessionId,
  guessJiraKey,
  isValidEvidenceFileName,
  isValidSessionId,
  normalizeJiraKey,
  slugifyTask,
  summarizeEvidence,
  type EvidenceStep
} from './evidenceTypes';

const step = (result: EvidenceStep['result']): EvidenceStep => ({ id: 'x', title: 't', result, createdAt: '' });

describe('evidenceTypes', () => {
  it('gera nomes de pasta seguros', () => {
    expect(slugifyTask('WT-123 / ajuste ção')).toBe('WT-123-ajuste-cao');
    expect(slugifyTask('../../etc')).toBe('etc');
    expect(slugifyTask('   ')).toBe('sem-tarefa');
  });

  it('monta e valida o id da sessão', () => {
    const id = buildSessionId('WT-9', new Date(2026, 0, 2, 3, 4, 5));
    expect(id).toBe('WT-9__20260102-030405');
    expect(isValidSessionId(id)).toBe(true);
    expect(isValidSessionId('../x__20260102-030405')).toBe(false);
    expect(isValidSessionId('a/b__20260102-030405')).toBe(false);
  });

  it('só aceita nomes de arquivo simples', () => {
    expect(isValidEvidenceFileName('step-01.png')).toBe(true);
    expect(isValidEvidenceFileName('..\\x.png')).toBe(false);
    expect(isValidEvidenceFileName('a..b')).toBe(false);
  });

  it('normaliza a chave do Jira', () => {
    expect(normalizeJiraKey(' wt-12 ')).toBe('WT-12');
    expect(normalizeJiraKey('12')).toBeNull();
    expect(normalizeJiraKey('WT-1/../x')).toBeNull();
    expect(guessJiraKey('ajuste wt-77 pdv')).toBe('WT-77');
    expect(guessJiraKey('sem chave')).toBe('');
  });

  it('resume o veredito', () => {
    expect(summarizeEvidence([]).verdict).toBe('pending');
    expect(summarizeEvidence([step('passed'), step('passed')]).verdict).toBe('passed');
    expect(summarizeEvidence([step('passed'), step('pending')]).verdict).toBe('pending');
    expect(summarizeEvidence([step('failed'), step('pending')]).verdict).toBe('failed');
  });
});
