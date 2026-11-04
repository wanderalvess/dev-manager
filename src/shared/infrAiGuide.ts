/**
 * IA conduzindo a Nova versão: o modelo não executa nada, só responde em cada turno com UMA ação em JSON. Aqui ficam o
 * contrato dessas ações, a validação (o Hub só aceita o que está na lista e com valores válidos), a mensagem de contexto
 * (sempre com credenciais mascaradas) e a leitura da resposta. Quem executa é a tela, com confirmação nos pontos de risco.
 */
import type { InfrEnvCheck } from './infrEnvCheck';
import { maskDiagnostic } from './infrDiagnostic';
import { knownFailuresPrompt, matchKnownFailures } from './infrAiKnownFailures';
import { maskUrlCredentials } from './infrFeatureArtifacts';
import { isValidEnvName, isValidWinthorVersion } from './infrWinthorVersion';

/** Campos do formulário que a IA pode preencher. */
export const GUIDE_FIELDS = ['from', 'version', 'name', 'dbMode', 'oraclePort', 'wtaPort', 'wshPort', 'dryRun'] as const;
export type GuideField = (typeof GUIDE_FIELDS)[number];

export type GuideAction =
  /** Preenche um campo do formulário */
  | { action: 'set'; field: GuideField; value: string; why: string }
  /** Lê a origem e o catálogo e confere tudo (passo 4) */
  | { action: 'preview'; why: string }
  /** Pede ao usuário a confirmação para criar; só ele gera */
  | { action: 'generate'; why: string }
  /** Confere os containers do ambiente novo */
  | { action: 'verify'; why: string }
  /** Só explica ou orienta (diagnóstico, próximo passo) */
  | { action: 'say'; why: string; commands?: string[] }
  /** Terminou */
  | { action: 'done'; why: string };

export type GuideParse = { ok: true; action: GuideAction } | { ok: false; error: string };

export interface GuideContext {
  /** O que o usuário pediu, nas palavras dele */
  goal: string;
  /** Ambientes de origem disponíveis */
  envs: string[];
  form: Record<GuideField, string>;
  /** Pontos da conferência do passo 4 (vazio antes da prévia) */
  review: { id: string; status: string; title: string; detail: string }[];
  /** Erro ao ler a origem, quando a prévia falhou */
  previewError?: string;
  /** Resumo da verificação dos containers depois da criação */
  verify?: { status: string; lines: string[] };
  /** Relatório compacto do ambiente (scripts, pasta, containers, erros da criação); substitui as linhas da verificação */
  diagnostic?: string;
  /** Saída do terminal que o usuário colou */
  pasted?: string;
  /** Últimas ações e resultados, mais antigas primeiro */
  history: string[];
}

/** Verificação dos containers em linhas curtas para o contexto da IA (estado, health, log do container e do build). */
export function describeEnvCheckForAi(check: InfrEnvCheck): NonNullable<GuideContext['verify']> {
  const lines: string[] = [];
  for (const c of check.containers) {
    lines.push(
      c.exists
        ? `${c.container}: ${c.state ?? '?'}${c.health ? `/${c.health}` : ''}, reinícios ${c.restarts ?? 0}, portas ${c.ports.join(' ') || 'nenhuma'}`
        : `${c.container}: não existe`
    );
    if (c.exists && c.state !== 'running') lines.push(...c.logTail.slice(-8).map((l) => `  log: ${l}`));
  }
  if (check.wtaHttp) lines.push(`WTA HTTP ${check.wtaHttp.url}: ${check.wtaHttp.status ?? check.wtaHttp.error ?? 'sem resposta'}`);
  const b = check.buildLog;
  if (b?.exists) {
    if (b.failure) lines.push(`Log do build: ${b.failure}`);
    if (b.stage) lines.push(`Etapa do build: ${b.stage}`);
    lines.push(...b.tail.slice(-12).map((l) => `  build: ${l}`));
  }
  const s = check.summary;
  return { status: s ? `${s.status} — ${s.title}. ${s.detail}` : check.error || 'sem resumo', lines };
}

const PORT = /^\d{4,5}$/;
const DB_MODES = ['clone', 'empty', 'existing'];

