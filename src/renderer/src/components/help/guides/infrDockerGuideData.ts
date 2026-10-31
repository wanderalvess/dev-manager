/**
 * Conteúdo do guia "Ambientes WinThor no Docker" (Central de Ajuda → Guias e o botão Como funciona do
 * Assistente INFR). Em dados para as tabelas ficarem fáceis de manter; as portas vêm da mesma regra
 * que o Hub usa para sugerir (winthorVersionPorts), então o guia não fica desatualizado.
 */
import { winthorVersionPorts } from '../../../../../shared/infrWinthorVersion';

export interface GuideProject {
  name: string;
  what: string;
  why: string;
  container: string;
}

export const GUIDE_PROJECTS: GuideProject[] = [
  {
    name: 'INFR-Docker/oracle-winthor',
    what: 'Oracle 11g XE já configurado para o WinThor (charset, tablespaces, grants), com as ferramentas de dump e RMAN.',
    why: 'O WTA e o WSH precisam de um banco com o schema do WinThor; aqui ele sobe pronto e recebe o dump.',
    container: 'oracle-<nome> (1521 no container)'
  },
  {
    name: 'INFR-Docker/linux-winthor',
    what: 'O WinThor Anywhere (WTA): Karaf com as features do WinThor, Artemis e JDK 8, numa imagem Linux.',
    why: 'É o servidor do WinThor web e das APIs. Na imagem sobe em segundos, sem o instalador interativo.',
    container: 'wta-<nome> (8080 web, 8101 SSH, 1099 JMX, 61616 Artemis)'
  },
  {
    name: 'INFR-Docker/wsh-winthor',
    what: 'O WSH (Winthor Smart Hub), serviço de integração do ERP.',
    why: 'Integra o WinThor com outros sistemas (ex.: PDVSync). Conecta no banco e no WTA que já estão rodando.',
    container: 'wsh-<nome>'
  },
  {
    name: 'Hub Manager',
    what: 'Este aplicativo.',
    why: 'Roda os scripts do INFR-Docker por você, mostra o estado dos containers, confere versões e banco antes de gerar e explica os erros conhecidos.',
    container: 'nenhum: comanda os de cima'
  }
];

export interface GuideStep {
  title: string;
  text: string;
}

/** A ordem em que um ambiente sobe: cada passo depende do anterior. */
export const GUIDE_BOOT: GuideStep[] = [
  {
    title: 'Banco',
    text: 'O oracle_setup.sh cria o container na winthor-network; o listener leva uns 2 minutos. Depois entra o dump (import_dump.sh) ou a cópia de outro banco por RMAN.'
  },
  {
    title: 'WTA',
    text: 'O wta_setup.sh lê o wta.env (banco, loja, empresa, memória) e sobe o container. Na primeira vez grava a configuração do banco no Karaf; depois sobe direto.'
  },
  {
    title: 'Primeiro acesso ao WTA',
    text: 'Abrir http://localhost:<porta>/ uma vez e concluir a Configuração inicial. Sem isso o login não funciona.'
  },
  {
    title: 'WSH',
    text: 'O wsh_setup.sh lê o .env (containers, porta, jar, Winthor.ini) e sobe ligado aos outros dois. Ao subir confere a versão mínima das features do WTA.'
  }
];

export const GUIDE_VERSIONS = ['38', '39', '40'].map((v) => ({ version: v, ...winthorVersionPorts(v) }));

export interface GuideHubTask {
  task: string;
  manual: string;
  hub: string;
}

export const GUIDE_HUB_TASKS: GuideHubTask[] = [
  { task: 'Começar do zero', manual: 'MANUAL_INSTALACAO.md inteiro', hub: 'Assistente INFR → Primeiros passos (confere cada etapa e diz o que falta)' },
  { task: 'Ver o que está rodando', manual: 'docker ps, docker logs', hub: 'WinThor & WSL (topologia) e a tela Containers' },
  { task: 'Subir o banco', manual: 'oracle_setup.sh + import_dump.sh', hub: 'Assistente INFR → Banco Oracle; o dump, em Primeiros passos' },
  { task: 'Subir o WTA', manual: 'criar wta.env + wta_setup.sh', hub: 'Assistente INFR → WTA (a versão preenche nome e portas)' },
  { task: 'Subir o WSH', manual: 'criar .env + wsh_setup.sh', hub: 'Assistente INFR → WSH' },
  {
    task: 'Ambiente numa versão nova',
    manual: 'exportar features, montar manifesto, build_version.sh, clonar banco, dois .env, new_version_env.sh',
    hub: 'Assistente INFR → Nova versão (4 passos, confere tudo antes de gerar)'
  },
  { task: 'Conferir os scripts da pasta', manual: 'ls em cada pasta', hub: 'Cabeçalho do assistente e Scripts e pasta' },
  { task: 'Subir tudo na ordem', manual: 'três comandos, esperando cada um', hub: 'Botão Subir WinThor' },
  { task: 'Banco: saúde, SQL*Plus, Data Pump, TNS', manual: 'sqlplus, expdp/impdp', hub: 'Ferramentas do Oracle e Copiar TNS' },
  { task: 'Guardar ou trocar a distro', manual: 'wsl --export / wsl --import', hub: 'Snapshots do WSL' },
  { task: 'Senha MD5 do WSH e rotina 2650', manual: 'calcular à mão', hub: 'Gerador MD5 e Rotina 2650' }
];

