import { QaCorePayloadItem, QaCoreSearchMode } from '../../../shared/types';

/**
 * Valida se o termo informado para a busca é válido para o modo selecionado.
 */
export function validateSearchTerm(
  mode: QaCoreSearchMode,
  term: string,
  codFilial?: string
): { isValid: boolean; message?: string } {
  if (mode === 'recent') {
    return { isValid: true };
  }

  const trimmed = term.trim();
  if (!trimmed) {
    switch (mode) {
      case 'cgcEnt':
        return { isValid: false, message: 'Informe o CPF ou CNPJ do consumidor.' };
      case 'cupom':
        return { isValid: false, message: 'Informe o número do cupom fiscal.' };
      case 'chave':
        return { isValid: false, message: 'Informe a chave da NFC-e/NF-e.' };
      case 'idExterno':
        return { isValid: false, message: 'Informe o ID externo ou interno da transação.' };
      default:
        return { isValid: false, message: 'Informe o termo de busca.' };
    }
  }

  if (mode === 'cgcEnt') {
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 9) {
      return { isValid: false, message: 'O CPF/CNPJ deve conter no mínimo 9 dígitos numéricos.' };
    }
  }

  if (mode === 'chave') {
    const cleanChave = trimmed.replace(/\D/g, '');
    if (cleanChave.length > 0 && cleanChave.length !== 44) {
      return { isValid: false, message: 'A chave SEFAZ deve conter exatamente 44 dígitos.' };
    }
  }

  return { isValid: true };
}

/**
 * Formata um resumo legível de uma transação encontrada em PCINTEGRACAOCORE.
 */
export function formatPayloadSummary(item: QaCorePayloadItem): {
  badge: string;
  title: string;
  subtitle: string;
  valueDisplay: string;
} {
  const cupom = item.numCupom ? `Cupom #${item.numCupom}` : 'Venda';
  const filial = item.codFilial ? `Filial ${item.codFilial}` : '';
  const badge = [cupom, filial].filter(Boolean).join(' • ');

  const title = item.cliente || (item.cgcEnt ? `CPF/CNPJ ${item.cgcEnt}` : 'Consumidor Final');

  const origem = item.pdvOrigem || 'Integração';
  const data = item.data ? new Date(item.data).toLocaleString('pt-BR') : '';
  const subtitle = [origem, data].filter(Boolean).join(' | ');

  let valueDisplay = '';
  if (item.vlTotal !== undefined && item.vlTotal !== null && item.vlTotal !== '') {
    const num = Number(item.vlTotal);
    if (!isNaN(num)) {
      valueDisplay = num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    } else {
      valueDisplay = `R$ ${item.vlTotal}`;
    }
  }

  return { badge, title, subtitle, valueDisplay };
}
