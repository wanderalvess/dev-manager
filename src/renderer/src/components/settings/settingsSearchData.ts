export type SettingsTab = 'dirs' | 'karaf' | 'azure' | 'services' | 'ports' | 'automation' | 'logs' | 'backup' | 'ai';

export interface SettingsSearchEntry {
  id: string;
  tab: SettingsTab;
  tabLabel: string;
  label: string;
  keywords: string;
}

/** Índice curado de campos-chave para a busca da tela de Configurações (não cobre 100% dos campos). */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  { id: 'field-appPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório Raiz das Rotinas / Binários (Prod)', keywords: 'app path diretorio pasta rotinas binarios prod' },
  { id: 'field-karafPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório do Apache Karaf', keywords: 'karaf path diretorio pasta osgi' },
  { id: 'field-jdkPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório do JDK', keywords: 'jdk java path diretorio' },
  { id: 'field-intellijPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Executável do IntelliJ / IDE', keywords: 'intellij ide editor idea' },
  { id: 'field-projectsPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório de Projetos', keywords: 'projetos path diretorio workspace' },
  { id: 'field-wtaLogin', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Usuário WTA (Login Automático)', keywords: 'wta login usuario winthor' },
  { id: 'field-wtaPassword', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Senha / Hash WTA', keywords: 'wta senha password hash winthor' },
  { id: 'field-wtaAuthToken', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Cookie de Autenticação WTA (suukie)', keywords: 'wta cookie token suukie sessao autenticacao' },
  { id: 'field-karafUser', tab: 'karaf', tabLabel: 'Credenciais Karaf', label: 'Usuário Karaf (SSH)', keywords: 'karaf usuario ssh client.bat' },
  { id: 'field-karafPass', tab: 'karaf', tabLabel: 'Credenciais Karaf', label: 'Senha Karaf', keywords: 'karaf senha password ssh' },
  { id: 'field-apmInstrumentation', tab: 'karaf', tabLabel: 'Apache Karaf', label: 'Telemetria APM (OpenTelemetry Java Agent)', keywords: 'telemetria apm opentelemetry otel javaagent traces karaf logs' },
  { id: 'field-azure', tab: 'azure', tabLabel: 'Azure DevOps & Git', label: 'Token / Organização Azure DevOps', keywords: 'azure devops git token pat organizacao pull request branch' },
  { id: 'field-services', tab: 'services', tabLabel: 'Serviços Windows & Processos', label: 'Serviços Windows Monitorados', keywords: 'servicos windows service monitorado parar iniciar' },
  { id: 'field-processes', tab: 'services', tabLabel: 'Serviços Windows & Processos', label: 'Processos Conflitantes (Kill)', keywords: 'processos kill matar finalizar conflitante' },
  { id: 'field-ports', tab: 'ports', tabLabel: 'Portas de Rede Monitoradas', label: 'Portas TCP Monitoradas', keywords: 'porta port tcp rede monitorada' },
  { id: 'field-automation', tab: 'automation', tabLabel: 'Automação Padrão', label: 'Automação Padrão do Pipeline de Ambiente', keywords: 'automacao pipeline padrao debug embedded launch' },
  { id: 'field-logs', tab: 'logs', tabLabel: 'Logs em Tempo Real', label: 'Fontes de Logs em Tempo Real', keywords: 'logs tail arquivo fonte tempo real' },
  { id: 'field-backup', tab: 'backup', tabLabel: 'Backup de Bancos', label: 'Backup e Restore de Bancos de Dados', keywords: 'backup restore banco dados expdp impdp pg_dump agendamento webhook' },
  { id: 'field-ai', tab: 'ai', tabLabel: 'IA & Provedores LLM', label: 'Chaves de API dos Provedores LLM (BYOK)', keywords: 'ia llm api key chave openai anthropic ollama chat' }
];
