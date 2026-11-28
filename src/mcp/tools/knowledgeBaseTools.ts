import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { KnowledgeBaseService } from '../../main/services/kb/KnowledgeBaseService';

interface KnowledgeBaseToolDeps {
  knowledgeBaseService: KnowledgeBaseService;
  ok: (data: unknown) => unknown;
  fail: (message: string) => unknown;
}

const docTypeSchema = z.enum(['api_doc', 'tdn_page', 'prompt', 'skill', 'instruction']).optional();
const sourceSchema = z.enum(['code', 'tdn']).optional();

/** Base de Conhecimento compartilhada (APIs Java, TDN, prompts e skills) hospedada no Agile Space. */
export function registerKnowledgeBaseTools(
  server: McpServer,
  { knowledgeBaseService, ok, fail }: KnowledgeBaseToolDeps
): void {
  const reply = ok as (data: unknown) => never;
  const error = fail as (message: string) => never;
  const run = async (fn: () => Promise<unknown>): Promise<never> => {
    try {
      return reply(await fn());
    } catch (e) {
      return error(e instanceof Error ? e.message : String(e));
    }
  };

  server.registerTool(
    'kb_search',
    {
      title: 'Buscar na Base de Conhecimento',
      description:
        'Busca trechos na Base de Conhecimento compartilhada (documentação das APIs Java mapeadas a partir do código, páginas do TDN, prompts e skills). Devolve trechos com título, caminho do cabeçalho, origem (code ou tdn), módulo e link da fonte, para citar na resposta. A busca é por texto em português; filtre por módulo (ex.: winthor-produto) para reduzir ruído.',
      inputSchema: {
        query: z.string().min(2).describe('O que procurar, em linguagem natural ou com nomes de rota, classe, campo ou tabela'),
        k: z.number().int().min(1).max(20).optional().describe('Quantidade de trechos (padrão 8)'),
        docType: docTypeSchema.describe('Filtra por tipo de documento'),
        source: sourceSchema.describe('code = mapeado do código; tdn = página do TDN'),
        module: z.string().optional().describe('Filtra por módulo/aplicação Java')
      }
    },
    async (a) => run(() => knowledgeBaseService.search(a))
  );

  server.registerTool(
    'kb_ask_context',
    {
      title: 'Montar o contexto de uma pergunta',
      description:
        'Recupera os trechos mais relevantes para uma pergunta e devolve as fontes numeradas [n], as citações e um prompt pronto (systemPrompt/userPrompt). O servidor não chama nenhum LLM: quem usa a tool escreve a resposta citando [n]. Se `answerable` vier false, diga que não encontrou na base em vez de inventar. Se `mixedSources` vier true há código e TDN juntos: compare e aponte divergências (veja kb_list_divergences).',
      inputSchema: {
        question: z.string().min(3).describe('A pergunta a responder'),
        k: z.number().int().min(1).max(20).optional(),
        docType: docTypeSchema,
        source: sourceSchema,
        module: z.string().optional()
      }
    },
    async (a) => run(() => knowledgeBaseService.ask(a))
  );

  server.registerTool(
    'kb_list_divergences',
    {
      title: 'Listar divergências entre código e TDN',
      description:
        'Lista os pares documento-de-código x página-do-TDN ligados entre si, do mais divergente ao menos, comparando identificadores (rotas, classes, campos e tabelas) por similaridade. Mostra o que existe só no código e só no TDN. Não julga o sentido do texto: confira os itens apontados. Também lista os documentos de código sem página do TDN ligada.',
      inputSchema: {
        module: z.string().optional().describe('Limita a um módulo/aplicação Java'),
        limit: z.number().int().min(1).max(200).optional().describe('Máximo de pares')
      }
    },
    async (a) => run(() => knowledgeBaseService.divergences(a.module, a.limit))
  );

  server.registerTool(
    'kb_sync_embeddings',
    {
      title: 'Calcular os embeddings pendentes da Base de Conhecimento',
      description:
        'Busca os trechos sem embedding no servidor, calcula aqui com o modelo multilíngue local e devolve os vetores, até acabarem. Com isso a busca passa a ser híbrida (texto + significado). Não baixa o modelo: ele precisa já estar na máquina (botão "Gerar embeddings" no card da Base de Conhecimento do Hub). Devolve quantos foram atualizados e quais o servidor recusou.',
      inputSchema: {}
    },
    async () => run(() => knowledgeBaseService.syncEmbeddings())
  );

  server.registerTool(
    'kb_import_folder',
    {
      title: 'Importar o prompt-hub para a Base de Conhecimento',
      description:
        'Envia os documentos (.md/.txt) da pasta do prompt-hub definida nas configurações do Hub (não aceita outro caminho) para a Base de Conhecimento compartilhada, em lotes de 50. O servidor compara o conteúdo e só grava o que mudou. ATENÇÃO: publica documentação de código e do TDN em um servidor externo ao Hub; use só com a autorização do usuário. Devolve criados, atualizados, iguais, erros e avisos.',
      inputSchema: {
        version: z.string().optional().describe('Tag ou commit gravado como versão dos documentos sem version no frontmatter')
      }
    },
    async (a) => run(() => knowledgeBaseService.importFolder({ version: a.version }))
  );
}
