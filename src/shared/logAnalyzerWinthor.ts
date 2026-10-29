import type { LogExceptionMatch } from './types';
import { requirementFilter, requirementNamespace, stripBundleRevision } from './osgiRequirementText';

/**
 * Padrões do log do Karaf do WinThor (winthor.log) que o analisador genérico não explica, vistos numa instalação real:
 * - a cadeia de "Unable to resolve ... [caused by: ...]": o que importa é o último elo (o pacote que ninguém exporta);
 * - o HealthService do ferramenta-servidor tentando reiniciar bundles que não resolvem, em loop;
 * - ORA-00904 (coluna inexistente): o banco está mais antigo que a versão da rotina instalada.
 */

const id = (prefix: string, lineIndex: number) => `${prefix}_${lineIndex}_${Date.now()}`;

/** O último elo da cadeia de resolução: quem falhou e o pacote (ou bundle) que faltou, com a faixa de versão. */
export function resolutionRootCause(line: string): { bundle: string; missing: string; range?: string; firstBundle: string } | null {
  if (!/Unable to resolve/i.test(line) || !/missing requirement/i.test(line)) return null;
  const blocks = line.split(/\[?caused by:\s*/i).filter((block) => /missing requirement/i.test(block));
  const last = blocks[blocks.length - 1];
  if (!last) return null;
  const bundleOf = (block: string) => stripBundleRevision(/Unable to resolve\s+([^:]+):/i.exec(block)?.[1] ?? '?');
  const filter = requirementFilter(last);
  // Sem filtro não há o que apontar: o analisador genérico cuida da linha
  if (!filter || !requirementNamespace(last)) return null;
  const item =
    /osgi\.wiring\.package=([^)]+)/.exec(filter)?.[1] ??
    /osgi\.wiring\.bundle=([^)]+)/.exec(filter)?.[1] ??
    /osgi\.identity=([^)\s;]+)/.exec(filter)?.[1];
  if (!item) return null;
  const min = /\(version>=([^)]+)\)/.exec(filter)?.[1];
  const max = /\(!\(version>=([^)]+)\)\)/.exec(filter)?.[1];
  const range = min && max ? `[${min}, ${max})` : min ? `>= ${min}` : undefined;
  return { bundle: bundleOf(last), missing: item.trim(), ...(range ? { range } : {}), firstBundle: bundleOf(blocks[0]) };
}

export function analyzeWinthorLine(line: string, lineIndex: number): LogExceptionMatch | null {
  const root = resolutionRootCause(line);
  if (root) {
    const chained = root.firstBundle !== root.bundle;
    return {
      id: id('osgiroot', lineIndex),
      type: 'BUNDLE',
      code: 'BUNDLE_ROOT',
      title: `Falha de Resolução OSGi: falta ${root.missing}${root.range ? ` ${root.range}` : ''}`,
      message: line.trim(),
      lineIndex,
      rawLine: line,
      explanation:
        `${root.bundle} precisa de ${root.missing}${root.range ? ` na faixa ${root.range}` : ''} e nenhum bundle ativo exporta isso.` +
        (chained ? ` ${root.firstBundle} só falhou porque depende dele: corrija a causa raiz, não o primeiro da lista.` : ''),
      suggestedCommands: [
        `package:exports | grep ${root.missing}`,
        `bundle:diag ${root.bundle}`,
        'Instalar a feature (ou a versão do framework) que exporta o pacote nessa faixa e depois bundle:refresh.'
      ]
    };
  }

  const health = /Falha ao reiniciar o bundle '([^']+)'/i.exec(line);
  if (health) {
    return {
      id: id('health', lineIndex),
      type: 'BUNDLE',
      code: 'HEALTH_RESTART',
      title: `HealthService não consegue reiniciar ${health[1]}`,
      message: line.trim(),
      lineIndex,
      rawLine: line,
      explanation:
        'O verificador de saúde do ferramenta-servidor reinicia bundles parados, mas este não resolve: reiniciar não adianta e ele ' +
        'tenta de novo a cada ciclo. Procure a "Falha de Resolução OSGi" do mesmo bundle para ver o que falta.',
      suggestedCommands: [`bundle:diag ${health[1]}`, `bundle:list -s | grep ${health[1]}`]
    };
  }

  const missingColumn = /ORA-00904:\s*"?([A-Za-z0-9_$#."]+?)"?\s*:/i.exec(line);
  if (missingColumn) {
    const column = missingColumn[1].replace(/"/g, '').split('.').pop() ?? missingColumn[1];
    const table = /\bfrom\s+([A-Za-z0-9_$#.]+)/i.exec(line)?.[1];
    return {
      id: id('ora904', lineIndex),
      type: 'ORA',
      code: 'ORA-00904',
      title: `Coluna inexistente: ${column}${table ? ` (${table.toUpperCase()})` : ''} (ORA-00904)`,
      message: line.trim(),
      lineIndex,
      rawLine: line,
      explanation:
        `A rotina consulta a coluna ${column}${table ? ` em ${table.toUpperCase()}` : ''}, que não existe neste banco. No WinThor isso quase ` +
        'sempre é banco mais antigo que a versão da rotina instalada no Karaf: falta rodar a atualização de banco da versão.',
      suggestedCommands: [
        `SELECT OWNER, TABLE_NAME FROM ALL_TAB_COLUMNS WHERE COLUMN_NAME = '${column.toUpperCase()}';`,
        'Conferir a versão do banco (atualizador do WinThor) contra a versão do bundle em bundle:list.'
      ]
    };
  }
  return null;
}
