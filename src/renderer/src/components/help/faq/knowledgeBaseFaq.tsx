import React from 'react';
import type { FaqItem } from '../helpData';

export function getKnowledgeBaseFaq(): FaqItem[] {
  return [
    {
      id: 'kb-shared-base',
      question: 'Como conecto o Hub à Base de Conhecimento compartilhada e importo o prompt-hub?',
      category: 'IA & Documentação',
      tags: ['base de conhecimento', 'agile space', 'prompt-hub', 'tdn', 'mcp', 'kb', 'chave de api', 'importar', 'divergências'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            A base reúne a documentação das APIs Java (mapeadas do código), as páginas do TDN, prompts e skills no servidor do
            Agile Space. Em <strong className="text-foreground">Configurações → IA &amp; LLM → Base de Conhecimento (Agile Space)</strong>:
          </p>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>Marque <strong className="text-foreground">Usar a Base de Conhecimento</strong>, informe a <strong className="text-foreground">URL do servidor</strong> e a <strong className="text-foreground">Chave de API</strong>. A chave precisa dos escopos <code className="font-mono text-primary font-bold">KNOWLEDGE_READ</code> e <code className="font-mono text-primary font-bold">KNOWLEDGE_WRITE</code> e é criada por um administrador do Agile Space.</li>
            <li>Informe a pasta onde o repositório <strong className="text-foreground">prompt-hub</strong> está clonado e salve as configurações.</li>
            <li><strong className="text-foreground">Testar conexão</strong> confere a URL e a chave; <strong className="text-foreground">Importar prompt-hub</strong> envia os documentos em lotes, e o servidor só grava o que mudou.</li>
          </ol>
          <p>
            Depois disso, as tools MCP <code className="font-mono text-primary font-bold">kb_search</code>,{' '}
            <code className="font-mono text-primary font-bold">kb_ask_context</code> e{' '}
            <code className="font-mono text-primary font-bold">kb_list_divergences</code> deixam a sua IA consultar a base e comparar
            o que o código faz com o que o TDN diz. Se a chave for recusada, confira os escopos; se trocar a URL, digite a chave de novo.
          </p>
          <p>
            A importação envia documentação de código e do TDN para o servidor configurado. Confirme que o destino está autorizado
            para esse conteúdo antes de importar.
          </p>
        </div>
      )
    }
  ];
}
