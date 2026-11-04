import React, { useState } from 'react';
import { ChevronDown, Play, RotateCw } from 'lucide-react';
import type { InfrReviewFix, InfrReviewStatus } from '../../../../../../shared/infrNewVersionReview';
import { multilineCommand } from '../../../../../../shared/infrEnvCheck';
import type { InfrNewVersionState } from '../../../../hooks/containers/useInfrNewVersion';
import { showToast } from '../../../ToastHost';
import { InfrCommandLine } from '../InfrCommandLine';
import { InfrManifestChoice } from '../InfrManifestChoice';
import { InfrNewVersionPreview } from '../InfrNewVersionPreview';
import { InfrPreviewLog } from '../InfrPreviewLog';
import { InfrCheckRow, type InfrCheckItem, type InfrCheckTone } from './InfrCheckRow';
import { InfrWtaLoginForm } from './InfrWtaLoginForm';

const TONE: Record<InfrReviewStatus, InfrCheckTone> = { ok: 'ok', warn: 'warn', block: 'block' };
const SMALL = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

/**
 * "Antes de criar": a conferência da origem (pasta, WTA e login) e a leitura do catálogo da 801 numa lista só.
 * O que impede vem primeiro, com a ação de resolver ali; o que passou fica numa linha, para abrir se quiser.
 */
