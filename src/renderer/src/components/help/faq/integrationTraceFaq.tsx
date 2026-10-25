import React from 'react';
import type { FaqItem } from '../helpData';

/** Rastreio de Integração ponta a ponta (decisão 0003): configuração e pré-voo das camadas; a linha do tempo do lote chega na próxima fase. */
export function getIntegrationTraceFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'integration-trace-config',
      question: 'O que é a aba "Integração ponta a ponta" das Configurações e o que preencher nela?',
      category: 'Segurança & Configurações',
      tags: ['integracao', 'ponta a ponta', 'rastreio', 'winthor', 'wsh', 'smart hub', 'commerce hub', 'ch', 'pdv', 'lote', 'fluxo', 'jolt'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            É o catálogo usado pelo <strong className="text-foreground">Rastreio de Integração</strong>: a cadeia
            WinThor → WSH (Winthor Smart Hub) → CH (Commerce Hub) → PDV. Ele serve para o Hub confirmar que cada camada está de pé
            antes de um teste e, depois, seguir um lote do CH passo a passo até o PDV, mostrando onde quebrou.
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-foreground">Camadas da integração:</strong> para cada uma (WinThor, WSH, CH, PDV), como o Hub a
              alcança e observa na sua máquina: URL base e caminho de health, porta TCP, serviço Windows ou processo, conexão do
              DB Studio (Oracle no WinThor, Postgres no PDV), arquivo de log e autenticação. Tudo é opcional; o que ficar vazio é
              pulado, nunca inventado.
            </li>
            <li>
              <strong className="text-foreground">Fluxos do WSH:</strong> um por fluxo que você testa (ex.: venda), com o tipo de lote
              que ele abre no CH, como disparar pela API do WSH, a API do WinThor que ele chama e a consulta no Postgres que prova a
              chegada no PDV. As consultas aceitam os binds <code className="font-mono text-primary">:lote</code>,{' '}
              <code className="font-mono text-primary">:inicio</code> e <code className="font-mono text-primary">:fim</code>.
            </li>
          </ul>
          <p>
            Senhas e tokens das camadas ficam criptografados no <code className="font-mono text-primary">config.json</code>, como os
            outros segredos, e a interface só mostra &quot;salvo e protegido&quot;. Com o catálogo preenchido, use a página{' '}
            <strong className="text-foreground">Rastreio de Integração</strong> para o pré-voo; a decisão completa está em{' '}
            <code className="font-mono text-primary">docs/decisions/0003</code> do repositório.
          </p>
        </div>
      )
    },
    {
      id: 'integration-trace-readiness',
      question: 'O que o pré-voo do Rastreio de Integração confere e o que significam Pronta, Com aviso e Com falha?',
      category: 'Segurança & Configurações',
      tags: ['pré-voo', 'pre-voo', 'rastreio', 'integracao', 'winthor', 'wsh', 'ch', 'pdv', 'health', 'porta', 'serviço', 'login', 'conferir'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            O botão <strong className="text-foreground">Conferir agora</strong> verifica, em paralelo, cada camada que você preencheu
            em <strong className="text-foreground">Configurações → Integração ponta a ponta</strong>. Para cada uma ele testa só o que
            existe no cadastro:
          </p>
          <ul className="list-disc pl-4 space-y-1.5">
            <li><strong className="text-foreground">Serviço e processo:</strong> o serviço Windows está em execução e o processo está aberto.</li>
            <li><strong className="text-foreground">Rede:</strong> o caminho de health responde com sucesso; sem ele, o Hub testa só a porta (a da URL ou a informada).</li>
            <li><strong className="text-foreground">Login do WinThor:</strong> na camada WinThor com autenticação &quot;Login do WinThor&quot;, o Hub faz o login real e confirma que um token foi emitido (o token não é exibido nem guardado).</li>
            <li><strong className="text-foreground">Banco:</strong> a conexão do DB Studio escolhida (Oracle no WinThor, Postgres no PDV) conecta.</li>
            <li><strong className="text-foreground">Log:</strong> o arquivo existe; mostra a última escrita e o tamanho.</li>
          </ul>
          <p>
            <strong className="text-success">Pronta</strong>: tudo que foi conferido passou.{' '}
            <strong className="text-warning">Com aviso</strong>: nada falhou, mas algo não pôde ser provado (URL sem caminho de health,
            login sem usuário ou senha, log que ainda não existe).{' '}
            <strong className="text-danger">Com falha</strong>: uma verificação falhou; o detalhe diz qual e por quê.{' '}
            <strong className="text-foreground">Não configurada</strong>: a camada está em branco e é ignorada. Cada verificação tem
            limite de 12 segundos, então uma camada travada não segura o resultado das outras.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('integration-trace')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Rastreio de Integração
            </button>
          )}
        </div>
      )
    }
  ];
}
