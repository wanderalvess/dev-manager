import { describe, expect, it } from 'vitest';
import {
  extractBindVariables,
  castBindValue,
  substituteBindVariables
} from './sqlBinds';

describe('sqlBinds utils', () => {
  it('extrai variáveis de bind com sucesso em query típica do WinThor', () => {
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

  it('ignora variáveis dentro de strings e comentários', () => {
    const sql = `
      -- :COMENTARIO_LINHA não deve ser extraído
      /* :COMENTARIO_BLOCO também não */
      SELECT 'Texto com :LITERAL_STRING' AS TXT
        FROM DUAL
       WHERE COD = :VAR_REAL
    `;

    const vars = extractBindVariables(sql);
    expect(vars).toEqual(['VAR_REAL']);
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
    expect(castBindValue('', 'auto')).toBeNull();
    expect(castBindValue('NULL', 'auto')).toBeNull();
    expect(castBindValue('qualquer', 'null')).toBeNull();
  });

  it('substitui variáveis de bind no SQL corretamente', () => {
    const sql = 'SELECT * FROM TAB WHERE ID = :ID AND STATUS = :STATUS AND OBS = :OBS';
    const binds = {
      ID: { value: '42', type: 'number' },
      STATUS: { value: "D'água", type: 'string' },
      OBS: { value: '', type: 'auto' }
    };

    const substituted = substituteBindVariables(sql, binds);
    expect(substituted).toBe("SELECT * FROM TAB WHERE ID = 42 AND STATUS = 'D''água' AND OBS = NULL");
  });

  it('não substitui variáveis que estejam dentro de strings literais ou comentários', () => {
    const sql = "SELECT 'Meu :ID não muda', -- :ID de comentário\n /* :ID bloco */ ID FROM TAB WHERE ID = :ID";
    const binds = {
      ID: { value: '99', type: 'number' }
    };

    const substituted = substituteBindVariables(sql, binds);
    expect(substituted).toBe("SELECT 'Meu :ID não muda', -- :ID de comentário\n /* :ID bloco */ ID FROM TAB WHERE ID = 99");
  });
});
