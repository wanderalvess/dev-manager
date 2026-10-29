import React from 'react';
import type { FaqItem } from '../helpData';

// Fora de helpData.tsx (que já passa do teto de linhas): FAQ de ligar/desligar módulos da navegação.
export function getModulesFaq(onNavigate?: (tab: string) => void): FaqItem[] {
  return [
    {
      id: 'modules-toggle',
      question: 'Como esconder páginas que eu não uso (ligar/desligar módulos)?',
      category: 'Configurações',
      tags: ['módulos', 'modulos', 'páginas', 'esconder', 'ocultar', 'desligar', 'navegação', 'cabeçalho', 'perfil'],
      answer: (
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            Em <strong className="text-foreground">Configurações → Módulos</strong>, ligue ou desligue cada página, agrupada pelos
            mesmos 4 grupos do cabeçalho, e clique em <strong className="text-foreground">Salvar</strong>. Use{' '}
            <strong className="text-foreground">Ligar todos</strong> para voltar ao padrão.
          </p>
          <p>
            Página desligada some do cabeçalho (o grupo inteiro some se ficar vazio), da busca rápida (Ctrl+K) e do tour inicial, e o
            atalho Alt+N dela deixa de navegar. Com o Catálogo de Rotinas ou o Git desligados, a busca rápida também deixa de listar
            rotinas ou repositórios. Nada é apagado: configurações e dados do módulo continuam salvos para quando você religá-lo.
          </p>
          <p>
            Pelo menos uma página fica sempre ligada; a Central de Ajuda e as Configurações não podem ser desligadas. Se você desligar a
            página em que está, o app abre a primeira página ligada.
          </p>
          <p>
            Para ganhar espaço sem desligar nada, use <strong className="text-foreground">Recolher menu</strong> no pé do menu lateral:
            ele vira uma faixa de ícones, com o nome e o atalho no tooltip. A escolha fica salva nesta máquina.
          </p>
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('settings')}
              className="text-2xs font-semibold text-primary hover:underline cursor-pointer"
            >
              Abrir Configurações
            </button>
          )}
        </div>
      )
    }
  ];
}
