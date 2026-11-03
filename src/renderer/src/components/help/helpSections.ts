// Seções da Central de Ajuda: rótulo, grupo do menu lateral e a frase que abre cada uma.

export type HelpCategory = 'overview' | 'modules' | 'guides' | 'faq' | 'shortcuts' | 'about';

export interface HelpSectionDef {
  id: HelpCategory;
  label: string;
  description: string;
}

export interface HelpSectionGroup {
  /** Grupo sem título fica no topo do menu (Visão geral). */
  title: string | null;
  sections: HelpCategory[];
}

export const HELP_SECTIONS: Record<HelpCategory, HelpSectionDef> = {
  overview: {
    id: 'overview',
    label: 'Visão geral',
    description: 'Por onde começar, o fluxo do dia a dia, os módulos e as portas que o Hub usa neste PC.'
  },
  modules: {
    id: 'modules',
    label: 'Guia dos módulos',
    description: 'O que cada módulo faz, com o atalho de teclado e os recursos que ele traz.'
  },
  guides: {
    id: 'guides',
    label: 'Guias passo a passo',
    description: 'Como as peças funcionam juntas, não só onde clicar. Um guia por vez.'
  },
  faq: {
    id: 'faq',
    label: 'Resolver problemas',
    description: 'Escolha o assunto ou digite a mensagem de erro. Cada resposta traz o passo a passo.'
  },
  shortcuts: {
    id: 'shortcuts',
    label: 'Atalhos & dicas',
    description: 'Teclas que levam direto a cada tela e comandos prontos para copiar.'
  },
  about: {
    id: 'about',
    label: 'Sobre & diagnóstico',
    description: 'Versão, atualização, uso de memória e o diagnóstico para anexar a um chamado.'
  }
};

export const HELP_SECTION_GROUPS: HelpSectionGroup[] = [
  { title: null, sections: ['overview'] },
  { title: 'Aprender', sections: ['modules', 'guides'] },
  { title: 'Suporte', sections: ['faq'] },
  { title: 'Referência', sections: ['shortcuts', 'about'] }
];

/** Grupo da seção, para o rótulo "Aprender · Guia dos módulos" do cabeçalho. */
export function helpSectionGroupTitle(id: HelpCategory): string | null {
  return HELP_SECTION_GROUPS.find((g) => g.sections.includes(id))?.title ?? null;
}
