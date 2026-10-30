/**
 * Números do catálogo MCP citados na interface e na documentação. O teste ao lado conta as tools
 * registradas em src/mcp e falha se estes valores ficarem para trás — a Ajuda já divergiu do código várias vezes.
 */
export const MCP_TOOL_COUNT = 178;

/** Tools de leitura: as únicas registradas com `HUB_MCP_MODE=readonly`. */
export const MCP_READ_TOOL_COUNT = 95;

/** Tools marcadas como destrutivas (`destructiveHint`): o cliente MCP pede aprovação antes de chamar. */
export const MCP_DESTRUCTIVE_TOOL_COUNT = 29;
