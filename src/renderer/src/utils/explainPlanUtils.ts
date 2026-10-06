export type PlanFlag = 'full-scan' | 'cartesian' | 'hotspot';

export interface PlanNode {
  id: string;
  depth: number;
  operation: string;
  object?: string;
  rows?: string;
  bytes?: string;
  time?: string;
  /** Custo acumulado (inclui os filhos), como o banco informa. */
  cost?: number;
  /** Custo próprio: o acumulado menos o dos filhos. É ele que aponta onde o tempo vai. */
  selfCost: number;
  /** Fatia do custo total do plano ocupada por este nó (0 a 1). */
  share: number;
  /** Predicados/condições (access, filter, Index Cond...). */
  details: string[];
  flags: PlanFlag[];
}

export interface ParsedPlan {
  kind: 'oracle' | 'postgres';
  nodes: PlanNode[];
  totalCost: number;
  planHash?: string;
  /** Linhas de resumo do banco (ex.: "Execution Time: 0.2 ms"). */
  summary: string[];
}

type RawNode = Omit<PlanNode, 'selfCost' | 'share' | 'flags'> & { flags: PlanFlag[] };

function numberOf(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const m = /^\s*(\d+(?:\.\d+)?)/.exec(text);
  return m ? Number(m[1]) : undefined;
}

/** Calcula custo próprio, fatia do total e o ponto mais caro (hotspot) a partir dos nós em pré-ordem. */
function finalize(raw: RawNode[], kind: ParsedPlan['kind'], extra: Pick<ParsedPlan, 'planHash' | 'summary'>): ParsedPlan {
  const nodes: PlanNode[] = raw.map((n) => ({ ...n, selfCost: n.cost ?? 0, share: 0 }));

  // filhos diretos: nós seguintes com profundidade +1 até voltar ao nível do pai
  nodes.forEach((node, i) => {
    let childrenCost = 0;
    for (let j = i + 1; j < nodes.length && nodes[j].depth > node.depth; j++) {
      if (nodes[j].depth === node.depth + 1) childrenCost += nodes[j].cost ?? 0;
    }
    node.selfCost = Math.max(0, (node.cost ?? 0) - childrenCost);
  });

  const root = nodes.find((n) => n.depth === 0);
  const totalCost = root?.cost ?? Math.max(0, ...nodes.map((n) => n.cost ?? 0));
  for (const n of nodes) n.share = totalCost > 0 ? Math.min(1, n.selfCost / totalCost) : 0;

  const hottest = nodes.reduce<PlanNode | null>((best, n) => (!best || n.selfCost > best.selfCost ? n : best), null);
  if (hottest && hottest.selfCost > 0 && hottest.share >= 0.3) hottest.flags.push('hotspot');

  return { kind, nodes, totalCost, ...extra };
}

function operationFlags(operation: string): PlanFlag[] {
  const flags: PlanFlag[] = [];
  if (/TABLE ACCESS FULL|^Seq Scan/i.test(operation)) flags.push('full-scan');
  if (/CARTESIAN/i.test(operation)) flags.push('cartesian');
  return flags;
}

// ---------------------------------------------------------------------------
// Oracle (DBMS_XPLAN.DISPLAY, formato TYPICAL)
// ---------------------------------------------------------------------------

