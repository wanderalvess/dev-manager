# Integridade de Código e Validação Pós-Edição

Regras mandatórias para evitar erros de compilação por snippets órfãos, imports incorretos ou desestruturação faltante:

1. **Inspeção Pós-Edição Obrigatória**:
   - Sempre que realizar uma alteração via `edit_file` ou substituição de blocos de código, leia imediatamente as linhas ao redor do bloco editado.
   - Verifique rigorosamente se não restaram propriedades duplicadas, trechos de código do bloco anterior que não foram removidos ou fechamentos extras/faltantes (`};`, `)`, `}`).

2. **Cálculo Rigoroso de Profundidade de Imports**:
   - Para importar `src/shared/types.ts`:
     - Em `src/renderer/src/utils/`: usar `'../../../shared/types'` (3 níveis: utils -> src -> renderer -> src).
     - Em `src/renderer/src/components/{modulo}/`: usar `'../../../../shared/types'` (4 níveis).
     - Em `src/renderer/src/components/{modulo}/{subpasta}/`: usar `'../../../../../shared/types'` (5 níveis).
   - O componente `Modal` reside em `src/renderer/src/components/ui/Modal.tsx` (importar via `'../ui/Modal'` a partir de `components/{modulo}/`).

3. **Desestruturação Completa de Props**:
   - Ao adicionar novas propriedades à interface de `Props` de um componente React, certifique-se de que a propriedade foi desestruturada na assinatura do componente: `const MyComponent: React.FC<Props> = ({ prop1, prop2, novaProp }) => { ... }`.

4. **Contratos de Serviços Conhecidos**:
   - `api.llmChat(...)` retorna `Promise<LlmChatResponse>` com o campo `.text` (não `.content`).
   - Para renderização de Markdown inline, use `parseMarkdownBlocks` + `<MarkdownBlocks />`. O componente `<MarkdownReader />` é um modal completo exclusivo para visualização de arquivos de documentação.
