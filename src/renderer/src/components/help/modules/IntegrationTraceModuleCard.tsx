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
        <strong>Monitor do WSH:</strong> filtre pelo fluxo (FLUXO-09 · Produto, FLUXO-16 · Vendas...), pelo dado (código do produto, da cobrança...) e pelo status, como no
        monitor do próprio WSH. O Hub lê a <code className="font-mono text-primary">PCINTEGRACAOCORE</code> pela conexão Oracle da camada
        WinThor, sem credencial do PDVSync, e mostra quando o item foi buscado e enviado, a resposta do PDVSync e os erros, separando o
        erro do próprio item dos erros de outros itens que derrubaram o mesmo envio. Mostra também a situação dos fluxos de que ele
        depende, apontando a causa provável (impostos vazio no Produto → ICMS). A página não rola: a lista e o item rolam cada um no seu
        quadro, e o percurso começa recolhido numa faixa; <em>Ver animação</em> abre a animação completa.
      </span>
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
        devolve o mesmo pré-voo, e <code className="font-mono text-primary">integration_check_batch</code> rastreia um lote e devolve
        o relatório pronto para o Jira.
      </span>
      <span>
        <strong>Rastrear lote:</strong> para um fluxo de saída (produto, preço, estoque...), informe o número do lote e o Hub
        procura onde consegue: o lote e o status de cada loja na API do PDVSync, a chegada no banco do PDV por consulta SQL
        (esperando o dado descer), a retaguarda Oracle, a chamada da API do WinThor no APM e as linhas dos logs do WSH e do CH
        que citam o lote. Os oito passos aparecem como <em>ok</em>, <em>falhou</em>, <em>pendente</em> ou <em>sem evidência</em>,
        com o passo em que quebrou em destaque, histórico dos últimos 50 e o botão <em>Copiar relatório (Jira)</em>.
      </span>
      <span>
        <strong>Percurso do lote:</strong> uma vista animada mostra o lote andando até as lojas e parando onde quebrou, com{' '}
        <em>Replay</em>, <em>Vista 3D</em> e clique em cada loja para ver os erros. Enquanto as lojas ainda baixam, o{' '}
        <em>modo ao vivo</em> reconsulta o PDVSync a cada 15 s até a chegada terminar.
      </span>
      <span>
        <strong>O que o Hub não enxerga:</strong> login no WinThor, JOLT, login no PDVSync e envio acontecem dentro do WSH e ficam
        <em>sem evidência</em>. A venda é de entrada (PDV → WinThor), não usa lote e ainda não tem rastreio.
      </span>
    </ModuleBullets>
  </ModuleCardShell>
);
