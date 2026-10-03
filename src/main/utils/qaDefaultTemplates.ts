import { QaRegressionTemplate } from '../../shared/types';
import { getTemplateVendaPdv } from './qaTemplates/templateVendaPdv';
import { getTemplateCancelamento } from './qaTemplates/templateCancelamento';
import { getTemplateKitCesta } from './qaTemplates/templateKitCesta';
import { getTemplatePreVendaTv7Tv8 } from './qaTemplates/templatePreVendaTv7Tv8';
import { getTemplateMovimentacaoCaixa } from './qaTemplates/templateMovimentacaoCaixa';
import { getTemplateInutilizacaoNfce } from './qaTemplates/templateInutilizacaoNfce';

/**
 * Templates padrão de validação regressiva pré-configurados com a esteira
 * de testes do WinThor / PDV Omni / WSH Mississauga.
 */
export function getDefaultQaTemplates(): QaRegressionTemplate[] {
  const now = new Date().toISOString();

  return [
    getTemplateVendaPdv(now),
    getTemplateCancelamento(now),
    getTemplateKitCesta(now),
    getTemplatePreVendaTv7Tv8(now),
    getTemplateMovimentacaoCaixa(now),
    getTemplateInutilizacaoNfce(now)
  ];
}