function parseOracle(lines: string[]): ParsedPlan | null {
  const headerIdx = lines.findIndex((l) => /^\|\s*Id\s*\|/.test(l));
  if (headerIdx === -1) return null;

  const headers = lines[headerIdx].split('|').slice(1, -1).map((h) => h.trim());
  const col = (prefix: string) => headers.findIndex((h) => h.toLowerCase().startsWith(prefix));
  const iOp = col('operation');
  const iName = col('name');
  const iRows = col('rows');
  const iBytes = col('bytes');
  const iCost = col('cost');
  const iTime = col('time');
  if (iOp === -1) return null;

  const raw: RawNode[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^-{5,}/.test(line)) {
      if (raw.length > 0) break;
      continue;
    }
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1);
    const idCell = cells[0] ?? '';
    const opCell = cells[iOp] ?? '';
    const operation = opCell.trim();
    if (!operation) continue;
    raw.push({
      id: idCell.replace('*', '').trim(),
      depth: Math.max(0, opCell.length - opCell.trimStart().length - 1),
      operation,
      object: iName >= 0 ? cells[iName]?.trim() || undefined : undefined,
      rows: iRows >= 0 ? cells[iRows]?.trim() || undefined : undefined,
      bytes: iBytes >= 0 ? cells[iBytes]?.trim() || undefined : undefined,
      time: iTime >= 0 ? cells[iTime]?.trim() || undefined : undefined,
      cost: iCost >= 0 ? numberOf(cells[iCost]) : undefined,
      details: [],
      flags: operationFlags(operation)
    });
  }
  if (raw.length === 0) return null;

  // Predicate Information: "   1 - filter(...)" com continuação indentada
  const predIdx = lines.findIndex((l) => /^Predicate Information/i.test(l));
  if (predIdx !== -1) {
    let currentId: string | null = null;
    for (let i = predIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      const m = /^\s*(\d+)\s+-\s+(.*)$/.exec(line);
      if (m) {
        currentId = m[1];
        raw.find((n) => n.id === currentId)?.details.push(m[2].trim());
      } else if (currentId && /^\s{6,}\S/.test(line)) {
        const target = raw.find((n) => n.id === currentId);
        if (target && target.details.length > 0) target.details[target.details.length - 1] += ` ${line.trim()}`;
      } else if (/^(Note|Column Projection|Query Block|-{5,})/i.test(line.trim()) && line.trim() !== '') {
        if (!/^-{5,}/.test(line.trim())) break;
      }
    }
  }

  const hash = lines.map((l) => /Plan hash value:\s*(\d+)/.exec(l)?.[1]).find(Boolean);
  const notes = lines.filter((l) => /^\s*-\s+(dynamic|this is an adaptive|SQL plan baseline|cardinality feedback)/i.test(l)).map((l) => l.trim());
  return finalize(raw, 'oracle', { planHash: hash, summary: notes });
}

// ---------------------------------------------------------------------------
// PostgreSQL (EXPLAIN FORMAT TEXT)
// ---------------------------------------------------------------------------

const PG_NODE = /^(\s*)(->\s*)?(.+?)\s+\(cost=(\d+(?:\.\d+)?)\.\.(\d+(?:\.\d+)?)\s+rows=(\d+)\s+width=(\d+)\)(?:\s+\(actual time=[\d.]+\.\.([\d.]+)\s+rows=(\d+)(?:\.\d+)?\s+loops=(\d+)\))?/;

function parsePostgres(lines: string[]): ParsedPlan | null {
  const raw: RawNode[] = [];
  const stack: number[] = [];
  const summary: string[] = [];

  for (const line of lines) {
    const m = PG_NODE.exec(line);
    if (m) {
      const col = m[1].length; // posição do "->" (ou 0 na raiz): define o nível
      while (stack.length > 0 && stack[stack.length - 1] >= col) stack.pop();
      const depth = stack.length;
      stack.push(col);

      const label = m[3].trim();
      const on = /^(.*?)\s+on\s+(.+)$/.exec(label);
      raw.push({
        id: String(raw.length),
        depth,
        operation: on ? on[1].trim() : label,
        object: on ? on[2].trim() : undefined,
        rows: m[6],
        bytes: m[7] ? `${m[7]} B/linha` : undefined,
        time: m[8] ? `${m[8]} ms` : undefined,
        cost: Number(m[5]),
        details: [],
        flags: operationFlags(label)
      });
    } else if (/^\s*(Planning|Execution) Time:|^\s*(Planning Time|Trigger)/.test(line)) {
      summary.push(line.trim());
    } else if (line.trim() && raw.length > 0) {
      raw[raw.length - 1].details.push(line.trim());
    }
  }
  if (raw.length === 0) return null;
  return finalize(raw, 'postgres', { summary });
}

/** Interpreta o texto do plano (Oracle ou PostgreSQL). Devolve null quando o formato não é reconhecido (ex.: MySQL). */
export function parseExplainPlan(lines: string[]): ParsedPlan | null {
  if (!lines || lines.length === 0) return null;
  return parseOracle(lines) ?? parsePostgres(lines);
}
