import React from 'react';
import { InfrDockerDiagram } from './InfrDockerDiagram';
import { GUIDE_BOOT, GUIDE_HUB_TASKS, GUIDE_LOCATIONS, GUIDE_PROBLEMS, GUIDE_PROJECTS, GUIDE_VERSIONS } from './infrDockerGuideData';

const H2 = 'text-base font-bold text-foreground mt-8 mb-2 scroll-mt-4';
const P = 'text-sm leading-relaxed text-foreground/85';
const TABLE = 'w-full text-xs border-collapse';
const TH = 'text-left font-semibold text-foreground bg-muted/50 px-3 py-2 border-b border-border';
const TD = 'align-top px-3 py-2 border-b border-border/60 text-foreground/85';
const CODE = 'font-mono text-[0.92em] text-foreground';

const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto rounded-xl border border-border/80 scrollbar-thin">
    <table className={TABLE}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className={TH}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  </div>
);

const SECTIONS = [
  ['pagina', 'Em uma página'],
  ['projetos', 'Os projetos'],
  ['subida', 'Como um ambiente sobe'],
  ['versoes', 'Uma versão por ambiente'],
  ['hub', 'O que o Hub faz'],
  ['passos', 'Passo a passo'],
  ['problemas', 'Problemas conhecidos'],
  ['onde', 'Onde está cada coisa']
] as const;

/**
 * Guia "Ambientes WinThor no Docker": o que é cada projeto, por que existe, como um ambiente sobe e o
 * que o Hub faz por você. Aparece na Central de Ajuda (Guias) e no botão Como funciona do Assistente INFR.
 */
