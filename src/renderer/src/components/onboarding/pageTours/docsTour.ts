import { TourStep } from '../tourSteps';

export const DOCS_TOUR_STORAGE_KEY = 'devManager:tour:docs';

export const DOCS_TOUR_STEPS: TourStep[] = [
  {
    target: 'doc-settings-button',
    title: 'Configurações de Documentação & IA',
    desc: 'Abra este painel para configurar pastas locais, fontes Confluence/Jira e o assistente de IA / LLM.'
  },
  {
    target: 'reindex-button',
    title: 'Indexar a Documentação',
    desc: 'Escaneia os projetos e pastas configuradas para gerar (ou atualizar) o índice de busca semântica.'
  },
  {
    target: 'search-input',
    title: 'Busca Semântica (RAG)',
    desc: 'Digite uma pergunta em linguagem natural para encontrar trechos relevantes na documentação indexada.'
  },
  {
    target: 'source-filter-select',
    title: 'Filtrar por Fonte',
    desc: 'Restringe a busca a uma fonte específica, como uma pasta, projeto Git, Confluence ou Jira.'
  },
  {
    target: 'search-submit-button',
    title: 'Executar a Busca',
    desc: 'Envia sua pergunta e retorna os trechos de documentos mais relevantes encontrados pela IA.'
  },
  {
    target: 'search-results-list',
    title: 'Resultados da Busca',
    desc: 'Lista os trechos encontrados, com opções para ler, abrir no editor ou revelar o arquivo na pasta.'
  },
  {
    target: 'indexed-docs-catalog',
    title: 'Catálogo de Documentos',
    desc: 'Mostra todos os documentos já indexados quando nenhuma busca está ativa, permitindo navegar e filtrar por nome.'
  }
];
