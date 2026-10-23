/**
 * JS da página do celular (servido como app.js por causa da CSP, que não aceita script inline).
 * Todo texto vindo do PC entra por textContent: nada de innerHTML com dado de fora.
 */
export const PAGE_JS = `
'use strict';
const $ = (id) => document.getElementById(id);
const STATE = { tab: 'ambiente', busy: false, logTimer: null };
const TASK_LABEL = {
  'ambiente.preparar': 'Preparando ambiente', 'deploy.executar': 'Rodando deploy', 'banco.backup': 'Fazendo backup'
};

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) n.append(kid);
  return n;
}

async function api(path, body) {
  const res = await fetch(path, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  } : { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || ('Erro ' + res.status));
  return data;
}

function toast(msg) {
  const t = el('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), 3500);
}

function confirmSheet(message, label) {
  return new Promise((resolve) => {
    const done = (v) => { veil.remove(); resolve(v); };
    const veil = el('div', { class: 'veil' },
      el('div', { class: 'sheet' }, el('p', {}, message),
        el('div', { class: 'btns' },
          el('button', { onclick: () => done(false) }, 'Cancelar'),
          el('button', { class: 'danger', onclick: () => done(true) }, label || 'Confirmar'))));
    veil.addEventListener('click', (e) => { if (e.target === veil) done(false); });
    document.body.append(veil);
  });
}

/** Ação de um botão; as destrutivas pedem confirmação aqui e de novo o servidor confere. */
async function run(acao, alvo, ask) {
  if (ask && !(await confirmSheet(ask))) return;
  try {
    const r = await api('api/acao', { acao, alvo, confirmado: Boolean(ask) });
    toast(r.message || 'Feito.');
  } catch (e) { toast(e.message); }
  refresh();
}

function btn(label, cls, fn) { return el('button', { class: cls || '', onclick: fn }, label); }

function row(name, sub, right, dot) {
  return el('div', { class: 'row' },
    el('div', { class: 'name' }, dot ? el('span', { class: 'dot ' + dot }) : null, name,
      sub ? el('span', { class: 'sub' }, sub) : null),
    right);
}

function empty(text) { return el('div', { class: 'empty' }, text); }

function renderTask(task) {
  const chip = $('task');
  if (!task) { chip.className = 'chip'; chip.textContent = 'Ocioso'; return; }
  const label = TASK_LABEL[task.name] || task.name;
  if (!task.endedAt) { chip.className = 'chip busy'; chip.textContent = label + '…'; return; }
  chip.className = 'chip ' + (task.ok ? 'ok' : 'bad');
  chip.textContent = (task.ok ? 'Concluído: ' : 'Falhou: ') + (task.message || label);
}

async function viewAmbiente(root) {
  const { env, task } = await api('api/ambiente');
  renderTask(task);
  const busy = Boolean(task && !task.endedAt);
  root.replaceChildren(
    el('h2', {}, 'Ações'),
    el('div', { class: 'card' }, el('div', { class: 'btns' },
      btn('Preparar ambiente', 'primary', () => run('ambiente.preparar', undefined,
        'Preparar o ambiente para o dev? Isso para serviços e encerra processos monitorados no PC.')),
      btn('Abrir IDE', '', () => run('ide.abrir')),
      btn('Servidor debug', '', () => run('karaf.debug')))),
    el('h2', {}, 'Portas'),
    el('div', { class: 'card' }, env.ports.length ? env.ports.map((p) =>
      row(p.label || ('Porta ' + p.port), ':' + p.port, null, p.inUse ? 'on' : 'off')) : empty('Nenhuma porta monitorada.')),
    el('h2', {}, 'Serviços do Windows'),
    el('div', { class: 'card' }, env.services.length ? env.services.map((s) =>
      row(s.label, s.state, null, s.state === 'RUNNING' ? 'on' : 'off')) : empty('Nenhum serviço monitorado.')));
  root.querySelectorAll('.btns button').forEach((b, i) => { if (i === 0) b.disabled = busy; });
}

async function loadLog(pre) {
  const { output } = await api('api/log?chars=12000');
  const atEnd = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 40;
  pre.textContent = output || 'Sem saída do Karaf ainda.';
  if (atEnd) pre.scrollTop = pre.scrollHeight;
}

async function viewKaraf(root) {
  const { env, task } = await api('api/ambiente');
  renderTask(task);
  const pre = el('pre', {});
  root.replaceChildren(
    el('h2', {}, 'Karaf embutido'),
    el('div', { class: 'card' },
      row(env.karafRunning ? 'Rodando' : 'Parado', null, null, env.karafRunning ? 'on' : 'off'),
      el('div', { class: 'btns' },
        btn('Iniciar em debug', 'primary', () => run('karaf.iniciar')),
        btn('Parar', 'danger', () => run('karaf.parar', undefined, 'Parar o Karaf embutido?')))),
    el('h2', {}, 'Log ao vivo'),
    el('div', { class: 'card' }, pre));
  await loadLog(pre);
  clearInterval(STATE.logTimer);
  STATE.logTimer = setInterval(() => { if (STATE.tab === 'karaf') loadLog(pre).catch(() => {}); }, 2500);
}

async function viewDocker(root) {
  const list = await api('api/containers');
  root.replaceChildren(el('h2', {}, 'Containers'), el('div', { class: 'card' },
    list.error ? empty(list.error) : list.items.length ? list.items.map((c) => {
      const on = c.state === 'running';
      return row(c.name, c.status, el('div', { class: 'btns' },
        on ? btn('Reiniciar', 'small', () => run('docker.reiniciar', c.id, 'Reiniciar ' + c.name + '?')) : null,
        on ? btn('Parar', 'small danger', () => run('docker.parar', c.id, 'Parar ' + c.name + '?'))
          : btn('Iniciar', 'small primary', () => run('docker.iniciar', c.id))), on ? 'on' : 'off');
    }) : empty('Nenhum container.')));
}

async function viewDeploy(root) {
  const lists = await api('api/listas');
  const { task } = await api('api/ambiente');
  renderTask(task);
  const busy = Boolean(task && !task.endedAt);
  root.replaceChildren(
    el('h2', {}, 'Perfis de deploy'),
    el('div', { class: 'card' }, lists.deploys.length ? lists.deploys.map((d) =>
      row(d.name, null, btn('Rodar', 'small primary', () => run('deploy.executar', d.id, 'Rodar o deploy "' + d.name + '"?')))) : empty('Nenhum perfil de deploy.')),
    el('h2', {}, 'Backup de banco'),
    el('div', { class: 'card' }, lists.backups.length ? lists.backups.map((b) =>
      row(b.name, b.type, btn('Backup', 'small', () => run('banco.backup', b.id, 'Fazer backup de "' + b.name + '" agora?')))) : empty('Nenhuma conexão com pasta de backup configurada.')));
  root.querySelectorAll('button.small').forEach((b) => { b.disabled = busy; });
}

const VIEWS = { ambiente: viewAmbiente, karaf: viewKaraf, docker: viewDocker, deploy: viewDeploy };

async function refresh() {
  if (STATE.busy) return;
  STATE.busy = true;
  try { await VIEWS[STATE.tab]($('view')); }
  catch (e) { $('view').replaceChildren(empty('Sem conexão com o PC: ' + e.message)); }
  STATE.busy = false;
}

function setTab(tab) {
  STATE.tab = tab;
  clearInterval(STATE.logTimer);
  document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  refresh();
}

document.querySelectorAll('nav button').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));
setInterval(() => { if (STATE.tab !== 'karaf' && !document.hidden) refresh(); }, 6000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
setTab('ambiente');
`;
