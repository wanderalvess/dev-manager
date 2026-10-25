import React from 'react';
import type { FaqItem } from '../helpData';

/** Rastreio de Integração ponta a ponta (decisão 0003): por enquanto só a configuração; pré-voo e linha do tempo chegam nas próximas fases. */
export function getIntegrationTraceFaq(): FaqItem[] {
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
            outros segredos, e a interface só mostra &quot;salvo e protegido&quot;. O pré-voo das camadas e a linha do tempo do lote
            estão sendo construídos sobre esse catálogo; a decisão completa está em{' '}
            <code className="font-mono text-primary">docs/decisions/0003</code> do repositório.
          </p>
        </div>
      )
    }
  ];
}
