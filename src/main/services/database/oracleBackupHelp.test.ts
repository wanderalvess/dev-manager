import { describe, expect, it } from 'vitest';
import { explainOracleFailure, extractOracleErrorLines, type OracleFailureContext } from './oracleBackupHelp';

const ctx: OracleFailureContext = {
  binary: 'expdp',
  operation: 'backup',
  user: 'local',
  database: 'orcl',
  directory: 'local',
  localPath: 'C:\\Users\\wanderson.alves\\Downloads\\backup'
};

const directoryOutput = [
  'Export: Release 11.2.0.4.0 - Production',
  'ORA-39002: invalid operation',
  'ORA-39070: Unable to open the log file.',
  'ORA-39087: directory name LOCAL is invalid',
  'ORA-39087: directory name LOCAL is invalid'
].join('\n');

describe('oracleBackupHelp', () => {
  it('extrai só as linhas de erro do Oracle, sem repetir', () => {
    expect(extractOracleErrorLines(directoryOutput)).toEqual([
      'ORA-39002: invalid operation',
      'ORA-39070: Unable to open the log file.',
      'ORA-39087: directory name LOCAL is invalid'
    ]);
  });

  it('DIRECTORY inexistente: lista os disponíveis e dá o SQL para criar com a pasta de destino', () => {
    const res = explainOracleFailure(directoryOutput, {
      ...ctx,
      directories: [{ name: 'DATA_PUMP_DIR', path: 'C:\\app\\oracle\\admin\\orcl\\dpdump\\' }]
    })!;
    expect(res.message).toContain('LOCAL não existe');
    expect(res.help?.code).toBe('ORA-39087');
    expect(res.help?.steps.join(' ')).toContain('DATA_PUMP_DIR (C:\\app\\oracle\\admin\\orcl\\dpdump\\)');
    expect(res.help?.snippets?.[0].code).toBe(
      `CREATE OR REPLACE DIRECTORY "LOCAL" AS 'C:\\Users\\wanderson.alves\\Downloads\\backup';\nGRANT READ, WRITE ON DIRECTORY "LOCAL" TO "LOCAL";`
    );
    expect(res.help?.detail).toContain('ORA-39087');
  });

  it('DIRECTORY sem consulta possível: explica o campo e dá o SQL para listar', () => {
    const res = explainOracleFailure(directoryOutput, ctx)!;
    expect(res.help?.steps.join(' ')).toContain('não o caminho da pasta');
    expect(res.help?.snippets?.some((s) => s.code.includes('all_directories'))).toBe(true);
  });

  it('DIRECTORY existe: o problema é a pasta no servidor, com icacls para a conta do serviço', () => {
    const res = explainOracleFailure('ORA-39002: invalid operation\nORA-39070: Unable to open the log file.\nORA-29283: invalid file operation', {
      ...ctx,
      directories: [{ name: 'LOCAL', path: 'C:\\oracle\\backup' }]
    })!;
    expect(res.message).toContain('não conseguiu gravar');
    expect(res.help?.steps.join(' ')).toContain('Use C:\\oracle\\backup como Pasta de destino');
    expect(res.help?.snippets?.[0].code).toBe('icacls "C:\\oracle\\backup" /grant "NT SERVICE\\OracleServiceORCL":(OI)(CI)M');
  });

  it('reconhece conexão, autenticação, conta bloqueada e privilégios', () => {
    expect(explainOracleFailure('ORA-12541: TNS:no listener', ctx)?.help?.code).toBe('ORA-12541');
    expect(explainOracleFailure('ORA-12514: TNS:listener does not currently know of service', ctx)?.message).toContain('service name orcl');
    expect(explainOracleFailure('ORA-01017: invalid username/password; logon denied', ctx)?.help?.code).toBe('ORA-01017');
    expect(explainOracleFailure('ORA-28000: the account is locked', ctx)?.help?.snippets?.[0].code).toBe('ALTER USER "LOCAL" ACCOUNT UNLOCK;');
    expect(explainOracleFailure('ORA-31626: job does not exist\nORA-01031: insufficient privileges', ctx)?.help?.snippets?.[0].code).toContain(
      'GRANT CREATE SESSION, CREATE TABLE TO "LOCAL";'
    );
  });

  it('restauração sem o dump no servidor aponta a pasta do DIRECTORY', () => {
    const res = explainOracleFailure('ORA-39001: invalid argument value\nORA-31640: unable to open dump file', {
      ...ctx,
      operation: 'restore',
      localPath: 'C:\\backups\\Oracle_Local.dmp'
    })!;
    expect(res.message).toContain('Oracle_Local.dmp');
  });

  it('ORACLE_HOME ausente e erro desconhecido', () => {
    expect(explainOracleFailure('UDE-00019: You may need to set ORACLE_HOME', ctx)?.message).toContain('ORACLE_HOME');
    expect(explainOracleFailure('ORA-99999: algo novo', ctx)).toBeNull();
  });
});
