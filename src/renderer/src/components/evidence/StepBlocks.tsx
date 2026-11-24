import React, { useEffect, useState } from 'react';
import { Database, Globe, Play, Plus, Repeat, StickyNote, Trash2 } from 'lucide-react';
import {
  BLOCK_KIND_LABEL,
  EVIDENCE_CHECKS_HELP,
  EVIDENCE_HTTP_METHODS,
  PHASE_LABEL,
  groupBlocks,
  parseCurlCommand,
  parseHttpRequestText,
  type EvidenceBlock,
  type EvidenceBlockInput,
  type EvidenceBlockKind,
  type EvidenceHttpMethod,
  type EvidencePhase
} from '../../../../shared/evidenceTypes';
import type { HttpEnvironment, HttpMethod } from '../../../../shared/httpClientTypes';
import type { DatabaseConnectionConfig } from '../../../../shared/types';

const BTN =
  'h-8 px-2.5 border border-border rounded-[10px] bg-card hover:bg-muted text-xs font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY =
  'h-8 px-3 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const FIELD = 'px-2.5 border border-input rounded-[10px] bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full';
const MONO = `${FIELD} py-2 font-mono resize-y`;
const PHASE_TAG: Record<EvidencePhase, string> = {
  before: 'bg-amber-600 text-white',
  after: 'bg-green-600 text-white',
  single: 'bg-muted text-muted-foreground'
};
const KIND_ICON: Record<EvidenceBlockKind, React.ElementType> = { api: Globe, sql: Database, text: StickyNote };

/** Última chamada de API da sessão: o próximo passo costuma repetir a mesma requisição, então ela já vem preenchida. */
export interface ApiSuggestion {
  method: EvidenceHttpMethod;
  url: string;
  headers: string;
  body: string;
  environment?: string;
}

/** Pedido para abrir o compositor já no tipo escolhido (n muda a cada pedido, para reabrir mesmo no mesmo tipo). */
export interface ComposeRequest {
  kind: EvidenceBlockKind;
  n: number;
}

type BlockResult = Pick<EvidenceBlockInput, 'request' | 'response' | 'meta' | 'environment'>;

export interface StepBlocksApi {
  addBlock: (input: EvidenceBlockInput) => unknown;
  updateBlock: (blockId: string, patch: Partial<EvidenceBlockInput>) => unknown;
  deleteBlock: (blockId: string) => unknown;
  runHttp: (spec: { method: HttpMethod; url: string; headers: string; body: string; environmentId?: string }) => Promise<BlockResult>;
  runSql: (connectionId: string, sql: string) => Promise<BlockResult>;
  listConnections: () => Promise<DatabaseConnectionConfig[]>;
  listEnvironments: () => Promise<HttpEnvironment[]>;
}

/** Selo com o resultado das regras de aprovação da prova. */
const VerdictBadge: React.FC<{ verdict: EvidenceBlock['verdict'] }> = ({ verdict }) =>
  verdict ? (
    <div className={`rounded-[8px] p-2 text-xs space-y-0.5 ${verdict.passed ? 'bg-green-600/10 text-green-700' : 'bg-red-600/10 text-red-700'}`}>
      <p className="font-semibold">{verdict.passed ? 'Regras aprovadas' : 'Regras reprovadas'}</p>
      {verdict.results.map((r, i) => (
        <p key={i} className="font-mono">
          {r.ok ? '✓' : '✗'} {r.rule} <span className="opacity-70">({r.detail})</span>
        </p>
      ))}
    </div>
  ) : null;

