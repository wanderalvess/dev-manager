export type SettingsTab = 'dirs' | 'routines' | 'karaf' | 'azure' | 'services' | 'ports' | 'automation' | 'logs' | 'backup' | 'ai' | 'quality' | 'integration' | 'usage' | 'modules';

export interface SettingsSearchEntry {
  id: string;
  tab: SettingsTab;
  tabLabel: string;
  label: string;
  keywords: string;
}

/** Índice curado de campos-chave para a busca da tela de Configurações (não cobre 100% dos campos). */
export const SETTINGS_SEARCH_INDEX: SettingsSearchEntry[] = [
  { id: 'field-appPath', tab: 'routines', tabLabel: 'Rotinas WinThor', label: 'Diretório Raiz das Rotinas / Binários (Prod)', keywords: 'app path diretorio pasta rotinas binarios prod' },
  { id: 'field-karafPath', tab: 'karaf', tabLabel: 'Karaf', label: 'Diretório do Apache Karaf', keywords: 'karaf path diretorio pasta osgi' },
  { id: 'field-jdkPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório do JDK', keywords: 'jdk java path diretorio' },
  { id: 'field-intellijPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Executável do IntelliJ / IDE', keywords: 'intellij ide editor idea' },
  { id: 'field-projectsPath', tab: 'dirs', tabLabel: 'Diretórios & IDE', label: 'Diretório de Projetos', keywords: 'projetos path diretorio workspace' },
  { id: 'field-tautProjectPath', tab: 'quality', tabLabel: 'Qualidade & QA', label: 'Diretório do Projeto de Testes Automatizados (Cypress)', keywords: 'testes cypress automacao e2e taut qa path diretorio pasta zephyr' },
  { id: 'field-tautKeyPrefix', tab: 'quality', tabLabel: 'Qualidade & QA', label: 'Prefixo das chaves de cenário Zephyr (TAUT)', keywords: 'taut zephyr chave prefixo cenario cypress csv intake cobertura' },
  { id: 'field-wtaLogin', tab: 'routines', tabLabel: 'Rotinas WinThor', label: 'Usuário WTA (Login Automático)', keywords: 'wta login usuario winthor' },
  { id: 'field-wtaPassword', tab: 'routines', tabLabel: 'Rotinas WinThor', label: 'Senha / Hash WTA', keywords: 'wta senha password hash winthor' },
  { id: 'field-wtaAuthToken', tab: 'routines', tabLabel: 'Rotinas WinThor', label: 'Cookie de Autenticação WTA (suukie)', keywords: 'wta cookie token suukie sessao autenticacao' },
  { id: 'field-ccw', tab: 'routines', tabLabel: 'Rotinas WinThor', label: 'Central de Controle WinThor (CCW): URL, versão e cookie', keywords: 'ccw central controle winthor download atualizar rotina versao url cookie auth token' },
  { id: 'field-karafWsl', tab: 'karaf', tabLabel: 'Apache Karaf', label: 'Ambiente de Execução do Karaf (Local / WSL)', keywords: 'karaf wsl linux ubuntu debian ambiente execucao' },
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
  { id: 'field-oracleTnsnames', tab: 'backup', tabLabel: 'Backup & Oracle', label: 'Arquivo tnsnames.ora (Oracle)', keywords: 'tnsnames tnsnames.ora tns oracle rede listener conexao banco' },
  { id: 'field-ai', tab: 'ai', tabLabel: 'IA & Provedores LLM', label: 'Chaves de API dos Provedores LLM (BYOK)', keywords: 'ia llm api key chave openai anthropic ollama chat' },
  { id: 'field-quality', tab: 'quality', tabLabel: 'Qualidade & QA', label: 'Integrações de Testes (Zephyr, Jira, Azure)', keywords: 'qualidade qa zephyr scale squad jira test plans testes homologacao cenarios token api' },
  { id: 'field-integrationLayers', tab: 'integration', tabLabel: 'Integração ponta a ponta', label: 'Camadas da integração (WinThor, WSH, CH, PDV)', keywords: 'integracao ponta a ponta rastreio camada winthor wsh smart hub commerce hub ch pdv url health porta servico log conexao oracle postgres' },
  { id: 'field-integrationFlows', tab: 'integration', tabLabel: 'Integração ponta a ponta', label: 'Fluxos do WSH (tipo de lote, disparo, evidência no PDV)', keywords: 'integracao fluxo wsh lote ch venda disparo evidencia pdv postgres jolt rastreio' },
  { id: 'field-usageMetricsEnabled', tab: 'usage', tabLabel: 'Meu uso', label: 'Contagem de uso (ligar, desligar, apagar histórico)', keywords: 'uso metricas contagem telemetria privacidade historico apagar meu uso impacto horas economizadas' },
  { id: 'field-usageImpact', tab: 'usage', tabLabel: 'Meu uso', label: 'Meu impacto: tempo economizado por automação', keywords: 'impacto tempo economizado horas economia produtividade resultado exportar csv' },
  { id: 'field-usageBaselines', tab: 'usage', tabLabel: 'Meu uso', label: 'Quanto tempo você levava à mão (linha de base)', keywords: 'linha de base tempo manual levava a mao minutos referencia antes economia padrao estimativa confirmar' },
  { id: 'field-usageSummary', tab: 'usage', tabLabel: 'Meu uso', label: 'Resumo do meu uso (execuções por módulo e semana)', keywords: 'uso resumo execucoes modulo semana sucesso falha tempo meu uso metricas' },
  { id: 'field-modules', tab: 'modules', tabLabel: 'Módulos', label: 'Ligar / Desligar Módulos da Navegação', keywords: 'modulos paginas navegacao menu cabecalho ocultar esconder desligar ligar perfil dev qa operacao' }
];