export const InfrDockerGuide: React.FC<{ openLink?: (url: string) => void }> = ({ openLink }) => {
  const link = (url: string, text: string) => (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        if (openLink) {
          e.preventDefault();
          openLink(url);
        }
      }}
      className="text-primary hover:underline"
    >
      {text}
    </a>
  );
  const goTo = (id: string) => document.getElementById(`infr-guia-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <article className="max-w-4xl space-y-3">
      <header className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Ambientes WinThor no Docker: INFR-Docker e Hub</h1>
        <p className={P}>
          Um ambiente WinThor de desenvolvimento são três containers no WSL (banco Oracle, WTA e WSH) montados pelos scripts do INFR-Docker. O
          Hub roda esses scripts por você, confere o que vai dar errado antes e mostra o estado de cada peça.
        </p>
        <nav aria-label="Seções do guia" className="flex flex-wrap gap-1.5 pt-1">
          {SECTIONS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => goTo(id)}
              className="px-2.5 py-1 rounded-full border border-border/80 text-2xs text-foreground/80 hover:bg-muted cursor-pointer"
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <h2 id="infr-guia-pagina" className={H2}>Em uma página</h2>
      <div className="rounded-xl border border-border/80 bg-card p-3">
        <InfrDockerDiagram />
      </div>
      <p className={P}>O Hub não substitui o INFR-Docker: ele roda os mesmos scripts e confere antes. O WTA só sobe com o banco no ar, e o WSH só com os dois.</p>

      <h2 id="infr-guia-projetos" className={H2}>Os projetos e por que cada um existe</h2>
      <Table head={['Projeto', 'O que é', 'Por que existe', 'Container que gera']}>
        {GUIDE_PROJECTS.map((p) => (
          <tr key={p.name}>
            <td className={`${TD} font-mono whitespace-nowrap`}>{p.name}</td>
            <td className={TD}>{p.what}</td>
            <td className={TD}>{p.why}</td>
            <td className={`${TD} font-mono`}>{p.container}</td>
          </tr>
        ))}
      </Table>
      <p className={P}>
        Todos os containers ficam na rede Docker <code className={CODE}>winthor-network</code>: é por ela que o WTA acha o Oracle pelo nome e o WSH acha os
        dois. Os containers rodam no Docker de dentro de uma distro WSL, não no Docker Desktop.
      </p>

      <h2 id="infr-guia-subida" className={H2}>Como um ambiente sobe</h2>
      <p className={P}>A ordem é sempre banco, depois WTA, depois WSH: cada um depende do anterior estar rodando.</p>
      <ol className="space-y-2">
        {GUIDE_BOOT.map((s, i) => (
          <li key={s.title} className="flex gap-3 text-sm text-foreground/85">
            <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
            <span>
              <strong className="text-foreground">{s.title}.</strong> {s.text}
            </span>
          </li>
        ))}
      </ol>
      <p className={P}>Os dados ficam em volumes Docker: parar e subir o container de novo não perde nada. Remover o volume apaga o WTA daquele ambiente.</p>

      <h2 id="infr-guia-versoes" className={H2}>Uma versão do WinThor por ambiente</h2>
      <p className={P}>
        Cada versão roda com o seu banco, porque o WTA de uma versão espera as tabelas daquela versão. A imagem{' '}
        <code className={CODE}>linux-winthor:&lt;versão&gt;-debian</code> já vem com as features da versão, listadas em{' '}
        <code className={CODE}>versions/&lt;versão&gt;.features</code>. O WTA lê o <code className={CODE}>wta.env.&lt;versão&gt;</code> e o WSH o{' '}
        <code className={CODE}>.env.&lt;versão&gt;</code> (fora do git: têm senha). O WSH de produção serve para qualquer versão mais nova, porque só cobra uma
        versão mínima das features. Portas que o Hub sugere:
      </p>
      <Table head={['Versão', 'Oracle', 'WTA (web)', 'SSH Karaf', 'JMX', 'Artemis', 'WSH']}>
        {GUIDE_VERSIONS.map((v) => (
          <tr key={v.version} className="font-mono">
            <td className={`${TD} font-semibold text-foreground`}>{v.version}</td>
            <td className={TD}>{v.oracle}</td>
            <td className={TD}>{v.web}</td>
            <td className={TD}>{v.ssh}</td>
            <td className={TD}>{v.jmx}</td>
            <td className={TD}>{v.jms}</td>
            <td className={TD}>{v.wsh}</td>
          </tr>
        ))}
      </Table>
      <p className={P}>
        Cada versão completa usa até ~8 GB de memória. Com 16 GB, para duas juntas use <code className={CODE}>WTA_JAVA_OPTS=-Xms512m -Xmx2g</code> e{' '}
        <code className={CODE}>JVM_XMX=1536m</code>.
      </p>

      <h2 id="infr-guia-hub" className={H2}>O que o Hub faz por você</h2>
      <p className={P}>Tudo que o INFR-Docker faz por comando no WSL, o Hub faz por tela, com nomes e portas sugeridos. Quase tudo fica em WinThor &amp; WSL.</p>
      <Table head={['Tarefa', 'Na mão (WSL)', 'No Hub']}>
        {GUIDE_HUB_TASKS.map((t) => (
          <tr key={t.task}>
            <td className={`${TD} font-semibold text-foreground`}>{t.task}</td>
            <td className={`${TD} font-mono`}>{t.manual}</td>
            <td className={TD}>{t.hub}</td>
          </tr>
        ))}
      </Table>

      <InfrDockerGuideSteps />

      <h2 id="infr-guia-problemas" className={H2}>Problemas conhecidos</h2>
      <Table head={['Sintoma', 'Causa', 'Como resolver']}>
        {GUIDE_PROBLEMS.map((p) => (
          <tr key={p.symptom}>
            <td className={`${TD} font-semibold text-foreground`}>{p.symptom}</td>
            <td className={TD}>{p.cause}</td>
            <td className={TD}>{p.fix}</td>
          </tr>
        ))}
      </Table>

      <h2 id="infr-guia-onde" className={H2}>Onde está cada coisa</h2>
      <Table head={['O quê', 'Onde']}>
        {GUIDE_LOCATIONS.map((l) => (
          <tr key={l.what}>
            <td className={TD}>{l.what}</td>
            <td className={`${TD} font-mono`}>{l.url ? link(l.url, l.where) : l.where}</td>
          </tr>
        ))}
      </Table>
      <p className={P}>Arquivos com senha (wta.env*, .env*) nunca vão para o git: o .gitignore já bloqueia.</p>
    </article>
  );
};

/** Passo a passo das tarefas mais comuns, separado para o guia caber na leitura. */
const InfrDockerGuideSteps: React.FC = () => {
  const H3 = 'text-sm font-bold text-foreground mt-4 mb-1.5';
  const OL = 'list-decimal pl-5 space-y-1 text-sm text-foreground/85 marker:text-muted-foreground';
  return (
    <>
      <h2 id="infr-guia-passos" className={H2}>Passo a passo no Hub</h2>
      <h3 className={H3}>Preparar a máquina (uma vez)</h3>
      <ol className={OL}>
        <li>Atualizar o WSL: <code className={CODE}>wsl --update</code> no PowerShell (a 2.1.5 não sobe a distro). Reinicia o Docker Desktop.</li>
        <li>Importar a distro do time: <code className={CODE}>wsl --import ubuntu2604-winthor &lt;pasta&gt; &lt;arquivo .tar&gt;</code> (o .tar fica no Drive do time).</li>
        <li>Clonar o INFR-Docker em <code className={CODE}>C:\projetos\INFR-Docker</code>. Em outra pasta, informe-a em Assistente INFR → Scripts e pasta.</li>
        <li>Em Configurações → Rotinas WinThor, preencher Usuário WTA e Senha (a senha normal; o Hub converte para o formato do WTA).</li>
      </ol>
      <h3 className={H3}>Montar um ambiente do zero</h3>
      <ol className={OL}>
        <li>WinThor &amp; WSL → Assistente INFR. Confira no cabeçalho se a distro e a pasta estão verdes.</li>
        <li>Informe a Versão do WinThor (ex.: 38): nomes e portas se ajustam sozinhos.</li>
        <li>Banco Oracle → Executar. Espere uns 2 minutos e importe o dump.</li>
        <li>WTA → Executar. Abra <code className={CODE}>http://localhost:8038/</code> e conclua a Configuração inicial.</li>
        <li>WSH → Executar (precisa do jar do WSH e do Winthor.ini em /opt na distro).</li>
      </ol>
      <h3 className={H3}>Gerar uma versão nova a partir de um ambiente que funciona</h3>
      <ol className={OL}>
        <li>Assistente INFR → Nova versão. Escolha o ambiente (ex.: master), a versão nova (40) e o nome (develop).</li>
        <li>Banco: copiar (RMAN, só entre Oracles XE do INFR-Docker), usar um que já existe ou subir um vazio.</li>
        <li>WTA, WSH e portas: confira as portas e escolha o jar do WSH (o de produção serve). Senha em branco mantém a da origem.</li>
        <li>Revisar e gerar: verde está ok, amarelo pede atenção, vermelho impede de gerar e mostra a saída.</li>
        <li>Gerar: o Hub grava os arquivos e abre o terminal com o new_version_env.sh (imagem, banco, WTA e WSH).</li>
      </ol>
      <h3 className={H3}>Ver o log do WinThor dentro do container</h3>
      <ul className="list-disc pl-5 space-y-1 text-sm text-foreground/85">
        <li>Pelo Hub: tela Containers → o container → Logs.</li>
        <li>
          No WSL: <code className={CODE}>docker logs -f wta-&lt;nome&gt;</code> e{' '}
          <code className={CODE}>docker exec wta-&lt;nome&gt; tail -f /opt/pcsist/produtos/winthor/data/log/karaf.log</code>.
        </li>
      </ul>
    </>
  );
};