/** Esconde o que não pode sair da máquina: usuário:senha@ em URL e pares senha/token/chave. */
export function maskForAi(text: string): string {
  return maskDiagnostic(
    maskUrlCredentials(text).replace(/\b(senha|password|passwd|pass|pwd|token|secret|apikey|api_key)(\s*[=:]\s*)("[^"]*"|'[^']*'|\S+)/gi, '$1$2***')
  );
}

/**
 * Identifica uma falha do ambiente para a IA falar dela uma vez só: o mesmo erro lido de novo (a cada 15 s ou ao reabrir a
 * tela) dá a mesma assinatura. Devolve null quando não há falha.
 */
export function envFailureSignature(check: InfrEnvCheck | null | undefined): string | null {
  const s = check?.summary;
  if (!check?.success || s?.status !== 'fail') return null;
  return [check.name ?? '', s.title, check.buildLog?.failure ?? '', check.buildLog?.stage ?? ''].join('|');
}

/**
 * Decide se a leitura do ambiente deve acordar a IA: só enquanto a criação está em andamento, para o ambiente do formulário
 * e uma vez por falha (a mesma assinatura lida de novo não chama o modelo). Devolve a assinatura a registrar, ou null.
 */
export function failureToExplain(opts: { check: InfrEnvCheck | null | undefined; status: string; formName: string; lastSignature: string | null }): string | null {
  const sig = envFailureSignature(opts.check);
  if (!sig || opts.status !== 'building' || sig === opts.lastSignature) return null;
  if (opts.check?.name && opts.check.name !== opts.formName.trim()) return null;
  return sig;
}

export interface GuideConversation {
  goal: string;
  history: string[];
  pasted?: string;
}

/** Resposta do usuário depois da falha: soma ao que já existe (pedido, histórico, saída colada) em vez de recomeçar. */
export function continueConversation(prev: GuideConversation, text: string, terminalOutput?: string): GuideConversation {
  const t = text.trim();
  const out = terminalOutput?.trim();
  const history = [...prev.history, `o usuário respondeu: ${maskForAi(t) || '(sem texto)'}`];
  if (out) history.push('o usuário colou a saída do terminal (ela vem no fim do contexto)');
  return { goal: prev.goal || t || 'Entender o erro do terminal', history, pasted: out ? maskForAi(out).slice(-3500) : prev.pasted };
}

/** Confere o valor de um campo; devolve o motivo da recusa ou '' quando serve. */
export function validateGuideField(field: GuideField, value: string, envs: string[]): string {
  const v = value.trim();
  switch (field) {
    case 'from':
      return envs.includes(v) ? '' : `"${v}" não é um ambiente de origem (opções: ${envs.join(', ') || 'nenhuma'}).`;
    case 'version':
      return isValidWinthorVersion(v) ? '' : `"${v}" não é uma versão válida (3 dígitos, ex.: 40).`;
    case 'name':
      return isValidEnvName(v) ? '' : `"${v}" não é um nome válido (letras minúsculas, números e hífen).`;
    case 'dbMode':
      return DB_MODES.includes(v) ? '' : `dbMode deve ser ${DB_MODES.join(', ')}.`;
    case 'oraclePort':
    case 'wtaPort':
    case 'wshPort':
      return PORT.test(v) && +v >= 1024 && +v <= 65535 ? '' : `"${v}" não é uma porta válida (1024 a 65535).`;
    case 'dryRun':
      return v === '' || v === '1' ? '' : 'dryRun é "1" (ensaiar) ou vazio.';
  }
}

/** Comando que apaga ou derruba algo: a IA não sugere, porque o ambiente que existe pode ser o único funcionando. */
const DESTRUCTIVE = /\b(rm|rmi|rmdir|kill|killall|stop|down|prune|drop|truncate|delete|del|format|wsl\s+--unregister|--unregister|shutdown|reboot|mkfs|dd)\b|\bgit\s+(reset|clean|checkout\s+--)|>\s*\/|\bsudo\b/i;
export const isDestructiveCommand = (command: string): boolean => DESTRUCTIVE.test(command);

function firstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === '\\') i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/** Lê a resposta do modelo: aceita só uma das ações acima, com os valores válidos. */
export function parseGuideReply(text: string, envs: string[]): GuideParse {
  const raw = firstJsonObject(text);
  if (!raw) return { ok: false, error: 'A resposta não trouxe um JSON.' };
  let o: Record<string, unknown>;
  try {
    o = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'O JSON da resposta está malformado.' };
  }
  const why = typeof o.why === 'string' ? o.why.trim().slice(0, 600) : '';
  if (!why) return { ok: false, error: 'Faltou o campo "why" (o motivo da ação).' };
  switch (o.action) {
    case 'set': {
      const field = o.field as GuideField;
      if (!GUIDE_FIELDS.includes(field)) return { ok: false, error: `Campo "${String(o.field)}" não pode ser preenchido.` };
      const value = typeof o.value === 'string' || typeof o.value === 'number' ? String(o.value).trim() : '';
      const bad = validateGuideField(field, value, envs);
      return bad ? { ok: false, error: bad } : { ok: true, action: { action: 'set', field, value, why } };
    }
    case 'preview':
    case 'generate':
    case 'verify':
    case 'done':
      return { ok: true, action: { action: o.action, why } };
    case 'say': {
      const commands = Array.isArray(o.commands)
        ? o.commands
            .filter((c): c is string => typeof c === 'string' && c.trim().length > 0 && c.length <= 400 && !isDestructiveCommand(c))
            .slice(0, 5)
        : undefined;
      return { ok: true, action: { action: 'say', why, ...(commands?.length ? { commands } : {}) } };
    }
    default:
      return { ok: false, error: `Ação "${String(o.action)}" não existe. Use: set, preview, generate, verify, say, done.` };
  }
}