const RULE_PRESETS: { label: string; rule: string; kinds: EvidenceBlockKind[]; title: string }[] = [
  { label: 'Status 200', rule: 'status 200', kinds: ['api'], title: 'Aprova se a API respondeu exatamente 200' },
  { label: 'Status 2xx', rule: 'status 2xx', kinds: ['api'], title: 'Aprova se a API respondeu qualquer sucesso (200 a 299)' },
  { label: 'Contém texto…', rule: 'contem ', kinds: ['api', 'sql'], title: 'Aprova se a resposta tem o texto. Escreva o texto depois de "contem" (ex.: contem idCargaInicial), sem aspas' },
  { label: 'Não contém erro', rule: 'nao contem erro', kinds: ['api', 'sql'], title: 'Aprova se a palavra "erro" não aparece na resposta' },
  { label: 'Linhas ≥ 1', rule: 'linhas >= 1', kinds: ['sql'], title: 'Aprova se a consulta devolveu pelo menos uma linha' },
  { label: 'Tempo < 500 ms', rule: 'tempo < 500', kinds: ['api', 'sql'], title: 'Aprova se respondeu em menos de 500 ms' },
  { label: 'JSON campo = valor…', rule: 'json data.status = OK', kinds: ['api'], title: 'Aprova se o campo do JSON tem o valor. Ajuste o caminho e o valor' }
];

/** Regras de aprovação com explicação e atalhos: cada atalho acrescenta uma regra pronta, uma por linha. */
const ChecksField: React.FC<{ kind: EvidenceBlockKind; value: string; onChange: (v: string) => void; onCommit?: (v: string) => void; rows?: number }> = ({
  kind,
  value,
  onChange,
  onCommit,
  rows = 2
}) => {
  const add = (rule: string) => {
    const next = value.trim() ? `${value.replace(/\s+$/, '')}\n${rule}` : rule;
    onChange(next);
    onCommit?.(next);
  };
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">Aprovar automaticamente (opcional)</div>
      <p className="text-2xs text-muted-foreground">
        Escreva o que a resposta precisa ter, uma regra por linha. Todas devem passar: se alguma falhar, o passo fica Reprovado; se todas passarem, Aprovado. Sem regras, você decide o resultado.
      </p>
      <div className="flex flex-wrap gap-1">
        {RULE_PRESETS.filter((p) => p.kinds.includes(kind)).map((p) => (
          <button key={p.rule} type="button" title={p.title} className="h-6 px-2 rounded-full border border-border bg-card hover:bg-muted text-2xs text-foreground cursor-pointer" onClick={() => add(p.rule)}>
            + {p.label}
          </button>
        ))}
      </div>
      <textarea
        className={MONO}
        rows={rows}
        title={EVIDENCE_CHECKS_HELP}
        placeholder={'status 200\ncontem idCargaInicial\nlinhas >= 1'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit?.(e.target.value)}
      />
    </div>
  );
};

