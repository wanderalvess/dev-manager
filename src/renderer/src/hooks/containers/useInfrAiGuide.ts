import { useRef, useState } from 'react';
import {
  GUIDE_SYSTEM_PROMPT,
  buildGuideUserMessage,
  describeEnvCheckForAi,
  parseGuideReply,
  type GuideAction,
  type GuideContext,
  type GuideField
} from '../../../../shared/infrAiGuide';
import type { InfrNewVersionState } from './useInfrNewVersion';

export type InfrAiGuideStatus = 'idle' | 'thinking' | 'confirm' | 'building' | 'done';

export interface InfrAiGuideEntry {
  kind: 'ai' | 'hub' | 'error';
  text: string;
  commands?: string[];
}

const MAX_TURNS = 12;
const settle = () => new Promise((r) => setTimeout(r, 80));

/** Nome de cada campo como a tela mostra, para o registro do que a IA fez. */
const FIELD_LABEL: Record<GuideField, string> = {
  from: 'Origem',
  version: 'Versão',
  name: 'Nome',
  dbMode: 'Banco',
  oraclePort: 'Porta do Oracle',
  wtaPort: 'Porta do WTA',
  wshPort: 'Porta do WSH',
  dryRun: 'Ensaio no Karaf'
};
const DB_MODE_LABEL: Record<string, string> = { clone: 'copiado', existing: 'um Oracle que já existe', empty: 'vazio' };

/**
 * IA conduzindo a Nova versão. O modelo responde com uma ação por turno; o Hub valida e executa, e só o clique do
 * usuário gera o ambiente. A tela de sempre (formulário, conferência) continua sendo a fonte da verdade.
 */
