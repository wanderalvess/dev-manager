import React from 'react';
import { Square } from 'lucide-react';
import type { FaqItem } from '../helpData';

export function getDeployCancellationFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'deploy-terminal-interrupt',
      question: 'Como cancelar uma etapa de deploy ou interromper comandos como log:tail no console?',
      category: 'Deploy & Terminal',
      tags: ['cancelar', 'interromper', 'abortar', 'log:tail', 'log:display', 'ctrl+c', 'etapas', 'deploy', 'terminal', 'console'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O Hub Manager oferece controle completo para interromper comandos em execução contínua e cancelar etapas de deploy:
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-xs">
            <span className="font-semibold text-foreground block text-xs text-primary">
              1. Interromper Comandos no Terminal (Ctrl+C / Interromper):
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Botão Interromper:</strong> Na barra de ferramentas do terminal ou no campo de comando (botão <code className="font-mono text-primary font-bold">^C</code>), clique em <strong className="text-destructive font-semibold">Interromper</strong>.
              </li>
              <li>
                <strong className="text-foreground">Atalhos de Teclado:</strong> Com o cursor no campo de comando do terminal, pressione <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-2xs text-foreground font-bold shadow-2xs">Ctrl+C</kbd> ou <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border font-mono text-2xs text-foreground font-bold shadow-2xs">Esc</kbd> para enviar o sinal de interrupção (SIGINT / ETX).
              </li>
              <li>
                <strong className="text-foreground">Dica para logs do Karaf:</strong> Prefira usar <code className="font-mono text-primary font-bold">log:display</code> (que exibe as últimas linhas e encerra) em vez de <code className="font-mono text-primary font-bold">log:tail</code> (que mantém streaming infinito).
              </li>
            </ul>

            <span className="font-semibold text-foreground block pt-1 text-xs text-primary">
              2. Cancelar Execução de Etapas de Deploy:
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">No Cabeçalho:</strong> Enquanto um perfil ou etapa estiver rodando, o botão principal se transforma em <strong className="text-destructive font-semibold">Cancelar</strong> com ícone de parada (<Square className="w-3 h-3 inline text-destructive fill-current" />).
              </li>
              <li>
                <strong className="text-foreground">No Card da Etapa:</strong> Ao executar uma ação avulsa em qualquer etapa do perfil, o botão da própria etapa se torna <strong className="text-destructive font-semibold">Cancelar</strong>, permitindo cancelar a compilação Maven, build/push Docker ou comando Karaf a qualquer momento.
              </li>
              <li>
                <strong className="text-foreground">Finalização de Processos:</strong> O cancelamento aborta a árvore de processos filhos (Maven, Docker CLI, Karaf Client) garantindo que nenhum processo órfão continue consumindo CPU ou memória.
              </li>
            </ul>
          </div>
          {onNavigate && (
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => onNavigate('environment')}
                className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Abrir Ambiente Dev
              </button>
              <span className="text-muted-foreground/60">·</span>
              <button
                type="button"
                onClick={() => onNavigate('deploy')}
                className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Abrir Deploy
              </button>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'deploy-dependency-chain',
      question: 'Como funciona a Cadeia Multi-Módulos de Dependências Maven/OSGi?',
      category: 'Deploy & Terminal',
      tags: ['cadeia', 'dependencias', 'pom.xml', 'versao', 'multi-camadas', 'venda', 'pedido', 'varejo', 'deploy', 'maven'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Módulos WinThor frequentemente possuem dependências em cascata (ex: <code className="font-mono text-primary">winthor-venda</code> &rarr; <code className="font-mono text-primary">winthor-pedido-venda</code> &rarr; <code className="font-mono text-primary">winthor-integracao-varejo</code>).
          </p>
          <div className="p-3 rounded-xl bg-card/80 border border-border space-y-2 shadow-xs">
            <span className="font-semibold text-foreground block text-xs text-primary">
              Automação do Pipeline de Dependências:
            </span>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <strong className="text-foreground">Assistente Visual:</strong> Clique no botão <strong className="text-primary">Cadeia Multi-Módulos</strong> no topo da página de Deploy para ordenar os projetos da camada base até o alvo final.
              </li>
              <li>
                <strong className="text-foreground">Sincronização Cirúrgica de Versão:</strong> O sistema compila o projeto upstream via <code className="font-mono text-primary">mvn clean install</code>, detecta a versão gerada e atualiza automaticamente a tag <code className="font-mono text-primary">&lt;version&gt;</code> correspondente no <code className="font-mono text-foreground">pom.xml</code> do projeto seguinte antes de compilá-lo.
              </li>
              <li>
                <strong className="text-foreground">Backup Automático:</strong> Gera arquivo <code className="font-mono text-foreground">.bak</code> de proteção para você reverter qualquer alteração com segurança.
              </li>
              <li>
                <strong className="text-foreground">Deploy no Karaf:</strong> O último nó pode publicar diretamente as features atualizadas no Karaf local.
              </li>
            </ul>
          </div>
        </div>
      )
    }
  ];
}