const errorText = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** Cada bloco é editável no lugar: dá para colar a resposta do Postman ou o resultado de uma consulta feita fora do app. */
const BlockCard: React.FC<{
  block: EvidenceBlock;
  api: StepBlocksApi;
  rerun?: () => void;
  rerunning?: boolean;
}> = ({ block, api, rerun, rerunning }) => {
  const Icon = KIND_ICON[block.kind];
  const [checksText, setChecksText] = useState(block.checks ?? '');
  const requestLabel = block.kind === 'sql' ? 'Consulta' : 'Requisição';
  const responseLabel = block.kind === 'sql' ? 'Resultado' : block.kind === 'api' ? 'Resposta' : 'Conteúdo';
  const save = (field: 'request' | 'response' | 'meta' | 'title' | 'checks', current: string | undefined) => (e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    if (e.target.value !== (current ?? '')) void api.updateBlock(block.id, { [field]: e.target.value });
  };
  return (
    <div className="border border-border rounded-[10px] bg-muted/30 p-2.5 space-y-2 min-w-0">
      <div className="flex items-center gap-2">
        <span className={`px-2 py-0.5 rounded-full text-2xs font-semibold ${PHASE_TAG[block.phase]}`}>{PHASE_LABEL[block.phase]}</span>
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <input className={`${FIELD} h-8`} placeholder={`${BLOCK_KIND_LABEL[block.kind]} - título (opcional)`} defaultValue={block.title ?? ''} onBlur={save('title', block.title)} />
        <select
          className={`${FIELD} h-8 max-w-[110px]`}
          value={block.phase}
          onChange={(e) => void api.updateBlock(block.id, { phase: e.target.value as EvidencePhase })}
        >
          {(Object.keys(PHASE_LABEL) as EvidencePhase[]).map((p) => (
            <option key={p} value={p}>
              {PHASE_LABEL[p]}
            </option>
          ))}
        </select>
        {rerun && (
          <button type="button" className={BTN} disabled={rerunning} title="Executa de novo e registra o resultado como Depois" onClick={rerun}>
            <Repeat className="w-3.5 h-3.5" /> {rerunning ? 'Executando…' : 'Rodar como Depois'}
          </button>
        )}
        <button type="button" title="Excluir prova" className="p-1.5 rounded-[8px] text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer" onClick={() => void api.deleteBlock(block.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {block.kind !== 'text' && (
        <input className={`${FIELD} h-7 text-muted-foreground`} defaultValue={block.meta} placeholder="Resumo (status, tempo, linhas)" onBlur={save('meta', block.meta)} />
      )}
      {block.kind !== 'text' && (
        <textarea className={MONO} rows={3} placeholder={requestLabel} defaultValue={block.request ?? ''} onBlur={save('request', block.request)} />
      )}
      <textarea className={MONO} rows={block.kind === 'text' ? 4 : 5} placeholder={responseLabel} defaultValue={block.response ?? ''} onBlur={save('response', block.response)} />
      {block.kind !== 'text' && (
        <ChecksField
          kind={block.kind}
          value={checksText}
          onChange={setChecksText}
          onCommit={(v) => v !== (block.checks ?? '') && void api.updateBlock(block.id, { checks: v })}
        />
      )}
      <VerdictBadge verdict={block.verdict} />
    </div>
  );
};

/** Formulário para registrar uma prova nova: executa pelo app (API/SQL) ou cria em branco para colar do Postman/SQL externo. */
const Composer: React.FC<{ api: StepBlocksApi; onClose: () => void; initialPhase: EvidencePhase; initialKind: EvidenceBlockKind; suggestion?: ApiSuggestion }> = ({
  api,
  onClose,
  initialPhase,
  initialKind,
  suggestion
}) => {
  const [kind, setKind] = useState<EvidenceBlockKind>(initialKind);
  const [phase, setPhase] = useState<EvidencePhase>(initialPhase);
  const [title, setTitle] = useState('');
  const [method, setMethod] = useState<EvidenceHttpMethod>(suggestion?.method ?? 'GET');
  const [url, setUrl] = useState(suggestion?.url ?? '');
  const [headers, setHeaders] = useState(suggestion?.headers ?? '');
  const [body, setBody] = useState(suggestion?.body ?? '');
  const [sql, setSql] = useState('');
  const [text, setText] = useState('');
  const [connections, setConnections] = useState<DatabaseConnectionConfig[]>([]);
  const [connectionId, setConnectionId] = useState('');
  const [environments, setEnvironments] = useState<HttpEnvironment[]>([]);
  const [environmentId, setEnvironmentId] = useState('');
  const [checks, setChecks] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [importNote, setImportNote] = useState<{ ok: boolean; text: string } | null>(null);

  // Variável TOKEN do ambiente escolhido: dá para usar "Bearer {{TOKEN}}" sem o segredo ir parar na evidência.
  const tokenVar = environments.find((e) => e.id === environmentId)?.variables.find((v) => v.enabled && v.key.toUpperCase() === 'TOKEN');
  const tokenHeader = tokenVar ? `Authorization: Bearer {{${tokenVar.key}}}` : '';
  const usesTokenHeader = !!tokenHeader && headers.split(/\r?\n/).some((l) => l.trim() === tokenHeader);
  const toggleTokenHeader = () => {
    const lines = headers.split(/\r?\n/).filter((l) => l.trim() && !/^authorization\s*:/i.test(l));
    setHeaders((usesTokenHeader ? lines : [tokenHeader, ...lines]).join('\n'));
  };

  /** Preenche método, URL, cabeçalhos e corpo a partir de um cURL (ou "GET url"). Devolve false se o texto não for uma requisição. */
  const importRequest = (raw: string): boolean => {
    const spec = parseCurlCommand(raw);
    if (!spec) return false;
    // Token igual ao do ambiente vira {{TOKEN}}; qualquer outro segredo em claro é mascarado ao gravar a prova.
    let importedHeaders = spec.headers;
    let swapped = false;
    if (tokenVar?.value) {
      importedHeaders = importedHeaders
        .split('\n')
        .map((l) => {
          const m = /^(authorization\s*:\s*bearer\s+)(.+)$/i.exec(l.trim());
          if (!m || m[2].trim() !== tokenVar.value.trim()) return l;
          swapped = true;
          return tokenHeader;
        })
        .join('\n');
    }
    const hasSecret = !swapped && /^(authorization|cookie|x-api-key|x-auth-token|apikey)\s*:/im.test(importedHeaders) && !/\{\{/.test(importedHeaders);
    setMethod(spec.method);
    setUrl(spec.url);
    setHeaders(importedHeaders);
    setBody(spec.body);
    const extras = [importedHeaders && `${importedHeaders.split('\n').length} cabeçalho(s)`, spec.body && 'corpo'].filter(Boolean).join(' e ');
    const tokenNote = swapped ? ` O token do ambiente foi trocado por {{${tokenVar?.key}}}.` : hasSecret ? ' A credencial vai na chamada, mas aparece mascarada no registro e no relatório.' : '';
    setImportNote({ ok: true, text: `Preenchido: ${spec.method} ${spec.url.length > 70 ? `${spec.url.slice(0, 70)}…` : spec.url}${extras ? ` com ${extras}` : ''}.${tokenNote}` });
    return true;
  };

  const onImportPaste = (value: string) => {
    if (!value.trim()) return;
    if (!importRequest(value)) setImportNote({ ok: false, text: 'Não reconheci como cURL. Cole o comando inteiro, começando por "curl", ou "GET http://...".' });
  };

  useEffect(() => {
    void api.listConnections().then((list) => {
      setConnections(list);
      setConnectionId((cur) => cur || (list.find((c) => c.isDefault) ?? list[0])?.id || '');
    });
    void api.listEnvironments().then((list) => {
      setEnvironments(list);
      const reused = suggestion?.environment ? list.find((e) => e.name === suggestion.environment) : undefined;
      setEnvironmentId((cur) => cur || (reused ?? list.find((e) => e.isDefault) ?? list[0])?.id || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (fields: BlockResult) => {
    void api.addBlock({ kind, phase, title: title || undefined, checks: checks.trim() || undefined, ...fields });
    onClose();
  };

  const execute = async () => {
    setBusy(true);
    setError('');
    try {
      finish(kind === 'api' ? await api.runHttp({ method, url, headers, body, environmentId: environmentId || undefined }) : await api.runSql(connectionId, sql));
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const registerOnly = () => {
    if (kind === 'text') return finish({ response: text });
    if (kind === 'sql') return finish({ request: sql, meta: '' });
    const head = [`${method} ${url.trim()}`, headers.trim(), body.trim() ? `\n${body.trim()}` : ''].filter(Boolean).join('\n');
    finish({ request: head, meta: '' });
  };

  const canRun = kind === 'api' ? !!url.trim() : kind === 'sql' ? !!sql.trim() && !!connectionId : false;
  const canRegister = kind === 'api' ? !!url.trim() : kind === 'sql' ? !!sql.trim() : !!text.trim();

  return (
    <div className="border border-dashed border-border rounded-[10px] p-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(BLOCK_KIND_LABEL) as EvidenceBlockKind[]).map((k) => {
          const Icon = KIND_ICON[k];
          return (
            <button key={k} type="button" className={`${BTN} ${kind === k ? 'bg-muted ring-1 ring-ring' : ''}`} onClick={() => setKind(k)}>
              <Icon className="w-3.5 h-3.5" /> {BLOCK_KIND_LABEL[k]}
            </button>
          );
        })}
        <select
          className={`${FIELD} h-8 max-w-[120px]`}
          value={phase}
          title="Evidência: prova única. Antes/Depois: comparar o resultado antes e depois da correção, lado a lado."
          onChange={(e) => setPhase(e.target.value as EvidencePhase)}
        >
          {(Object.keys(PHASE_LABEL) as EvidencePhase[]).map((p) => (
            <option key={p} value={p}>
              {PHASE_LABEL[p]}
            </option>
          ))}
        </select>
        <input className={`${FIELD} h-8 max-w-[220px]`} placeholder="Título (opcional)" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {kind === 'api' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <textarea
              className={`${MONO} h-9 min-h-9`}
              rows={1}
              placeholder="Cole aqui um cURL (Copiar como cURL do navegador ou do Postman): preenche tudo abaixo"
              onPaste={(e) => {
                e.preventDefault();
                onImportPaste(e.clipboardData.getData('text'));
              }}
              onChange={(e) => (e.target.value = '')}
            />
            {importNote && <p className={`text-xs ${importNote.ok ? 'text-green-700' : 'text-red-600'}`}>{importNote.text}</p>}
          </div>
          {environments.length > 0 && (
            <select className={`${FIELD} h-8`} value={environmentId} onChange={(e) => setEnvironmentId(e.target.value)} title="Ambiente do API Studio: resolve {{variáveis}} na URL, cabeçalhos e corpo">
              <option value="">Sem ambiente (URL completa)</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  Ambiente: {e.name}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <select className={`${FIELD} h-8 max-w-[100px]`} value={method} onChange={(e) => setMethod(e.target.value as EvidenceHttpMethod)}>
              {EVIDENCE_HTTP_METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
            <textarea
              className={`${MONO} min-h-8`}
              rows={2}
              spellCheck={false}
              placeholder="https://servidor/api/recurso?filtro=1 (ou cole um cURL)"
              value={url}
              onChange={(e) => setUrl(e.target.value.replace(/[\r\n]+/g, ''))}
              onPaste={(e) => {
                const pasted = e.clipboardData.getData('text');
                if (/^\s*curl(\.exe)?\s/i.test(pasted) && importRequest(pasted)) e.preventDefault();
              }}
            />
          </div>
          <textarea className={MONO} rows={2} placeholder={'Cabeçalhos, um por linha (Authorization: Bearer ...)'} value={headers} onChange={(e) => setHeaders(e.target.value)} />
          {tokenVar ? (
            <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
              <input type="checkbox" checked={usesTokenHeader} onChange={toggleTokenHeader} />
              Autenticar com o token do ambiente (<code className="font-mono">{tokenHeader}</code>; o valor real não é gravado)
            </label>
          ) : (
            <p className="text-2xs text-muted-foreground">
              Credenciais digitadas aqui são mascaradas no registro e no relatório. Para autenticar sem expor, use um ambiente do API Studio com a variável TOKEN.
            </p>
          )}
          <textarea className={MONO} rows={3} placeholder="Corpo (JSON ou texto)" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
      )}
      {kind === 'sql' && (
        <div className="space-y-2">
          <select className={`${FIELD} h-8`} value={connectionId} onChange={(e) => setConnectionId(e.target.value)}>
            {connections.length === 0 && <option value="">Nenhuma conexão cadastrada (dá para registrar sem executar)</option>}
            {connections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
          <textarea className={MONO} rows={4} placeholder="SELECT ... (só leitura roda aqui)" value={sql} onChange={(e) => setSql(e.target.value)} />
        </div>
      )}
      {kind === 'text' && <textarea className={MONO} rows={4} placeholder="Log, saída de comando, observação..." value={text} onChange={(e) => setText(e.target.value)} />}
      {kind !== 'text' && <ChecksField kind={kind} value={checks} onChange={setChecks} />}

      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {kind !== 'text' && (
          <button type="button" className={BTN_PRIMARY} disabled={busy || !canRun} onClick={() => void execute()}>
            <Play className="w-3.5 h-3.5" /> {busy ? 'Executando…' : kind === 'api' ? 'Chamar API e anexar ao passo' : 'Executar consulta e anexar ao passo'}
          </button>
        )}
        <button type="button" className={BTN} disabled={busy || !canRegister} onClick={registerOnly}>
          <Plus className="w-3.5 h-3.5" /> {kind === 'text' ? 'Anexar ao passo' : 'Só anexar (vou colar o resultado)'}
        </button>
        <button type="button" className={BTN} onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export const StepBlocks: React.FC<{ blocks: EvidenceBlock[] | undefined; api: StepBlocksApi; openRequest?: ComposeRequest | null; suggestion?: ApiSuggestion }> = ({
  blocks,
  api,
  openRequest,
  suggestion
}) => {
  const [composing, setComposing] = useState(false);
  const [composeKind, setComposeKind] = useState<EvidenceBlockKind>('api');
  const [composeKey, setComposeKey] = useState(0);

  useEffect(() => {
    if (!openRequest) return;
    setComposeKind(openRequest.kind);
    setComposeKey(openRequest.n);
    setComposing(true);
  }, [openRequest]);

  const [rerunId, setRerunId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const rows = groupBlocks(blocks);
  const hasBefore = rows.some((r) => r.before && !r.after);

  const rerunAsAfter = async (block: EvidenceBlock) => {
    setRerunId(block.id);
    setError('');
    try {
      if (block.kind === 'api') {
        const spec = parseHttpRequestText(block.request);
        if (!spec) throw new Error('Não consegui ler a requisição deste bloco (esperado "MÉTODO url" na primeira linha).');
        const envs = block.environment ? await api.listEnvironments() : [];
        const environmentId = envs.find((e) => e.name === block.environment)?.id;
        if (block.environment && !environmentId) throw new Error(`Ambiente "${block.environment}" não existe mais no API Studio.`);
        await api.addBlock({ kind: 'api', phase: 'after', title: block.title, checks: block.checks, ...(await api.runHttp({ ...spec, environmentId })) });
      } else {
        const connections = await api.listConnections();
        const name = block.meta?.split('·').pop()?.trim();
        const conn = connections.find((c) => c.name === name) ?? connections.find((c) => c.isDefault) ?? connections[0];
        if (!conn) throw new Error('Nenhuma conexão cadastrada em Banco de Dados.');
        await api.addBlock({ kind: 'sql', phase: 'after', title: block.title, checks: block.checks, ...(await api.runSql(conn.id, block.request ?? '')) });
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setRerunId(null);
    }
  };

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const cells = [row.before, row.after, row.single].filter((b): b is EvidenceBlock => !!b);
        return (
          <div key={cells.map((c) => c.id).join('-') || i} className={`grid gap-2 ${cells.length > 1 ? 'lg:grid-cols-2' : ''}`}>
            {cells.map((b) => (
              <BlockCard
                key={b.id}
                block={b}
                api={api}
                rerun={b.phase === 'before' && !row.after && b.kind !== 'text' ? () => void rerunAsAfter(b) : undefined}
                rerunning={rerunId === b.id}
              />
            ))}
          </div>
        );
      })}
      {error && <p className="text-xs text-red-600">{error}</p>}
      {composing ? (
        <Composer key={composeKey} api={api} initialPhase={hasBefore ? 'after' : 'single'} initialKind={composeKind} suggestion={suggestion} onClose={() => setComposing(false)} />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(BLOCK_KIND_LABEL) as EvidenceBlockKind[]).map((k) => {
            const Icon = KIND_ICON[k];
            return (
              <button
                key={k}
                type="button"
                className={BTN}
                onClick={() => {
                  setComposeKind(k);
                  setComposeKey((n) => n + 1);
                  setComposing(true);
                }}
              >
                <Icon className="w-3.5 h-3.5" /> {k === 'text' ? 'Anotação' : k === 'api' ? 'Prova de API' : 'Prova de SQL'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