export function useInfrAiGuide(s: InfrNewVersionState, distro?: string) {
  const latest = useRef(s);
  latest.current = s;
  const distroRef = useRef(distro);
  distroRef.current = distro;
  const [status, setStatus] = useState<InfrAiGuideStatus>('idle');
  const [log, setLog] = useState<InfrAiGuideEntry[]>([]);
  // Campos que a IA preencheu e a pessoa ainda não mexeu (a tela marca com "IA")
  const [filled, setFilled] = useState<GuideField[]>([]);
  const goal = useRef('');
  const history = useRef<string[]>([]);
  const verify = useRef<GuideContext['verify']>(undefined);
  const stopped = useRef(false);

  const push = (e: InfrAiGuideEntry) => setLog((l) => [...l, e]);
  const note = (text: string) => {
    history.current.push(text);
  };

  const context = (): GuideContext => {
    const cur = latest.current;
    return {
      goal: goal.current,
      envs: cur.envs?.environments.map((e) => e.name) ?? [],
      form: {
        from: cur.form.from,
        version: cur.form.version,
        name: cur.form.name,
        dbMode: cur.form.dbMode,
        oraclePort: cur.form.oraclePort,
        wtaPort: cur.form.wtaPort,
        wshPort: cur.form.wshPort,
        dryRun: cur.form.dryRun
      },
      review: cur.review.map((r) => ({ id: r.id, status: r.status, title: r.title, detail: r.detail })),
      previewError: cur.preview && !cur.preview.success ? cur.preview.error || 'erro desconhecido' : undefined,
      verify: verify.current,
      history: history.current
    };
  };

  /** Executa a ação; devolve true quando o laço deve seguir para outro turno do modelo. */
  const execute = async (a: GuideAction): Promise<boolean> => {
    const cur = latest.current;
    switch (a.action) {
      case 'set':
        cur.update(a.field, a.value);
        setFilled((f) => (f.includes(a.field) ? f : [...f, a.field]));
        push({
          kind: 'hub',
          text: `${FIELD_LABEL[a.field]}: ${(a.field === 'dbMode' ? DB_MODE_LABEL[a.value] : a.value) || '(vazio)'}. ${a.why}`
        });
        note(`set ${a.field}=${a.value}`);
        await settle();
        return true;
      case 'preview': {
        push({ kind: 'hub', text: `Leu a origem e o catálogo da 801. ${a.why}` });
        const res = await cur.runPreview();
        await settle();
        note(res ? (res.success ? 'preview: lido' : `preview: falhou (${res.error ?? 'erro'})`) : 'preview: não pôde rodar (origem, versão ou nome incompletos)');
        return true;
      }
      case 'generate':
        if (!latest.current.preview?.success) {
          push({ kind: 'error', text: 'Gerar recusado: a prévia ainda não foi lida.' });
          note('generate recusado: sem prévia');
          return true;
        }
        if (latest.current.blocked) {
          push({ kind: 'error', text: 'Gerar recusado: a conferência tem itens bloqueados (em vermelho).' });
          note('generate recusado: conferência bloqueada');
          return true;
        }
        push({ kind: 'ai', text: a.why });
        setStatus('confirm');
        return false;
      case 'verify': {
        const api = window.electronAPI;
        const name = latest.current.form.name.trim();
        if (!api?.checkInfrEnvironment || !name) {
          note('verify: indisponível');
          return true;
        }
        push({ kind: 'hub', text: `Conferiu os containers de ${name}. ${a.why}` });
        const check = await api.checkInfrEnvironment({ distro: distroRef.current, name });
        verify.current = describeEnvCheckForAi(check);
        push({ kind: 'hub', text: verify.current.status });
        note(`verify: ${verify.current.status}`);
        return true;
      }
      case 'say':
        push({ kind: 'ai', text: a.why, commands: a.commands });
        return false;
      case 'done':
        push({ kind: 'ai', text: a.why });
        setStatus('done');
        return false;
    }
  };

  const run = async () => {
    stopped.current = false;
    setStatus('thinking');
    let invalid = 0;
    let failed = false;
    for (let turn = 0; turn < MAX_TURNS && !stopped.current; turn++) {
      const ctx = context();
      let text: string;
      try {
        const res = await window.electronAPI!.llmChat({
          messages: [
            { role: 'system', content: GUIDE_SYSTEM_PROMPT },
            { role: 'user', content: buildGuideUserMessage(ctx) }
          ],
          temperature: 0.1,
          maxTokens: 700,
          noThinking: true
        });
        text = res.text;
      } catch (err) {
        push({ kind: 'error', text: err instanceof Error ? err.message : String(err) });
        failed = true;
        break;
      }
      if (stopped.current) break;
      const parsed = parseGuideReply(text, ctx.envs);
      if (!parsed.ok) {
        invalid++;
        note(`resposta recusada pelo Hub: ${parsed.error}`);
        if (invalid >= 2) {
          push({ kind: 'error', text: `O modelo não respondeu no formato esperado (${parsed.error}). Tente de novo ou use um modelo maior.` });
          failed = true;
          break;
        }
        continue;
      }
      invalid = 0;
      if (!(await execute(parsed.action))) {
        setStatus((cur) => (cur === 'confirm' || cur === 'done' ? cur : 'idle'));
        return;
      }
    }
    setStatus((cur) => (cur === 'confirm' || cur === 'done' ? cur : 'idle'));
    // limite de turnos atingido sem terminar
    if (!stopped.current && !failed) push({ kind: 'hub', text: 'Parei por aqui. Veja o que foi feito e continue pelo formulário, ou peça de novo.' });
  };

  const start = (text: string) => {
    const t = text.trim();
    if (!t || status === 'thinking') return;
    goal.current = t;
    history.current = [];
    verify.current = undefined;
    latest.current.resetPreview();
    setLog([]);
    setFilled([]);
    void run();
  };

  /** Continua o mesmo pedido de onde parou (ex.: depois de a pessoa iniciar a origem que estava parada). */
  const resume = () => {
    if (!goal.current || status === 'thinking') return;
    note('o usuário pediu para continuar (pode ter resolvido o que bloqueava)');
    void run();
  };

  /** A pessoa mexeu no campo: a marca "IA" sai dele. */
  const unmark = (field: string) => setFilled((f) => f.filter((x) => x !== field));

  /** O usuário confirmou o Gerar: roda o fluxo de sempre e espera o build terminar para conferir. */
  const confirmGenerate = async () => {
    setStatus('building');
    push({ kind: 'hub', text: 'Você clicou em Gerar: o terminal abriu com o build, que leva uns 30 minutos.' });
    const ok = await latest.current.generate();
    note(ok ? 'generate: terminal aberto, build em andamento' : 'generate: falhou ao iniciar');
    if (!ok) {
      push({ kind: 'error', text: latest.current.message || 'Não foi possível iniciar o Gerar.' });
      setStatus('idle');
    }
  };

  const declineGenerate = () => {
    note('o usuário não confirmou o Gerar');
    push({ kind: 'hub', text: 'Gerar não confirmado. Nada foi criado.' });
    setStatus('idle');
  };

  /** Depois do build: a IA lê a verificação e diz se subiu ou o que fazer. */
  const checkEnvironment = () => {
    history.current.push('o usuário pediu para conferir o ambiente depois do build');
    void execute({ action: 'verify', why: 'depois do build' }).then(() => run());
  };

  const stop = () => {
    stopped.current = true;
    setStatus('idle');
    push({ kind: 'hub', text: 'Interrompido.' });
  };

  return { status, log, filled, goal: goal.current, start, resume, unmark, stop, confirmGenerate, declineGenerate, checkEnvironment };
}

export type InfrAiGuideState = ReturnType<typeof useInfrAiGuide>;
