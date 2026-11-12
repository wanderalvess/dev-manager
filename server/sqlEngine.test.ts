import test from 'node:test';
import assert from 'node:assert/strict';
import { executeInMemorySql } from './sqlEngine';
import { state } from './state';

test('SELECT * returns rows and columns from PCFILIAL', () => {
  const res = executeInMemorySql('SELECT * FROM PCFILIAL');
  assert.equal(res.success, true);
  assert.ok(res.rowCount >= 2);
  assert.ok(res.columns.includes('CODIGO'));
});

test('SELECT supports WHERE numeric comparison, LIKE, ORDER BY DESC, and LIMIT', () => {
  const res = executeInMemorySql("SELECT CODPROD, DESCRICAO, ESTOQUE FROM PCPRODUT WHERE ESTOQUE < 250 ORDER BY CODPROD DESC LIMIT 2");
  assert.equal(res.success, true);
  assert.equal(res.rowCount, 2);
  assert.deepEqual(res.columns, ['CODPROD', 'DESCRICAO', 'ESTOQUE']);
  assert.ok(Number(res.rows[0].CODPROD) >= Number(res.rows[1].CODPROD));

  const likeRes = executeInMemorySql("SELECT DESCRICAO FROM PCPRODUT WHERE DESCRICAO LIKE '%CAFE%'");
  assert.equal(likeRes.success, true);
  assert.ok(likeRes.rowCount >= 1);
  assert.ok(String(likeRes.rows[0].DESCRICAO).includes('CAFE'));
});

test('SELECT supports bind parameters safely', () => {
  const res = executeInMemorySql('SELECT NUMPED, VLTOTAL FROM PCPEDC WHERE CODFILIAL = :filial', 50, { filial: '1' });
  assert.equal(res.success, true);
  assert.ok(res.rowCount >= 1);
});

test('SHOW TABLES and DESCRIBE return metadata', () => {
  const tables = executeInMemorySql('SHOW TABLES');
  assert.equal(tables.success, true);
  assert.ok(tables.rows.some((r) => r.TABLE_NAME === 'PCPEDC'));

  const desc = executeInMemorySql('DESCRIBE PCFILIAL');
  assert.equal(desc.success, true);
  assert.ok(desc.rows.some((r) => r.COLUMN_NAME === 'CODIGO'));
});

test('INSERT and UPDATE mutate state cleanly without affecting other tables', () => {
  const initialCount = state.sqlTables.PCFILIAL.length;
  const ins = executeInMemorySql("INSERT INTO PCFILIAL (CODIGO, RAZAOSOCIAL, CIDADE, UF) VALUES ('99', 'FILIAL TESTE', 'GOIANIA', 'GO')");
  assert.equal(ins.success, true);
  assert.equal(ins.affectedRows, 1);

  const upd = executeInMemorySql("UPDATE PCFILIAL SET CIDADE = 'ANAPOLIS' WHERE CODIGO = '99'");
  assert.equal(upd.success, true);
  assert.equal(upd.affectedRows, 1);

  const check = executeInMemorySql("SELECT CIDADE FROM PCFILIAL WHERE CODIGO = '99'");
  assert.equal(check.rows[0]?.CIDADE, 'ANAPOLIS');

  // Restore clean fixture count
  state.sqlTables.PCFILIAL = state.sqlTables.PCFILIAL.slice(0, initialCount);
});

test('Invalid SQL and missing tables return structured errors', () => {
  const empty = executeInMemorySql('   ');
  assert.equal(empty.success, false);
  assert.ok(empty.error);

  const missing = executeInMemorySql('SELECT * FROM TABELA_INEXISTENTE');
  assert.equal(missing.success, false);
  assert.match(missing.error || '', /ORA-00942/);

  const unknown = executeInMemorySql('DROP TABLE PCFILIAL');
  assert.equal(unknown.success, false);
});
