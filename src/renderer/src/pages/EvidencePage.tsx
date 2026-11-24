import React, { useEffect, useState } from 'react';
import { Camera, ClipboardList, FileText, MousePointerClick, FolderOpen, NotebookPen, Play, Presentation, Save, Send, Square, Trash2, Video } from 'lucide-react';
import { EVIDENCE_HOTKEY, RESULT_LABEL, guessJiraKey, parseHttpRequestText, summarizeEvidence, type EvidenceJiraIssue, type EvidenceKind, type EvidenceResult, type EvidenceSession } from '../../../shared/evidenceTypes';
import type { ApiSuggestion } from '../components/evidence/StepBlocks';
import { JiraPublishModal } from '../components/evidence/JiraPublishModal';
import { PrDescriptionModal } from '../components/evidence/PrDescriptionModal';
import { SessionDetails } from '../components/evidence/SessionDetails';
import { StepCard, type AfterCaptureMode } from '../components/evidence/StepCard';

const AFTER_CAPTURE_OPTIONS: { value: AfterCaptureMode; label: string }[] = [
  { value: 'ask', label: 'Perguntar se quero provar com API/SQL' },
  { value: 'api', label: 'Abrir direto a prova de API' },
  { value: 'off', label: 'Não sugerir nada' }
];
import { QualityPageShell } from '../components/quality/page/QualityPageShell';
import { useEvidence } from '../hooks/evidence/useEvidence';

interface EvidencePageProps {
  isActive?: boolean;
}

const BTN =
  'h-10 px-3 border border-border rounded-[10px] bg-card hover:bg-muted text-sm font-medium text-foreground flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_PRIMARY =
  'h-10 px-4 rounded-[10px] bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT = 'h-10 px-3 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full';
const TEXTAREA = 'px-3 py-2 border border-input rounded-[10px] bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-2 focus:ring-ring w-full resize-y';
const CARD = 'border border-border rounded-[14px] bg-card p-4 shadow-xs';
const LABEL = 'text-xs font-medium text-muted-foreground';
/** Última requisição de API da sessão, para o próximo passo já vir preenchido. */
function lastApiSuggestion(session: EvidenceSession): ApiSuggestion | undefined {
  for (const step of [...session.steps].reverse()) {
    for (const block of [...(step.blocks ?? [])].reverse()) {
      if (block.kind !== 'api') continue;
      const spec = parseHttpRequestText(block.request);
      if (spec) return { ...spec, environment: block.environment };
    }
  }
  return undefined;
}

const FLOW = ['Capture o passo', 'Complemente com API ou SQL', 'Gere o relatório'];

const RESULT_STYLE: Record<EvidenceResult, string> = {
  pending: 'bg-muted text-muted-foreground',
  passed: 'bg-green-600 text-white',
  failed: 'bg-red-600 text-white'
};

