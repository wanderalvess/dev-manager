import { describe, expect, it } from 'vitest';
import { quoteTableName } from './sqlIdentifierUtils';

describe('quoteTableName', () => {
  it('PostgreSQL: minúsculas simples ficam como estão; maiúsculas e símbolos ganham aspas', () => {
    expect(quoteTableName('public.users', 'postgres')).toBe('public.users');
    expect(quoteTableName('public.Clientes', 'postgres')).toBe('public."Clientes"');
    expect(quoteTableName('Vendas.Pedidos', 'postgres')).toBe('"Vendas"."Pedidos"');
    expect(quoteTableName('public.itens-venda', 'postgres')).toBe('public."itens-venda"');
    expect(quoteTableName('public.1tabela', 'postgres')).toBe('public."1tabela"');
  });

  it('palavras reservadas comuns também são citadas', () => {
    expect(quoteTableName('public.user', 'postgres')).toBe('public."user"');
    expect(quoteTableName('order', 'mysql')).toBe('`order`');
  });

  it('Oracle: maiúsculas simples ficam como estão; nomes em minúsculas ou mistos ganham aspas', () => {
    expect(quoteTableName('PCPEDC', 'oracle')).toBe('PCPEDC');
    expect(quoteTableName('WINT.PCPEDC', 'oracle')).toBe('WINT.PCPEDC');
    expect(quoteTableName('MinhaTabela', 'oracle')).toBe('"MinhaTabela"');
    expect(quoteTableName('TB_X$1', 'oracle')).toBe('TB_X$1');
  });

  it('MySQL usa crases', () => {
    expect(quoteTableName('users', 'mysql')).toBe('users');
    expect(quoteTableName('meu-banco.itens venda', 'mysql')).toBe('`meu-banco`.`itens venda`');
  });

  it('não duplica aspas já presentes e escapa aspas internas', () => {
    expect(quoteTableName('public."Clientes"', 'postgres')).toBe('public."Clientes"');
    expect(quoteTableName('public.a"b', 'postgres')).toBe('public."a""b"');
  });
});
