import { describe, expect, it } from 'vitest';
import {
  extractBindVariables,
  extractSqlVariables,
  castBindValue,
  substituteBindVariables
} from './sqlBinds';

describe('sqlBinds utils', () => {
  it('extrai variáveis de bind com sucesso em query típica do WinThor (:VAR)', () => {
    const sql = `
      SELECT E.EMBALAGEM
            ,NVL(E.UNIDADE,'UN') AS UNIDADE_MEDIDA
            ,E.CODAUXILIAR
            ,COALESCE(E.PESOBRUTO, 0) PESOBRUTO
            ,COALESCE(E.QTUNIT, 0) QTUNIT
        FROM PCEMBALAGEM E, PCPRODUT P
       WHERE E.CODPROD = :CODPROD
         AND E.CODFILIAL = :CODFILIAL
         AND E.CODAUXILIAR = :CODAUXILIAR
         AND P.CODPROD = E.CODPROD
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['CODPROD', 'CODFILIAL', 'CODAUXILIAR']);
  });

  it('extrai variáveis de substituição do WinThor / SQL*Plus (&VAR e &&VAR)', () => {
    const sql = `
      SELECT *
        FROM PCCLIENT C
       WHERE C.CODCLI = &CODCLI
         AND C.CODFILIAL = &&CODFILIAL
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['CODCLI', 'CODFILIAL']);

    const detailed = extractSqlVariables(sql);
    expect(detailed).toEqual([
      { name: 'CODCLI', prefix: '&', raw: '&CODCLI' },
      { name: 'CODFILIAL', prefix: '&&', raw: '&&CODFILIAL' }
    ]);
  });

  it('extrai variáveis com formato @VAR e ${VAR} / #{VAR}', () => {
    const sql = `
      SELECT *
        FROM PCPRODUT
       WHERE CODPROD = @CODPROD
         AND CODFILIAL = \${CODFILIAL}
         AND CODDEP = #{CODDEP}
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['CODPROD', 'CODFILIAL', 'CODDEP']);

    const detailed = extractSqlVariables(sql);
    expect(detailed).toEqual([
      { name: 'CODPROD', prefix: '@', raw: '@CODPROD' },
      { name: 'CODFILIAL', prefix: '${}', raw: '${CODFILIAL}' },
      { name: 'CODDEP', prefix: '#{}', raw: '#{CODDEP}' }
    ]);
  });

  it('ignora variáveis dentro de strings e comentários', () => {
    const sql = `
      -- :COMENTARIO_LINHA e &COMENTARIO_LINHA não devem ser extraídos
      /* :COMENTARIO_BLOCO e @BLOCO também não */
      SELECT 'Texto com :LITERAL_STRING e &OUTRO' AS TXT
        FROM DUAL
       WHERE COD = :VAR_REAL
         AND TIPO = &VAR_WINTHOR
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['VAR_REAL', 'VAR_WINTHOR']);
  });

  it('ignora operador de atribuição := do PL/SQL e cast :: do PostgreSQL', () => {
    const sql = `
      BEGIN
        v_test := 10;
        SELECT id::text FROM tab WHERE x = :VALID_PARAM;
      END;
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['VALID_PARAM']);
  });

  it('converte valores com castBindValue conforme tipo solicitado', () => {
    expect(castBindValue('123', 'number')).toBe(123);
    expect(castBindValue('123.45', 'auto')).toBe(123.45);
    expect(castBindValue('Texto', 'string')).toBe('Texto');
    expect(castBindValue('1, 2, 3', 'list')).toBe('1, 2, 3');
    expect(castBindValue('', 'auto')).toBeNull();
    expect(castBindValue('NULL', 'auto')).toBeNull();
    expect(castBindValue('qualquer', 'null')).toBeNull();
  });

  it('substitui variáveis de bind e de substituição (: e & e @ e ${}) no SQL corretamente', () => {
    const sql = 'SELECT * FROM TAB WHERE ID = :ID AND FILIAL = &FILIAL AND USER_ID = @USER AND DEP = ${DEP}';
    const binds = {
      ID: { value: '42', type: 'number' },
      FILIAL: { value: '01', type: 'string' },
      USER: { value: '99', type: 'auto' },
      DEP: { value: 'TI', type: 'string' }
    };

    const substituted = substituteBindVariables(sql, binds);
    expect(substituted).toBe("SELECT * FROM TAB WHERE ID = 42 AND FILIAL = '01' AND USER_ID = 99 AND DEP = 'TI'");
  });

  it('formata lista para cláusula IN corretamente com tipo list', () => {
    const sql = 'SELECT * FROM TAB WHERE CODCLI IN (:CLIENTES) AND FILIAIS IN (&FILIAIS)';
    const binds = {
      CLIENTES: { value: '10, 20, 30', type: 'list' },
      FILIAIS: { value: "'01', '02'", type: 'list' }
    };

    const substituted = substituteBindVariables(sql, binds);
    expect(substituted).toBe("SELECT * FROM TAB WHERE CODCLI IN (10, 20, 30) AND FILIAIS IN ('01', '02')");
  });

  it('não substitui variáveis que estejam dentro de strings literais ou comentários', () => {
    const sql = "SELECT 'Meu :ID não muda', -- :ID e &ID comentário\n /* :ID bloco */ ID FROM TAB WHERE ID = :ID AND COD = &COD";
    const binds = {
      ID: { value: '99', type: 'number' },
      COD: { value: '55', type: 'number' }
    };

    const substituted = substituteBindVariables(sql, binds);
    expect(substituted).toBe("SELECT 'Meu :ID não muda', -- :ID e &ID comentário\n /* :ID bloco */ ID FROM TAB WHERE ID = 99 AND COD = 55");
  });
});
