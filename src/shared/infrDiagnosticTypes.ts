/** Pedido e resposta do relatório para suporte de um ambiente (IPC infr:diagnostic e POST /api/infr/diagnostic). */
export interface InfrDiagnosticRequest {
  distro?: string;
  name: string;
  infrPath?: string;
  /** Versão do WinThor do ambiente (a do formulário); sem ela, sai da imagem do WTA */
  version?: string;
  /** O que a tela registrou do lado dela (leitura da origem, mensagem da criação, comando) */
  notes?: string;
  /** Pedido da IA: devolve só a versão compacta e não guarda arquivo */
  forAi?: boolean;
}

export interface InfrDiagnosticResult {
  success: boolean;
  error?: string;
  text?: string;
  /** Versão compacta e mascarada para a IA (6 a 8 mil caracteres) */
  compact?: string;
  /** Arquivo onde o relatório também ficou guardado */
  path?: string;
}