export interface GuideProblem {
  symptom: string;
  cause: string;
  fix: string;
}

export const GUIDE_PROBLEMS: GuideProblem[] = [
  {
    symptom: 'WSH encerra com "Versão exigida … Versão instalada"',
    cause: 'Alguma feature do WTA está abaixo da versão mínima que o jar do WSH exige',
    fix: 'Subir a feature pela rotina 801 ou gerar a imagem com o manifesto certo. A Nova versão avisa antes.'
  },
  {
    symptom: 'WSH não conecta no banco (ORA-01017)',
    cause: 'O Winthor.ini grava a senha em maiúsculas e o Oracle 12+ diferencia maiúsculas',
    fix: 'Usar a senha do usuário do banco em maiúsculas no banco, no WTA e no WSH.'
  },
  {
    symptom: 'Catálogo da 801 volta 403',
    cause: 'Falta login no WTA, ou a senha está errada',
    fix: 'Preencher Usuário WTA e Senha em Configurações → Rotinas WinThor; o erro mostra a resposta do WTA.'
  },
  {
    symptom: 'Login do WTA recusado logo depois de subir',
    cause: 'O WTA ainda está na Configuração inicial',
    fix: 'Abrir http://localhost:<porta>/ e concluir a configuração inicial.'
  },
  {
    symptom: 'Copiar o banco não funciona',
    cause: 'O clone por RMAN do INFR-Docker só vale entre Oracles XE 11g (oracle-winthor)',
    fix: 'Na revisão da Nova versão, usar o Oracle de origem direto ou subir um vazio e importar o dump.'
  },
  {
    symptom: 'A versão nova rebaixaria features',
    cause: 'O catálogo da 801 de um WTA mais antigo não tem a linha da versão nova',
    fix: 'Manter a lista que já existe em versions/<versão>.features (o Hub escolhe por padrão).'
  },
  {
    symptom: 'A distro não inicia (E_UNEXPECTED ou memória)',
    cause: 'WSL antigo',
    fix: 'wsl --update e wsl --shutdown no PowerShell; reinicia o Docker Desktop.'
  },
  {
    symptom: 'WSH não acha o WTA ou o banco',
    cause: 'Container fora da winthor-network ou com outro nome',
    fix: 'Subir pelos scripts (eles ligam na rede) e conferir os nomes no .env.'
  }
];

export const GUIDE_LOCATIONS: { what: string; where: string; url?: string }[] = [
  { what: 'Repositório INFR-Docker', where: 'Azure DevOps · Linha-Winthor/INFR-Docker', url: 'https://totvstfs.visualstudio.com/Linha-Winthor/_git/INFR-Docker' },
  { what: 'Repositório do Hub', where: 'GitHub · wanderalvess/dev-manager', url: 'https://github.com/wanderalvess/dev-manager' },
  {
    what: 'Binários fora do git (pcsist.tar.gz, RPM do Oracle, distro .tar)',
    where: 'Drive compartilhado do time',
    url: 'https://drive.google.com/drive/folders/1oAjcfpickVwFOr7NDtuIcVLLRvc2iduA'
  },
  { what: 'Manual de instalação passo a passo', where: 'INFR-Docker/MANUAL_INSTALACAO.md' },
  { what: 'Como o WTA sobe por dentro e o que não mexer', where: 'INFR-Docker/AGENTS.md e linux-winthor/docs/MAINTENANCE.md' },
  { what: 'Manifestos de versão', where: 'INFR-Docker/linux-winthor/versions/README.md' },
  { what: 'Jar do WSH e Winthor.ini', where: '/opt dentro da distro WSL' }
];
