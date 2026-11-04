/**
 * Falhas conhecidas da criação (new_version_env.sh e o que ele sobe), na ordem em que um ambiente novo as encontra. Vão no
 * prompt da IA para modelos pequenos (Ollama) acertarem o diagnóstico: sintoma no log ou no estado → causa → o que fazer.
 * `pattern` também serve ao Hub para soprar à IA qual entrada combina com o que acabou de ler. Comandos que apagam algo
 * (docker rm/rmi, DROP, DELETE) nunca vão em "commands": a IA os descreve no texto, para a pessoa rodar sabendo o que apaga.
 */
export interface KnownFailure {
  id: number;
  name: string;
  /** Sintoma como aparece no log, no estado ou na conferência */
  symptom: string;
  cause: string;
  fix: string;
  /** Reconhece o sintoma num texto lido (log, relatório, conferência, saída colada) */
  pattern: RegExp;
}

export const KNOWN_FAILURES: KnownFailure[] = [
  {
    id: 1,
    name: 'scripts desatualizados',
    symptom: '[ERRO] Flag desconhecida: --version (ou outra opção); "SCRIPTS DESATUALIZADOS" no relatório; a criação para em 4/5 WTA.',
    cause: 'a pasta do INFR-Docker está numa branch antiga e o script não conhece a opção que o Hub passa.',
    fix: 'atualizar a pasta: git fetch origin && git checkout feature/imagem-por-versao && git pull (dentro da pasta do INFR-Docker), e criar de novo.',
    pattern: /Flag desconhecida|SCRIPTS DESATUALIZADOS/i
  },
  {
    id: 2,
    name: 'imagem da versão é a da origem',
    symptom: 'conferência "linux-winthor:<v>-debian é a mesma imagem de outra"; a criação pulou o build em minutos e o WTA tem as features da origem.',
    cause: 'o modo "Só clonar" pôs o nome linux-winthor:<v>-debian sobre a imagem da origem, e o script pula o build quando esse nome existe.',
    fix: 'tirar só o nome com docker rmi linux-winthor:<v>-debian (não apaga a imagem da origem, só o nome) e criar de novo; descreva no texto, não em commands.',
    pattern: /mesma imagem de outra/i
  },
  {
    id: 3,
    name: 'porta já em uso',
    symptom: '"port is already allocated" / "Bind for ... failed" no docker run; conferência "Portas fixas do WTA já em uso".',
    cause: 'SSH, JMX e JMS do WTA são fixos por versão (na 40: 8140, 1040 e 61640); outro WTA da mesma versão está no ar, ou outra porta escolhida está ocupada.',
    fix: 'ver quem usa com docker ps --format "{{.Names}} {{.Ports}}" e parar o outro WTA da mesma versão antes de criar (docker stop <nome>, descrito no texto); ou trocar a porta em Ajustes.',
    pattern: /port is already allocated|Bind for .* failed|address already in use|Portas fixas do WTA já em uso/i
  },
  {
    id: 4,
    name: 'container ou volume de tentativa anterior',
    symptom: 'conferência "wta-<nome> já existe" ou "wta-<nome>-data já existe"; o WTA sobe mas com a configuração ou as features antigas.',
    cause: 'o script não recria o que existe: só dá docker start no container antigo, e o volume wta-<nome>-data mantém o conteúdo da primeira criação.',
    fix: 'se é uma tentativa nova, recriar: docker rm -f wta-<nome> (e wsh-<nome>) e, para trocar a imagem, docker volume rm wta-<nome>-data. Apagam: descreva no texto, só do ambiente novo, nunca da origem.',
    pattern: /\b(?:wta|wsh)-[\w.-]+ já existe|volume wta-[\w.-]+-data já existe/i
  },
  {
    id: 5,
    name: 'arquivos de configuração por versão',
    symptom: 'conferência "Configuração da <v> regravada".',
    cause: 'wta.env.<v> e .env.<v> são por versão, não por ambiente: outro ambiente da mesma versão, se recriado, cai no banco do novo.',
    fix: 'guardar uma cópia desses arquivos antes de criar, se for recriar o outro ambiente.',
    pattern: /Configuração da \d+ regravada/i
  },
  {
    id: 6,
    name: 'banco clonado da Central de Controle',
    symptom: '801 termina em "Falha na Atualização! \'-1\'"; ORA-04098 ao dar DELETE em PCGRUPOSCAMPANHAI; ORA-01438; "Banco (somente leitura)" do relatório lista a trigger TRG_PCGRUPOSCAMPANHAI_LOG_EXCL como INVALID ou uma linha de PCVERSAOBD com a rotina terminando em espaço.',
    cause: 'o banco da Central veio com a trigger TRG_PCGRUPOSCAMPANHAI_LOG_EXCL inválida e com o registro de PCVERSAOBD "PCGRUPOSCAMPANHAI_LOG_EXCL " (espaço no fim); a tabela de log da Central foi criada com NUMBER(6) e a principal é NUMBER(9).',
    fix: 'SOMENTE num ambiente de teste e com backup, o usuário roda no banco do ambiente novo: DROP TRIGGER TRG_PCGRUPOSCAMPANHAI_LOG_EXCL; recriar a tabela PCGRUPOSCAMPANHAI_LOG_EXCL com CODGRUPO e CODITEM NUMBER(9); DELETE FROM pcversaobd WHERE rotina = \'PCGRUPOSCAMPANHAI_LOG_EXCL \'; COMMIT; e rodar a 801 de novo. Escreva o SQL no texto (não em commands) e avise que é só em teste, com backup.',
    pattern: /Falha na Atualiza[cç][aã]o!? ?'?-1|ORA-04098|ORA-01438|TRG_PCGRUPOSCAMPANHAI_LOG_EXCL|PCVERSAOBD \[[^\]]*\s\]/i
  },
  {
    id: 7,
    name: 'Karaf ainda subindo',
    symptom: 'WTA responde HTTP 500 (ou nada) nos primeiros minutos; container running mas "Subindo".',
    cause: 'o Karaf leva vários minutos para carregar as features; o HTTP 500 do início não é erro.',
    fix: 'esperar e conferir de novo em alguns minutos; acompanhar com docker logs --tail 50 wta-<nome>. Só tratar como falha se o container sair ou os reinícios aumentarem.',
    pattern: /HTTP 500|WTA HTTP [^\n]*: 500\b/i
  },
  {
    id: 8,
    name: 'jar ou wsh de origem ausente',
    symptom: '"Jar do WSH não encontrado"; conferência "O WSH não tem de onde sair"; a criação para em 5/5 WSH depois de restaurar o banco.',
    cause: 'o jar escolhido não existe no caminho da distro, ou o container wsh-<origem> (modelo do novo) não existe.',
    fix: 'conferir com ls -l <caminho do jar> e docker ps -a --filter name=wsh-; escolher outro jar ou outra origem que tenha WSH, ou criar sem WSH e criar depois.',
    pattern: /Jar do WSH não encontrado|O WSH não tem de onde sair/i
  },
  {
    id: 9,
    name: 'WSH recusa a versão do WTA',
    symptom: '"Falhou: WSH", wsh-<nome> reiniciando (reinícios subindo); conferência "O WSH recusaria subir".',
    cause: 'o dependencies.json do jar exige uma versão mínima de cada feature e a lista do WTA tem uma menor.',
    fix: 'ler o log do WSH (docker logs --tail 80 wsh-<nome>), achar a feature citada e subir a versão dela na lista (versions/<v>.features), ou usar um jar mais antigo.',
    pattern: /Falhou: WSH|O WSH recusaria subir|dependencies\.json/i
  },
  {
    id: 10,
    name: 'Winthor.ini do WSH',
    symptom: 'WSH sobe mas não conecta ao WTA/banco; erro de login no log do WSH.',
    cause: 'a senha no Winthor.ini precisa estar em MAIÚSCULAS, e o arquivo vem do wsh-<origem>.',
    fix: 'conferir o Winthor.ini do wsh-<nome> (senha em maiúsculas); não mostrar nem repetir a senha.',
    pattern: /Winthor\.ini/i
  },
  {
    id: 11,
    name: 'memória do WSL',
    symptom: 'container "Exited (137)" / OOMKilled / "Killed"; vários ambientes no ar.',
    cause: '137 é falta de memória (ou docker stop): dois Oracles, dois WTAs (-Xmx2g) e WSH estouram a memória do WSL.',
    fix: 'ver free -m, parar um ambiente que não está em uso (descreva docker stop no texto) ou aumentar memory= no .wslconfig e reiniciar o WSL (wsl --shutdown, no texto).',
    pattern: /Exited \(137\)|OOMKilled|\b137\b.*(?:exit|sa[ií]u)|\bKilled\b/i
  },
  {
    id: 12,
    name: 'disco cheio',
    symptom: '"No space left on device"; df mostra / ou /opt quase cheios.',
    cause: 'o backup RMAN fica em /opt/dumps/bkp_rman/<origem>, cada imagem tem ~2,5 GB e o banco novo ocupa mais.',
    fix: 'ver df -h / /opt e docker system df (leitura); liberar espaço (backups antigos, imagens sem uso) é decisão do usuário, descrita no texto.',
    pattern: /No space left on device|ENOSPC|sem espa[cç]o/i
  },
  {
    id: 13,
    name: 'WTA que não termina de subir',
    symptom:
      '"O WTA não termina de subir"; a raiz do WTA responde HTTP 200 mas o login (/winthor/autenticacao/v1/login) dá 404 por mais de 8 minutos; o log do WTA tem “Application context initialization for <bundle> has timed out waiting for ...” e "Existem pacotes em transição, postergando a análise de saúde".',
    cause: 'o Karaf travou: bundles (Spring DM/blueprint) estouraram o tempo esperando serviços de outros bundles que não aparecem. Diferente do Karaf ainda subindo (item 7): aqui o tempo passou e não vai terminar sozinho.',
    fix: 'ver os bundles citados com docker logs --tail 200 wta-<nome>; reiniciar o WTA (docker restart wta-<nome>) às vezes destrava; se o mesmo bundle estoura de novo, falta uma feature ou um serviço de que ele depende (conferir a lista de features da versão e o WSH/Oracle no ar).',
    pattern: /O WTA não termina de subir|has timed out waiting|pacotes em transi/i
  }
];

/** Entradas do catálogo que combinam com o texto lido. */
export function matchKnownFailures(text: string): KnownFailure[] {
  return KNOWN_FAILURES.filter((f) => f.pattern.test(text));
}

/** O catálogo como texto do prompt (compacto: uma entrada por bloco de três linhas). */
export function knownFailuresPrompt(): string {
  return [
    'Falhas conhecidas (sintoma → causa → o que fazer). Se o relatório, o log ou o que o usuário colou combinar, use a entrada em vez de inventar:',
    ...KNOWN_FAILURES.map((f) => `${f.id}. ${f.name}. Sintoma: ${f.symptom} Causa: ${f.cause} Fazer: ${f.fix}`)
  ].join('\n');
}