const NewSessionForm: React.FC<{ busy: boolean; lookupIssue: (key: string) => Promise<EvidenceJiraIssue>; onCreate: (input: { task: string; title: string; kind: EvidenceKind; tester: string; environment: string }) => void }> = ({
  busy,
  lookupIssue,
  onCreate
}) => {
  const [task, setTask] = useState('');
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EvidenceKind>('qa');
  const [tester, setTester] = useState('');
  const [environment, setEnvironment] = useState('');
  const [jiraInfo, setJiraInfo] = useState<{ kind: 'info' | 'error'; text: string } | null>(null);
  const [looking, setLooking] = useState(false);

  const fetchIssue = async () => {
    const key = guessJiraKey(task);
    if (!key || looking) return;
    setLooking(true);
    const res = await lookupIssue(key);
    setLooking(false);
    if (!res.success) return setJiraInfo({ kind: 'error', text: res.error ?? 'Falha ao consultar o Jira.' });
    setTask(res.issueKey ?? key);
    if (res.summary && !title.trim()) setTitle(res.summary);
    if (res.assignee && !tester.trim()) setTester(res.assignee);
    setJiraInfo({ kind: 'info', text: `${res.issueKey}: ${res.summary ?? ''}${res.status ? ` · ${res.status}` : ''}` });
  };

  return (
    <div className={`${CARD} space-y-3`}>
      <h2 className="text-base font-semibold text-foreground">Nova evidência</h2>
      <div className="space-y-1.5">
        <label className={LABEL}>Tarefa (Jira, opcional)</label>
        <div className="flex gap-2">
        <input
          className={INPUT}
          placeholder="Ex.: WT-123 (só é exigida para publicar no Jira)"
          value={task}
          onChange={(e) => {
            setTask(e.target.value);
            setJiraInfo(null);
          }}
          onBlur={() => void fetchIssue()}
          onKeyDown={(e) => e.key === 'Enter' && void fetchIssue()}
        />
        <button type="button" className={BTN} disabled={looking || !guessJiraKey(task)} onClick={() => void fetchIssue()}>
          {looking ? 'Buscando…' : 'Buscar'}
        </button>
        </div>
        {jiraInfo && <p className={`text-xs ${jiraInfo.kind === 'error' ? 'text-red-600' : 'text-muted-foreground'}`}>{jiraInfo.text}</p>}
      </div>
      <div className="space-y-1.5">
        <label className={LABEL}>Título</label>
        <input className={INPUT} placeholder="Preenchido pelo Jira, se houver tarefa; senão, um nome para a evidência" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <label className={LABEL}>Tipo</label>
          <select className={INPUT} value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)}>
            <option value="qa">Teste (QA)</option>
            <option value="dev">Desenvolvimento</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className={LABEL}>Responsável</label>
          <input className={INPUT} placeholder="Nome" value={tester} onChange={(e) => setTester(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className={LABEL}>Ambiente</label>
        <textarea className={TEXTAREA} rows={2} placeholder="Versão / branch / banco" value={environment} onChange={(e) => setEnvironment(e.target.value)} />
      </div>
      <button type="button" className={`${BTN_PRIMARY} w-full`} disabled={busy} onClick={() => onCreate({ task, title, kind, tester, environment })}>
        Iniciar evidência
      </button>
    </div>
  );
};

