import React from 'react';
import { CheckCheck } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const QualityModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<CheckCheck className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    title="11. Central de Qualidade (QA &amp; PO)"
    subtitle="Matriz de Testes · Critérios de Aceite · Prontidão"
    shortcut="Alt+Q"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="quality"
        colorClass="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
        label="Abrir Central de Qualidade"
      />
    }
  >
    <ModuleBullets
      intro="Hub de apoio e orquestração para testes de software, homologação de rotinas e acompanhamento de releases:"
      checkClass="text-emerald-400"
    >
      <span><strong>Automação TAUT (Cypress):</strong> Painel integrado de testes de API e integração com seletor de tags (@cypress/grep), execução headless ou interativa (cy:open), streaming de console, sincronização de .env com o Oracle ativo, auditoria de cobertura Zephyr Scale (COVERAGE.md) e processamento automatizado de CSVs de intake.</span>
      <span><strong>Test Runners &amp; Automação:</strong> Disparo e streaming em tempo real de testes unitários e de integração (Maven / JUnit / Mockito), testes web E2E (Playwright / Cypress) e coleções de API REST (Newman / Postman) com sincronização automática na Matriz de Validação.</span>
      <span><strong>Validador Regressivo Oracle (QA Studio):</strong> Execução automatizada de esteiras de queries e asserções de integridade no banco (com templates prontos para Venda PDV, Pré-Venda Balcão TV7/TV8, Sangria/Suprimento de Caixa, Inutilização de NFC-e, Kits/Cestas e Cancelamento), com obtenção direta de payloads JSON via banco Oracle (<code className="font-mono text-primary">PCINTEGRACAOCORE</code> / <code className="font-mono text-primary">DADOSTRANSFORMADOS</code>) ou por requisições HTTP a <code className="font-mono text-primary">APIs REST externas</code> (com Bearer tokens e JSONPath), preenchimento automático de binds, exportação/importação de templates (.json) e geração de evidências para o Jira. A suíte só é aprovada se houver asserções e todas puderem ser verificadas (JSON inválido ou JSONPath sem payload reprovam).</span>
      <span><strong>Matriz de Validação:</strong> Acompanhamento manual de testes funcionais, serviços e APIs, salvo apenas neste navegador. Os cenários iniciais são modelos e nascem como pendentes; a sincronização com Zephyr/Jira/Azure ainda não está implementada.</span>
      <span><strong>Painel de Prontidão (PO):</strong> Indicadores de prontidão da release e semáforo de entrega para tomadores de decisão.</span>
      <span><strong>Exportação Markdown:</strong> Cópia de relatórios de homologação em 1 clique para Teams, Jira e Azure DevOps.</span>
    </ModuleBullets>
  </ModuleCardShell>
);
