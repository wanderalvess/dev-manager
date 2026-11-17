import React, { useEffect, useState } from 'react';
import { Camera, FileText, Pencil, FolderOpen, NotebookPen, Send, Square, Trash2, Video } from 'lucide-react';
import { EVIDENCE_HOTKEY, RESULT_LABEL, guessJiraKey, summarizeEvidence, type EvidenceJiraIssue, type EvidenceKind, type EvidenceResult } from '../../../shared/evidenceTypes';
import { ImageAnnotator } from '../components/evidence/ImageAnnotator';
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
const STEP_BORDER: Record<EvidenceResult, string> = {
  pending: 'border-l-border',
  passed: 'border-l-green-600',
  failed: 'border-l-red-600'
};
const RESULT_STYLE: Record<EvidenceResult, string> = {
  pending: 'bg-muted text-muted-foreground',
  passed: 'bg-green-600 text-white',
  failed: 'bg-red-600 text-white'
};

type StepImageProps = {
  name: string;
  sessionId: string;
  getImage: (name: string) => Promise<string | null>;
  saveImage: (name: string, dataUrl: string) => Promise<boolean>;
};

const StepImage: React.FC<StepImageProps> = ({ name, sessionId, getImage, saveImage }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [large, setLarge] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let alive = true;
    void getImage(name).then((url) => alive && setSrc(url));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, name]);

  const handleSave = async (dataUrl: string): Promise<void> => {
    if (await saveImage(name, dataUrl)) setSrc(dataUrl);
  };

  if (!src) return <p className="text-xs text-muted-foreground">{name}</p>;
  return (
    <div className="space-y-1">
      <button type="button" title={large ? 'Reduzir' : 'Ampliar'} className={`block text-left ${large ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onClick={() => setLarge((v) => !v)}>
        <img src={src} alt={name} className={`rounded-[10px] border border-border ${large ? 'w-full' : 'max-h-48'}`} />
      </button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>{name}</span>
        <button type="button" className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer" onClick={() => setEditing(true)}>
          <Pencil className="w-3.5 h-3.5" /> Anotar
        </button>
      </div>
      {editing && <ImageAnnotator src={src} onSave={handleSave} onClose={() => setEditing(false)} />}
    </div>
  );
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
        <label className={LABEL}>Tarefa (Jira)</label>
        <div className="flex gap-2">
        <input
          className={INPUT}
          placeholder="Tarefa (ex.: WT-123)"
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
        <input className={INPUT} placeholder="Preenchido pelo Jira, se disponível" value={title} onChange={(e) => setTitle(e.target.value)} />
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
      <button type="button" className={`${BTN_PRIMARY} w-full`} disabled={busy || !task.trim()} onClick={() => onCreate({ task, title, kind, tester, environment })}>
        Iniciar evidência
      </button>
    </div>
  );
};

export const EvidencePage: React.FC<EvidencePageProps> = ({ isActive = true }) => {
  const ev = useEvidence(isActive);
  const { session } = ev;
  const [jiraKey, setJiraKey] = useState('');
  const [includeVideos, setIncludeVideos] = useState(true);
  const [stepTitle, setStepTitle] = useState('');

  useEffect(() => {
    if (session) setJiraKey(guessJiraKey(session.task));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, session?.task]);

  const summary = session ? summarizeEvidence(session.steps) : null;

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
                      {session.task} · {session.kind === 'qa' ? 'Teste' : 'Desenvolvimento'} · {summary.passed}/{summary.total} aprovados
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${RESULT_STYLE[summary.verdict]}`}>{RESULT_LABEL[summary.verdict]}</span>
                  <button type="button" className={BTN} onClick={ev.close}>
                    Fechar
                  </button>
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                <div className={LABEL}>Captura</div>
                <div className="flex flex-wrap items-center gap-2">
                  <select className={`${INPUT} max-w-xs`} value={ev.sourceId} onChange={(e) => ev.setSourceId(e.target.value)} onFocus={() => void ev.refreshSources()}>
                    {ev.sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.isScreen ? 'Tela: ' : 'Janela: '}
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {ev.recording ? (
                    <button type="button" className={`${BTN_PRIMARY} bg-red-600 hover:bg-red-600/90`} onClick={ev.stopRecording}>
                      <Square className="w-3.5 h-3.5" /> Parar gravação
                    </button>
                  ) : (
                    <button type="button" className={BTN} disabled={!ev.sourceId || ev.busy} onClick={() => void ev.startRecording()}>
                      <Video className="w-3.5 h-3.5" /> Gravar tela
                    </button>
                  )}
                  <input className={`${INPUT} max-w-[220px]`} placeholder="Título do passo (opcional)" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} />
                  <button type="button" className={BTN} disabled={ev.busy} title={`Atalho global: ${EVIDENCE_HOTKEY.replace('CommandOrControl', 'Ctrl')}`} onClick={() => void Promise.resolve(ev.capture(stepTitle)).then(() => setStepTitle(''))}>
                    <Camera className="w-3.5 h-3.5" /> Print
                  </button>
                  <button type="button" className={BTN} disabled={ev.busy} onClick={() => void Promise.resolve(ev.addNote(stepTitle)).then(() => setStepTitle(''))}>
                    <NotebookPen className="w-3.5 h-3.5" /> Passo sem print
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atalho global <kbd className="px-1 border border-border rounded">Ctrl+Shift+E</kbd> tira um print mesmo com outra janela em foco.
                  {ev.recording && <span className="text-red-600 font-medium"> ● Gravando…</span>}
                </p>
                </div>
              </div>

              <ol className="space-y-3">
                {session.steps.map((step, i) => (
                  <li key={step.id} className={`${CARD} border-l-4 ${STEP_BORDER[step.result]} space-y-3`}>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-muted text-xs font-semibold text-foreground flex items-center justify-center">{i + 1}</span>
                      <input
                        className={INPUT}
                        defaultValue={step.title}
                        onBlur={(e) => e.target.value !== step.title && void ev.updateStep(step.id, { title: e.target.value })}
                      />
                      <select
                        className={`${INPUT} max-w-[150px]`}
                        value={step.result}
                        onChange={(e) => void ev.updateStep(step.id, { result: e.target.value as EvidenceResult })}
                      >
                        {(Object.keys(RESULT_LABEL) as EvidenceResult[]).map((r) => (
                          <option key={r} value={r}>
                            {RESULT_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <button type="button" title="Excluir passo" className="p-2 rounded-[10px] text-muted-foreground hover:text-red-600 hover:bg-muted cursor-pointer" onClick={() => void ev.deleteStep(step.id)}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <textarea className={TEXTAREA} rows={2} placeholder="Esperado" defaultValue={step.expected ?? ''} onBlur={(e) => e.target.value !== (step.expected ?? '') && void ev.updateStep(step.id, { expected: e.target.value })} />
                      <textarea className={TEXTAREA} rows={2} placeholder="Obtido" defaultValue={step.actual ?? ''} onBlur={(e) => e.target.value !== (step.actual ?? '') && void ev.updateStep(step.id, { actual: e.target.value })} />
                    </div>
                    {step.screenshot && <StepImage name={step.screenshot} sessionId={session.id} getImage={ev.getImage} saveImage={ev.saveImage} />}
                  </li>
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

              <div className={`${CARD} space-y-4`}>
                <h2 className="text-base font-semibold text-foreground">Relatório e publicação</h2>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={BTN} disabled={ev.busy} onClick={() => void ev.report(false)}>
                    <FileText className="w-3.5 h-3.5" /> Gerar HTML
                  </button>
                  <button type="button" className={BTN} disabled={ev.busy} onClick={() => void ev.report(true)}>
                    <FileText className="w-3.5 h-3.5" /> Gerar PDF
                  </button>
                  <button type="button" className={BTN} onClick={() => void ev.openFolder()}>
                    <FolderOpen className="w-3.5 h-3.5" /> Abrir pasta
                  </button>
                </div>
                <div className="border-t border-border pt-4 flex flex-wrap items-center gap-3">
                  <input className={`${INPUT} max-w-[180px]`} placeholder="Chave do Jira" value={jiraKey} onChange={(e) => setJiraKey(e.target.value)} />
                  <label className="text-[13px] text-foreground flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeVideos} onChange={(e) => setIncludeVideos(e.target.checked)} /> Anexar vídeos (até 50 MB)
                  </label>
                  <button type="button" className={BTN_PRIMARY} disabled={ev.busy || !jiraKey.trim()} onClick={() => void ev.publish(jiraKey, includeVideos)}>
                    <Send className="w-3.5 h-3.5" /> Publicar no Jira
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </QualityPageShell>
  );
};

export default EvidencePage;