export const EvidencePage: React.FC<EvidencePageProps> = ({ isActive = true }) => {
  const ev = useEvidence(isActive);
  const { session } = ev;
  const [publishing, setPublishing] = useState(false);
  const [prDescription, setPrDescription] = useState(false);
  const [stepTitle, setStepTitle] = useState('');
  // Mesma preferência de Configurações > Qualidade: lida ao abrir a tela e gravada ao mudar aqui.
  const [afterCapture, setAfterCapture] = useState<AfterCaptureMode>('ask');

  useEffect(() => {
    if (!isActive) return;
    let alive = true;
    void window.electronAPI.getSettings().then((s) => alive && setAfterCapture(s.evidenceAfterCapture ?? 'ask'));
    return () => {
      alive = false;
    };
  }, [isActive]);

  const changeAfterCapture = (mode: AfterCaptureMode) => {
    setAfterCapture(mode);
    void window.electronAPI.saveSettings({ evidenceAfterCapture: mode });
  };

  useEffect(() => {
    setPublishing(false);
    setPrDescription(false);
  }, [session?.id]);

  const summary = session ? summarizeEvidence(session.steps) : null;
  const suggestion = session ? lastApiSuggestion(session) : undefined;

  return (
    <QualityPageShell icon={Camera} title="Evidências" description="Grave tela, tire prints e registre passos de teste ou desenvolvimento em relatório HTML/PDF.">
      <div className="flex-1 overflow-auto px-4 py-3 md:px-5 md:py-4 grid gap-4 lg:grid-cols-[360px_1fr] content-start">
        <div className="space-y-4">
          <NewSessionForm busy={ev.busy} lookupIssue={ev.lookupIssue} onCreate={(input) => void ev.create(input)} />
          <div className={CARD}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">Histórico</h2>
              <button type="button" className={BTN} onClick={() => void ev.openFolder(true)}>
                <FolderOpen className="w-3.5 h-3.5" /> Pasta
              </button>
            </div>
            {ev.sessions.length === 0 && <p className="text-[13px] text-muted-foreground py-2">Nenhuma evidência gravada ainda.</p>}
            <ul className="space-y-1">
              {ev.sessions.map((s) => (
                <li key={s.id} className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-xs transition-colors ${session?.id === s.id ? 'bg-muted' : 'hover:bg-muted/60'}`}>
                  <button type="button" className="flex-1 text-left min-w-0" onClick={() => void ev.open(s.id)}>
                    <div className="text-sm font-medium text-foreground truncate">{s.title}</div>
                    <div className="text-muted-foreground">
                      {new Date(s.createdAt).toLocaleString('pt-BR')} · {s.stepCount} passos{s.failed ? ` · ${s.failed} reprovados` : ''}
                      {s.videoCount ? ` · ${s.videoCount} vídeo(s)` : ''}
                    </div>
                  </button>
                  <button
                    type="button"
                    title="Excluir evidência"
                    className="p-1 rounded-[8px] text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer"
                    onClick={() => window.confirm(`Excluir "${s.title}" e todos os arquivos?`) && void ev.remove(s.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          {ev.message && (
            <div className={`text-[13px] rounded-[10px] px-3 py-2.5 border bg-card ${ev.message.kind === 'error' ? 'border-red-500/50 text-red-600' : 'border-border text-foreground'}`}>
              {ev.message.text}
            </div>
          )}

          {!session && (
            <div className="bg-card rounded-[14px] p-12 border border-border shadow-xs flex flex-col items-center gap-3 text-center">
              <Camera className="w-8 h-8 text-muted-foreground" />
              <p className="text-base font-semibold text-foreground">Nenhuma evidência aberta</p>
              <p className="text-[13px] text-muted-foreground max-w-md">Inicie uma nova evidência ao lado ou abra uma do histórico para gravar a tela, tirar prints e registrar os passos.</p>
            </div>
          )}

          {session && summary && (
            <>
              <div className={`${CARD} space-y-4`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-foreground truncate">{session.title}</h2>
                    <p className="text-[13px] text-muted-foreground">
                      {[session.task, session.kind === 'qa' ? 'Teste' : 'Desenvolvimento'].filter(Boolean).join(' · ')} · {summary.passed}/{summary.total} aprovados
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESULT_STYLE[summary.verdict]}`}>{RESULT_LABEL[summary.verdict]}</span>
                  <button type="button" className={BTN} onClick={ev.close}>
                    Fechar
                  </button>
                </div>

                <SessionDetails session={session} onUpdate={(patch) => void ev.updateSession(patch)} />

                <div className="border-t border-border pt-4 space-y-3">
                  <ol className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {FLOW.map((label, i) => (
                      <li key={label} className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-muted text-foreground font-semibold flex items-center justify-center">{i + 1}</span>
                        <span>{label}</span>
                        {i < FLOW.length - 1 && <span aria-hidden="true">→</span>}
                      </li>
                    ))}
                  </ol>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Capturar de" className={`${INPUT} max-w-[220px]`} value={ev.sourceId} onChange={(e) => ev.setSourceId(e.target.value)} onFocus={() => void ev.refreshSources()}>
                      {ev.sources.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.isScreen ? 'Tela: ' : 'Janela: '}
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input className={`${INPUT} max-w-[240px]`} placeholder="Título do passo (opcional)" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
                    <button type="button" className={BTN_PRIMARY} disabled={ev.busy} title={`Atalho global: ${EVIDENCE_HOTKEY.replace('CommandOrControl', 'Ctrl')}`} onClick={() => void Promise.resolve(ev.capture(stepTitle)).then(() => setStepTitle(''))}>
                      <Camera className="w-4 h-4" /> Tirar print
                    </button>
                    <button type="button" className={BTN} disabled={ev.busy} title="Registra um passo só com texto e provas, sem imagem" onClick={() => void Promise.resolve(ev.addNote(stepTitle)).then(() => setStepTitle(''))}>
                      <NotebookPen className="w-3.5 h-3.5" /> Passo sem print
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={LABEL}>Automático:</span>
                    {ev.recordingClicks ? (
                      <button type="button" className={`${BTN_PRIMARY} bg-red-600 hover:bg-red-600/90`} onClick={() => void ev.stopClickRecording()}>
                        <Square className="w-3.5 h-3.5" /> Parar cliques
                      </button>
                    ) : (
                      <button type="button" className={BTN} disabled={ev.busy || ev.recording} title="Cada clique fora do Hub vira um passo com print e fica no roteiro" onClick={() => void ev.startClickRecording()}>
                        <MousePointerClick className="w-3.5 h-3.5" /> Gravar cliques
                      </button>
                    )}
                    {ev.recording ? (
                      <button type="button" className={`${BTN_PRIMARY} bg-red-600 hover:bg-red-600/90`} onClick={ev.stopRecording}>
                        <Square className="w-3.5 h-3.5" /> Parar gravação
                      </button>
                    ) : (
                      <button type="button" className={BTN} disabled={!ev.sourceId || ev.busy} onClick={() => void ev.startRecording()}>
                        <Video className="w-3.5 h-3.5" /> Gravar vídeo da tela
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className={LABEL} htmlFor="evidence-after-capture">
                      Depois do print:
                    </label>
                    <select id="evidence-after-capture" className={`${INPUT} max-w-[320px]`} value={afterCapture} onChange={(e) => changeAfterCapture(e.target.value as AfterCaptureMode)}>
                      {AFTER_CAPTURE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Atalho global <kbd className="px-1 border border-border rounded">Ctrl+Shift+E</kbd> tira um print mesmo com outra janela em foco.
                    {ev.recording && <span className="text-red-600 font-medium"> ● Gravando…</span>}
                    {ev.recordingClicks && <span className="text-red-600 font-medium"> ● Registrando cliques… (cliques no Hub não contam)</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-foreground mr-auto">
                  Passos <span className="text-muted-foreground font-normal">({session.steps.length})</span>
                </h2>
                {ev.busy && ev.replayProgress && !ev.replayProgress.finished && (
                  <span className="text-xs text-muted-foreground">
                    Executando passo {ev.replayProgress.done}/{ev.replayProgress.total}…
                  </span>
                )}
                {ev.replayProgress?.error && <span className="text-xs text-red-600">{ev.replayProgress.error}</span>}
                <button
                  type="button"
                  className={BTN}
                  disabled={ev.busy || ev.recordingClicks || !session.steps.some((s) => s.actions?.length)}
                  title="Repete os cliques e digitações do roteiro e tira novos prints em uma nova evidência"
                  onClick={() =>
                    window.confirm(
                      'O Hub vai minimizar e controlar o mouse e o teclado para repetir o roteiro, em uma nova evidência.\n\nNão mexa no computador durante a execução. Para interromper, use Ctrl+Shift+Q.\n\nContinuar?'
                    ) && void ev.replay()
                  }
                >
                  <Play className="w-3.5 h-3.5" /> Reexecutar roteiro
                </button>
              </div>

              <ol className="space-y-3">
                {session.steps.map((step, i) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    index={i}
                    sessionId={session.id}
                    afterCapture={afterCapture}
                    fresh={ev.freshStepId === step.id}
                    suppressPrompt={ev.recordingClicks}
                    suggestion={suggestion}
                    image={{ getImage: ev.getImage, saveImage: ev.saveImage }}
                    onDismissFresh={ev.dismissFresh}
                    onUpdate={(patch) => void ev.updateStep(step.id, patch)}
                    onDelete={() => void ev.deleteStep(step.id)}
                    onSetActions={(next) => void ev.setActions(step.id, next)}
                    blocksApi={{
                      addBlock: (input) => ev.addBlock(step.id, input),
                      updateBlock: (blockId, patch) => ev.updateBlock(step.id, blockId, patch),
                      deleteBlock: (blockId) => ev.deleteBlock(step.id, blockId),
                      runHttp: ev.runHttp,
                      runSql: ev.runSql,
                      listConnections: ev.listConnections,
                      listEnvironments: ev.listEnvironments
                    }}
                  />
                ))}
                {session.steps.length === 0 && (
                  <li className="border border-dashed border-border rounded-[14px] p-6 text-center text-[13px] text-muted-foreground">Nenhum passo ainda: tire um print ou adicione um passo.</li>
                )}
              </ol>

              {session.videos.length > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> {session.videos.join(', ')}
                </p>
              )}

              <div className={`${CARD} space-y-3`}>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" className={BTN_PRIMARY} disabled={ev.busy} title="Atualiza o relatório HTML na pasta da evidência" onClick={() => void ev.save()}>
                    <Save className="w-4 h-4" /> Salvar
                  </button>
                  <button type="button" className={BTN} disabled={ev.busy || session.steps.length === 0} title="Abre uma conferência do comentário e dos anexos; nada é enviado antes de confirmar" onClick={() => setPublishing(true)}>
                    <Send className="w-3.5 h-3.5" /> Publicar no Jira…
                  </button>
                  <button type="button" className={BTN} disabled={ev.busy} title="Resumo em Markdown (até 4000 caracteres) para colar na descrição do pull request" onClick={() => setPrDescription(true)}>
                    <ClipboardList className="w-3.5 h-3.5" /> Descrição do PR
                  </button>
                  <span className="text-xs text-muted-foreground">Passos e provas já são gravados a cada alteração.</span>
                </div>
                <details className="text-xs">
                  <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">Outros formatos e pasta</summary>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <button type="button" className={BTN} disabled={ev.busy} onClick={() => void ev.report(false)}>
                      <FileText className="w-3.5 h-3.5" /> Abrir relatório HTML
                    </button>
                    <button type="button" className={BTN} disabled={ev.busy} onClick={() => void ev.report(true)}>
                      <FileText className="w-3.5 h-3.5" /> Gerar PDF
                    </button>
                    <button type="button" className={BTN} disabled={ev.busy} title="Uma página paisagem por passo, pronta para apresentar" onClick={() => void ev.report(false, 'slides')}>
                      <Presentation className="w-3.5 h-3.5" /> Slides (HTML)
                    </button>
                    <button type="button" className={BTN} disabled={ev.busy} onClick={() => void ev.report(true, 'slides')}>
                      <Presentation className="w-3.5 h-3.5" /> Slides (PDF)
                    </button>
                    <button type="button" className={BTN} onClick={() => void ev.openFolder()}>
                      <FolderOpen className="w-3.5 h-3.5" /> Abrir pasta
                    </button>
                  </div>
                </details>
              </div>

              {prDescription && <PrDescriptionModal session={session} onClose={() => setPrDescription(false)} />}

              {publishing && (
                <JiraPublishModal
                  session={session}
                  onClose={() => setPublishing(false)}
                  lookupIssue={ev.lookupIssue}
                  previewJira={ev.previewJira}
                  publish={async (key, withVideos) => {
                    const result = await ev.publish(key, withVideos);
                    // Evidência iniciada sem tarefa: guarda a chave usada para não pedir de novo.
                    if (result?.success && result.issueKey && !session.task.trim()) void ev.updateSession({ task: result.issueKey });
                    return result;
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </QualityPageShell>
  );
};

export default EvidencePage;