export const GUIDE_SYSTEM_PROMPT = [
  'Você conduz o Assistente INFR-Docker do Hub Manager: cria um ambiente WinThor novo (Oracle, WTA e WSH em Docker no WSL) a partir de um ambiente que já funciona.',
  'Responda SEMPRE com UM objeto JSON e nada mais, no formato {"action": "...", "why": "motivo em uma frase em português", ...}.',
  'Ações:',
  '- {"action":"set","field":"from|version|name|dbMode|oraclePort|wtaPort|wshPort|dryRun","value":"...","why":"..."}: preenche um campo. dbMode: clone, empty ou existing.',
  '- {"action":"preview","why":"..."}: lê a origem e o catálogo e confere tudo. Faça depois de preencher origem, versão e nome.',
  '- {"action":"generate","why":"..."}: só pede ao usuário a confirmação para criar (o build leva uns 30 minutos). Peça apenas com a conferência sem itens bloqueados.',
  '- {"action":"verify","why":"..."}: confere os containers depois de criar.',
  '- {"action":"say","why":"explicação ou diagnóstico","commands":["comando opcional para o usuário copiar"]}: orienta sem mexer em nada.',
  '- {"action":"done","why":"..."}: terminou ou não há mais o que fazer.',
  'Regras: não invente ambientes, portas ou nomes fora do que o contexto mostra. Item bloqueado na conferência não se contorna: explique e proponha a correção (campo diferente ou dbMode). Em falha, diagnostique pelo log e pela conferência; se não houver correção possível com as ações acima, use say. Nunca sugira comandos que apaguem, parem ou recriem containers, volumes ou arquivos: o ambiente que existe pode ser o único funcionando; em "commands" só leitura (docker ps, docker logs, free -m, df, curl) ou git fetch/checkout. Se a correção apaga algo (docker rm/rmi, volume, SQL), descreva no texto de "why", só do ambiente novo e dizendo o que apaga; SQL só para rodar num ambiente de teste, com backup. Uma ação por resposta.',
  'Depois de uma falha da criação você recebe um "Relatório do ambiente". Responda com say: diga em português simples o que aconteceu e o que fazer, apontando a causa pela evidência (scripts desatualizados, branch da pasta, primeiro [ERRO] do log, container que falta), e traga em "commands" os comandos para o usuário copiar e rodar (diga em "why" em que pasta rodar). Se o relatório indicar SCRIPTS DESATUALIZADOS, a causa é a pasta do INFR-Docker velha: use o comando de atualização da própria mensagem. Se o usuário disser que já resolveu, não repita: use verify para reler o ambiente. Saída de terminal colada pelo usuário vale como evidência.',
  knownFailuresPrompt()
].join('\n');

/** Mensagem de contexto do turno: estado do formulário, conferência, verificação e histórico recente, tudo mascarado. */
export function buildGuideUserMessage(ctx: GuideContext): string {
  const lines: string[] = [`Pedido do usuário: ${ctx.goal}`, `Ambientes de origem: ${ctx.envs.join(', ') || '(nenhum)'}`];
  lines.push('Formulário:');
  for (const f of GUIDE_FIELDS) lines.push(`- ${f}: ${ctx.form[f] || '(vazio)'}`);
  if (ctx.previewError) lines.push(`A prévia falhou: ${ctx.previewError}`);
  if (ctx.review.length) {
    lines.push('Conferência do passo 4:');
    for (const r of ctx.review.slice(0, 18)) lines.push(`- [${r.status}] ${r.title}: ${r.detail}`.slice(0, 700));
  }
  if (ctx.verify && !ctx.diagnostic) {
    lines.push(`Verificação do ambiente: ${ctx.verify.status}`);
    for (const l of ctx.verify.lines.slice(0, 40)) lines.push(`  ${l}`);
  }
  if (ctx.history.length) {
    lines.push('Até aqui:');
    for (const h of ctx.history.slice(-10)) lines.push(`- ${h}`);
  }
  // O relatório e o que foi colado vão por último, cada um com teto próprio: a pergunta final nunca é cortada
  const tail: string[] = [];
  if (ctx.diagnostic) tail.push(`Relatório do ambiente (lido agora pelo Hub):\n${ctx.diagnostic.slice(0, 8000)}`);
  if (ctx.pasted?.trim()) tail.push(`Saída do terminal colada pelo usuário:\n${ctx.pasted.slice(-3500)}`);
  // Pista do Hub: as falhas conhecidas que combinam com o que foi lido (ajuda modelos pequenos a escolher a entrada certa)
  const hints = matchKnownFailures([...lines, ctx.diagnostic ?? '', ctx.pasted ?? '', ctx.verify?.status ?? '', ...(ctx.verify?.lines ?? [])].join('\n'));
  if (hints.length) tail.push(`Pista do Hub: o que foi lido combina com a falha conhecida ${hints.map((h) => `${h.id} (${h.name})`).join(', ')}.`);
  tail.push('Qual a próxima ação? Responda só com o JSON.');
  return maskForAi([lines.join('\n').slice(0, 6000), ...tail].join('\n'));
}
