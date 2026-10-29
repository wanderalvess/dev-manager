import { describe, expect, it } from 'vitest';
import { parseOrderRejection } from './orderRejection';

// Formatos vistos na PCLOGPEDIDOAPI de um banco real (2026-10-29), com números trocados
describe('motivo da recusa de um pedido online', () => {
  it('(código) -> mensagem { [detalhe] }, inclusive código sem número e TotvsError dentro do detalhe', () => {
    expect(parseOrderRejection('(WT-IM-0000239) -> Pedido HUB ou Market Place já incluído.  { [] }')).toEqual({
      code: 'WT-IM-0000239',
      message: 'Pedido HUB ou Market Place já incluído.'
    });
    expect(parseOrderRejection('(WPV-PDVSYNC) -> Produto não aceita pedido com quantidade fracionada. Posição do item 1; Quantidade: 1.50  { [] }')).toEqual({
      code: 'WPV-PDVSYNC',
      message: 'Produto não aceita pedido com quantidade fracionada. Posição do item 1; Quantidade: 1.50'
    });
    expect(parseOrderRejection('(WT-IM-000123) -> Informações de pagamento  { [Pedido sem informações de pagamento.] }')).toEqual({
      code: 'WT-IM-000123',
      message: 'Informações de pagamento',
      detail: 'Pedido sem informações de pagamento.'
    });
    const nested = parseOrderRejection(
      "(WT-IM-000110) -> Erro ao validar itens  { [TotvsError[code=WT-IM-000111, message='Campo obrigatório não pode ser nulo', detailedMessage='O email da nota fiscal é obrigatório', helpUrl='null', details=[]]] }"
    );
    expect(nested).toEqual({ code: 'WT-IM-000110', message: 'Erro ao validar itens', detail: 'Campo obrigatório não pode ser nulo: O email da nota fiscal é obrigatório' });
  });

  it('TotvsError[...] solto', () => {
    expect(
      parseOrderRejection("TotvsError[code=WT-IM-000294, message='Pedido já Faturado', detailedMessage='O pedido 100 já se encontra faturado no WinThor', helpUrl='null', details=[]]")
    ).toEqual({ code: 'WT-IM-000294', message: 'Pedido já Faturado', detail: 'O pedido 100 já se encontra faturado no WinThor' });
  });

  it('erro de SQL do WTA: tabela e ORA do fim; ORA-00904 explica banco mais antigo que o WTA', () => {
    const sql =
      'PreparedStatementCallback; bad SQL grammar [INSERT INTO PCNFCANITEM\n  (NUMORCA, MOTIVO, ORIGEMINTEGRACAO)\n  (SELECT ...)]; nested exception is java.sql.SQLSyntaxErrorException: ORA-00904: "ORIGEMINTEGRACAO": identificador inválido\n';
    expect(parseOrderRejection(sql)).toEqual({
      code: 'ORA-00904',
      message: 'Erro de SQL no WTA ao gravar PCNFCANITEM (ORA-00904: "ORIGEMINTEGRACAO": identificador inválido)',
      detail: 'Coluna que o WTA espera não existe neste banco: o banco está mais antigo que a versão do WTA.'
    });
  });

  it('texto simples fica como veio; JSON não é motivo', () => {
    expect(parseOrderRejection('O orçamento 100 já foi cancelado anteriormente.')).toEqual({ message: 'O orçamento 100 já foi cancelado anteriormente.' });
    expect(parseOrderRejection('{"numero":"1"}')).toBeUndefined();
  });
});
