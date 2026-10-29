import React from 'react';
import { CheckCheck } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const QualityModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<CheckCheck className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-success/10 text-success"
    title="11. Central de Qualidade (QA &amp; PO)"
    subtitle="Matriz de Testes · Critérios de Aceite · Prontidão · Validação de Cenários"
    shortcut="Alt+Q"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="quality"
        colorClass="bg-success/10 hover:bg-success/20 text-success"
        label="Abrir Central de Qualidade"
      />
    }
  >
    <ModuleBullets
      intro="Hub de apoio e orquestração para testes de software, homologação de rotinas e acompanhamento de releases:"
      checkClass="text-success"
    >
      <span><strong>TAUT (Cypress):</strong> Painel integrado de testes de API e integração com seletor de tags (@cypress/grep), execução headless ou interativa (cy:open), streaming de console, sincronização de .env com o Oracle ativo, auditoria de cobertura Zephyr Scale (COVERAGE.md) e processamento automatizado de CSVs de intake.</span>
      <span><strong>Test Runners:</strong> Disparo e streaming em tempo real de testes unitários e de integração (Maven / JUnit / Mockito), testes web E2E (Playwright / Cypress) e coleções de API REST (Newman / Postman) com sincronização automática na Matriz de Validação.</span>
      <span><strong>Validador Regressivo Oracle (QA Studio):</strong> Execução automatizada de esteiras de queries e asserções de integridade no banco (com templates prontos para Venda PDV, Pré-Venda Balcão TV7/TV8, Sangria/Suprimento de Caixa, Inutilização de NFC-e, Kits/Cestas e Cancelamento), com obtenção direta de payloads JSON via banco Oracle (<code className="font-mono text-primary">PCINTEGRACAOCORE</code> / <code className="font-mono text-primary">DADOSTRANSFORMADOS</code>) ou por requisições HTTP a <code className="font-mono text-primary">APIs REST externas</code> (com Bearer tokens e JSONPath), preenchimento automático de binds, exportação/importação de templates (.json) e geração de evidências para o Jira. A suíte só é aprovada se houver asserções e todas puderem ser verificadas (JSON inválido ou JSONPath sem payload reprovam).</span>
      <span><strong>Matriz:</strong> Acompanhamento manual de testes funcionais, serviços e APIs, salvo apenas neste navegador. Os cenários iniciais são modelos e nascem como pendentes; a sincronização com Zephyr/Jira/Azure ainda não está implementada.</span>
      <span><strong>Prontidão (PO):</strong> Indicadores de prontidão da release, semáforo de entrega (nunca "pronta" com falhas, bloqueios ou pendências) e progresso por categoria, tudo calculado a partir da Matriz de Validação.</span>
      <span><strong>Validação de Cenários:</strong> Página própria com um cenário por aba, pensada para receber outros cenários. O primeiro, <strong>Bloqueio de Login</strong>, valida em homologação as 12 regras de bloqueio do login do WinThor com tentativas controladas contra o WTA e dois usuários de teste: bloqueio só na 5ª falha, senha certa sem token durante o bloqueio, outro cliente, bloqueio por usuário, logoff, falhas simultâneas, duração (4 ou 5 min), janela de contagem, exceções de APIs diferentes, exposição de erro e a correlação de cada falha com o <code className="font-mono text-primary">winthor.log</code> e a API <code className="font-mono text-primary">/winthor/ferramenta/servidor/v1/logs</code> (acesso restrito e nenhuma senha registrada). O segundo, <strong>Validação de API</strong>, chama uma API (com o login do WTA de Configurações, se precisar) e confronta o status e os campos do JSON da resposta com o esperado, regra a regra. Relatório em Markdown para o Jira nos dois.</span>
      <span><strong>Exportação Markdown:</strong> Cópia de relatórios de homologação em 1 clique para Teams, Jira e Azure DevOps.</span>
    </ModuleBullets>
  </ModuleCardShell>
);
