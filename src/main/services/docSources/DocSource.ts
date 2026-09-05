export interface DocSourceEntry {
  /** Estável dentro da fonte: caminho absoluto do arquivo, id de página, id de doc remoto. */
  id: string;
  /** Nome legível: caminho relativo à raiz da fonte, título da página/doc. */
  title: string;
  /** Timestamp de última modificação (ms epoch) — usado pra pular reembedding de itens sem mudança. */
  mtimeMs: number;
}

export interface DocSource {
  /** Id único e estável da fonte (prefixado por tipo pra não colidir entre fontes diferentes). */
  readonly id: string;
  /** Rótulo exibido na UI/status. */
  readonly label: string;
  /** Lista metadados de todos os itens disponíveis — barato, sem baixar conteúdo. */
  listEntries(): Promise<DocSourceEntry[]>;
  /** Busca o conteúdo completo (texto/markdown) de um item — só chamado pra itens novos/alterados. */
  readContent(entry: DocSourceEntry): Promise<string>;
}
