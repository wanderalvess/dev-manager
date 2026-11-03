// Seções da tela de Configurações: rótulo, grupo do menu lateral e a frase que abre cada uma.

export type SettingsTab =
  | 'overview'
  | 'dirs'
  | 'karaf'
  | 'routines'
  | 'azure'
  | 'backup'
  | 'ai'
  | 'quality'
  | 'debug'
  | 'ports'
  | 'logs'
  | 'integration'
  | 'appearance'
  | 'usage';

export interface SettingsSectionDef {
  id: SettingsTab;
  label: string;
  description: string;
  /** Seção que só interessa a quem usa o recurso: o menu marca como "opcional" enquanto estiver vazia. */
  optional?: boolean;
}

export interface SettingsSectionGroup {
  /** Grupo sem título fica no topo do menu (Visão geral). */
  title: string | null;
  sections: SettingsTab[];
}

export const SETTINGS_SECTIONS: Record<SettingsTab, SettingsSectionDef> = {
  overview: { id: 'overview', label: 'Visão geral', description: 'O que já está pronto, o que falta e onde mexer. Cada ajuste mora em um lugar só.' },
  dirs: { id: 'dirs', label: 'Caminhos & IDE', description: 'Onde ficam seus projetos, o Java e o editor que o Hub abre.' },
  karaf: { id: 'karaf', label: 'Karaf', description: 'Onde o servidor OSGi roda, onde está instalado e como o Hub entra nele.' },
  routines: {
    id: 'routines',
    label: 'WinThor & CCW',
    description: 'Rotinas locais, login automático no WTA e download de rotinas pela Central de Controle.'
  },
  azure: {
    id: 'azure',
    label: 'Git & Azure DevOps',
    description: 'Branch dos pull requests, acesso ao dev.azure.com e onde salvar os artefatos de pipeline.'
  },
  backup: { id: 'backup', label: 'Banco & Backup', description: 'As ferramentas de linha de comando que o Hub usa para fazer e restaurar backups.' },
  ai: { id: 'ai', label: 'IA & LLM', description: 'O motor que responde no Hub: Docs, análise de logs e explicações de SQL. Use a sua própria chave.' },
  quality: {
    id: 'quality',
    label: 'Qualidade & QA',
    description: 'O projeto de testes automatizados e de onde vêm os casos de teste e bugs.',
    optional: true
  },
  debug: {
    id: 'debug',
    label: 'Preparação do debug',
    description: 'O que o Hub faz quando você prepara o ambiente: serviços, processos e ações padrão, tudo num lugar só.'
  },
  ports: { id: 'ports', label: 'Portas & acesso remoto', description: 'As portas que o próprio Hub usa, as que ele vigia e o controle pelo celular.' },
  logs: { id: 'logs', label: 'Logs', description: 'Os arquivos que a página Logs acompanha ao vivo. Adicionar uma fonte lá ou aqui dá no mesmo.' },
  integration: {
    id: 'integration',
    label: 'Integração ponta a ponta',
    description: 'WinThor › WSH › Commerce Hub › PDV. Comece pelo essencial; o resto só se você for rastrear lotes.',
    optional: true
  },
  appearance: { id: 'appearance', label: 'Navegação & aparência', description: 'Quais páginas aparecem na barra lateral e como o cockpit se parece.' },
  usage: {
    id: 'usage',
    label: 'Uso & privacidade',
    description: 'O Hub conta o que você usa só neste PC, para mostrar o tempo que economizou. Nada sai daqui.'
  }
};

export const SETTINGS_SECTION_GROUPS: SettingsSectionGroup[] = [
  { title: null, sections: ['overview'] },
  { title: 'Essencial', sections: ['dirs', 'karaf', 'routines'] },
  { title: 'Conexões', sections: ['azure', 'backup', 'ai', 'quality'] },
  { title: 'Operação', sections: ['debug', 'ports', 'logs', 'integration'] },
  { title: 'Preferências', sections: ['appearance', 'usage'] }
];

/** Nomes antigos de aba (e as seções do onboarding) que ainda chegam por deep link. */
const LEGACY_TABS: Record<string, SettingsTab> = {
  services: 'debug',
  automation: 'debug',
  modules: 'appearance',
  winthor: 'routines'
};

/** Converte um id de aba (atual, antigo ou do onboarding) na seção atual; null se não existir. */
export function normalizeSettingsTab(tab: string): SettingsTab | null {
  if (tab in SETTINGS_SECTIONS) return tab as SettingsTab;
  return LEGACY_TABS[tab] ?? null;
}

/** Grupo da seção, para o rótulo "Essencial · Karaf" do cabeçalho. */
export function sectionGroupTitle(tab: SettingsTab): string | null {
  return SETTINGS_SECTION_GROUPS.find((g) => g.sections.includes(tab))?.title ?? null;
}
