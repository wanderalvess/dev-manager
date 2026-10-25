import React from 'react';
import { Route } from 'lucide-react';
import { ModuleBullets, ModuleCardShell, ModuleNavButton, type ModuleCardProps } from './ModuleCardShell';

export const IntegrationTraceModuleCard: React.FC<ModuleCardProps> = ({ onNavigate }) => (
  <ModuleCardShell
    icon={<Route className="w-4 h-4" />}
    iconBoxClass="p-2 rounded-xl bg-primary/10 text-primary"
    title="14. Rastreio de Integração"
    subtitle="WinThor → WSH → CH → PDV · menu lateral e Ctrl+K"
    footer={
      <ModuleNavButton
        onNavigate={onNavigate}
        target="integration-trace"
        colorClass="bg-primary/10 hover:bg-primary/20 text-primary"
        label="Abrir Rastreio de Integração"
      />
    }
  >
    <ModuleBullets
      intro="Descubra em qual ponta da cadeia a integração quebra, sem conferir cada camada à mão:"
      checkClass="text-primary"
    >
      <span>
        <strong>Pré-voo das camadas:</strong> o botão <em>Conferir agora</em> verifica WinThor, WSH, CH e PDV em paralelo:
        serviço Windows, processo, porta, health HTTP, login do WinThor, conexão Oracle/Postgres e arquivo de log. Cada
        camada aparece como <em>Pronta</em>, <em>Com aviso</em>, <em>Com falha</em> ou <em>Não configurada</em>, com o detalhe e o
        tempo de cada verificação.
      </span>
      <span>
        <strong>Só o que você preencheu:</strong> as camadas e os fluxos ficam em <em>Configurações → Integração ponta a
        ponta</em>. O que estiver em branco é ignorado, e uma verificação que não dá para provar aparece como aviso, nunca
        como ok.
      </span>
      <span>
        <strong>Pelo assistente de IA:</strong> a tool MCP <code className="font-mono text-primary">integration_check_readiness</code>{' '}
        devolve o mesmo pré-voo, com um resumo dizendo se o ambiente está pronto para testar.
      </span>
      <span>
        <strong>Em construção:</strong> a linha do tempo de um lote, do disparo do fluxo até a chegada no PDV, vem nas próximas
        versões.
      </span>
    </ModuleBullets>
  </ModuleCardShell>
);