export const InfrNewVersionChecks: React.FC<{ s: InfrNewVersionState; distro?: string }> = ({ s, distro }) => {
  // null = automático: abre quando algo impede ou há aviso com comando para copiar; a pessoa pode forçar
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const { form, origin, preview } = s;
  const r = origin.result;

  const startOrigin = async () => {
    const api = window.electronAPI;
    if (!api?.startInfrEnvironment) return showToast('Iniciar só funciona no aplicativo.', 'info');
    setStarting(true);
    try {
      const res = await api.startInfrEnvironment({ distro: distro || s.envs?.distro, name: form.from });
      if (!res.success) showToast(`Não subiu o ${form.from}: ${res.error || res.failed || 'erro desconhecido'}`, 'error');
      else showToast(`${form.from} iniciado. O WinThor leva uns 2 minutos para responder.`, 'success');
      await origin.check();
    } finally {
      setStarting(false);
    }
  };

  const fixLabel: Record<InfrReviewFix, string> = {
    useSourceOracle: `Usar o ${form.dbSource} direto`,
    emptyOracle: 'Criar um Oracle vazio e importar o dump depois'
  };

  const items: InfrCheckItem[] = [];
  if (form.from) {
    if (!r) items.push({ key: 'origem', tone: origin.loading ? 'busy' : 'pending', title: `Conferindo o ${form.from}`, detail: 'Pasta do INFR-Docker, WTA de origem e login.' });
    else if (!r.success) items.push({ key: 'origem', tone: 'block', title: 'Não foi possível conferir a origem', detail: r.error });
    else
      // Clonar não lê o catálogo: o WTA parado e o login dele não entram; só a pasta do INFR-Docker
      for (const it of s.clone ? r.items.filter((x) => x.id === 'pasta') : r.items) {
        const stopped = it.id === 'wta' && it.status === 'block' && s.envs?.environments.some((e) => e.name === form.from && e.wta && e.wta.state !== 'running');
        items.push({
          key: `origem-${it.id}`,
          tone: TONE[it.status],
          title: it.title,
          detail: it.detail,
          extra: it.askCredentials ? (
            <InfrWtaLoginForm o={origin} />
          ) : stopped ? (
            <button type="button" onClick={startOrigin} disabled={starting} className={`${SMALL} border-warning bg-warning text-white`}>
              {starting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              {starting ? 'Iniciando...' : `Iniciar o ${form.from}`}
            </button>
          ) : undefined
        });
      }
  }

  const catalog = s.clone ? `Imagem e portas do clone da ${form.version || '<versão>'}` : `Features da ${form.version || '<versão>'} pelo catálogo da 801`;
  if (s.busy === 'preview') items.push({ key: 'leitura', tone: 'busy', title: catalog, detail: s.clone ? `Conferindo a imagem do wta-${form.from} e as portas...` : `Lendo o wta-${form.from} e o catálogo da rotina 801...` });
  else if (!preview)
    items.push({
      key: 'leitura',
      tone: 'pending',
      title: catalog,
      detail:
        s.formIssue ||
        (origin.blocked
          ? 'Conferido depois que a origem passar.'
          : s.clone
            ? 'Confere se a imagem da versão existe, a lista de features e as portas livres. Não lê o catálogo nem troca feature.'
            : 'Lê as features da origem e sobe cada uma pelo catálogo até a versão nova.'),
      extra:
        !s.formIssue && !origin.blocked ? (
          <button type="button" onClick={s.runPreview} disabled={!s.canPreview} className={`${SMALL} border-warning/60 bg-card text-warning hover:bg-warning/10`}>
            {s.clone ? 'Conferir o clone' : 'Ler a origem e o catálogo'}
          </button>
        ) : undefined
    });
  else
    for (const it of s.review)
      items.push({
        key: `rev-${it.id}`,
        tone: TONE[it.status],
        title: it.title,
        detail: it.detail,
        extra: it.fixes && (
          <div className="flex flex-wrap gap-2">
            {it.fixes.map((fix) => (
              <button key={fix} type="button" onClick={() => s.applyFix(fix)} className={`${SMALL} border-border bg-card text-foreground hover:bg-muted`}>
                {fixLabel[fix]}
              </button>
            ))}
          </div>
        )
      });

  const okItems = items.filter((i) => i.tone === 'ok');
  const open = items.filter((i) => i.tone !== 'ok');
  const blocks = items.filter((i) => i.tone === 'block').length;
  const warns = items.filter((i) => i.tone === 'warn').length;
  const waiting = items.some((i) => i.tone === 'pending' || i.tone === 'busy');
  const firstBlock = items.find((i) => i.tone === 'block');
  // Aviso que traz um comando ou um botão (docker, git...) tem de aparecer sem a pessoa abrir nada
  const hasCommand = open.some((i) => i.tone === 'warn' && (!!i.extra || /(docker|git|sudo|wsl) /i.test(i.detail ?? '')));
  const listOpen = manualOpen ?? (blocks > 0 || hasCommand || open.some((i) => i.tone === 'pending'));
  const summary = blocks
    ? 'text-danger'
    : waiting
      ? 'text-muted-foreground'
      : 'text-success';
  const parts = [
    blocks ? `${blocks} ${blocks > 1 ? 'impedem' : 'impede'}` : '',
    warns ? `${warns} ${warns > 1 ? 'avisos' : 'aviso'}` : '',
    okItems.length ? `${okItems.length} ${okItems.length > 1 ? 'conferidos' : 'conferido'}` : '',
    !blocks && waiting ? 'conferindo' : '',
    !blocks && !waiting && !warns ? 'nada impede' : ''
  ].filter(Boolean);

  const recheck = async () => {
    await origin.check();
    if (preview) s.runPreview();
  };

  return (
    <section aria-label="Antes de criar" className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm font-bold text-foreground">
          <span className="text-muted-foreground font-mono">4 ·</span> Antes de criar
        </h3>
        <span role="status" className={`text-xs font-semibold ${summary}`}>
          {parts.join(' · ')}
        </span>
        {!listOpen && firstBlock && <span className="text-xs text-danger break-words">{firstBlock.title}</span>}
        <span className="flex-1" />
        {items.length > 0 && (
          <button type="button" onClick={() => setManualOpen(!listOpen)} aria-expanded={listOpen} className="inline-flex items-center gap-1 text-xs font-semibold text-warning hover:underline cursor-pointer">
            {listOpen ? 'Ocultar detalhes' : 'Ver detalhes'} <ChevronDown className={`w-3 h-3 transition ${listOpen ? 'rotate-180' : ''}`} />
          </button>
        )}
        <button type="button" onClick={recheck} disabled={origin.loading || s.busy !== null || !form.from} className="inline-flex items-center gap-1.5 text-xs font-semibold text-warning hover:underline cursor-pointer disabled:opacity-50">
          <RotateCw className={`w-3.5 h-3.5 ${origin.loading ? 'animate-spin' : ''}`} /> Conferir de novo
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground p-4 rounded-xl border border-dashed border-border">Escolha a origem para o Hub conferir.</p>
      ) : (
        listOpen && (
          <ul className="rounded-xl border border-border/80 bg-card overflow-hidden">
            {[...open, ...okItems].map((it) => (
              <InfrCheckRow key={it.key} item={it} />
            ))}
          </ul>
        )
      )}

      {preview?.success && !s.clone && <InfrManifestChoice s={s} />}

      {preview && (
        <div className="space-y-2">
          {preview.success && !s.clone && (
            <details className="rounded-xl border border-border/80 bg-card px-4 py-3">
              <summary className="text-xs font-semibold text-foreground cursor-pointer">Detalhes do catálogo da 801</summary>
              <div className="mt-3">
                <InfrNewVersionPreview preview={preview} version={form.version} />
              </div>
            </details>
          )}
          {(!!preview.log?.length || !!s.command) && (
            <details open={!preview.success} className="rounded-xl border border-border/80 bg-card px-4 py-3">
              <summary className="text-xs font-semibold text-foreground cursor-pointer">Registro técnico</summary>
              <div className="mt-3 space-y-3">
                {!!preview.log?.length && <InfrPreviewLog lines={preview.log} open={!preview.success} />}
                {s.command && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground">Comando que a criação vai rodar</p>
                    <InfrCommandLine block command={`cd linux-winthor/scripts\n${multilineCommand(s.command)}`} />
                    <p className="text-2xs text-muted-foreground">Roda a partir da pasta do INFR-Docker no WSL.</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}
    </section>
  );
};
