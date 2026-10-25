# Roteiro de coleta: integração WinThor → WSH → CH (PDVSync) → PDV

Para levar à máquina que tem o ambiente completo (Oracle, Karaf com os serviços WinThor, WSH, CH e PDV).
O objetivo é trazer de volta o que falta para melhorar o Rastreio de Integração da
[decisão 0003](decisions/0003-rastreio-de-integracao-ponta-a-ponta.md) e saber se o que já foi construído se comporta bem no
ambiente real.

**Já respondido pelo repositório de layouts do WSH:** o contrato da API de lote do PDVSync (abrir, fechar, consultar, status
por loja), os status do lote, o tipo de lote por rota, a ordem dos passos de um fluxo e os agendamentos. Está tudo em
[referencia-wsh-pdvsync.md](referencia-wsh-pdvsync.md). Este roteiro cobre só o que o repositório não mostra.

Na ordem em que eu faria:

| Ordem | Item | Destrava |
|-------|------|----------|
| 1 | Levantamento do ambiente (script, 1 minuto) | Nomes de serviço, portas, logs, Karaf |
| 2 | **Oracle do WSH** (estrutura e amostras) | Histórico de execuções e lote atual direto do banco |
| 3 | PDVSync do ambiente: endereço, inquilino e uma consulta de lote real | Validar o cliente do PDVSync (já implementado) e confirmar a leitura dos status |
| 4 | Como forçar a execução de um fluxo | Botão "Disparar fluxo" |
| 5 | Como se confere uma **venda** (entrada) | Modelo de rastreio para o sentido PDV → WinThor |
| 6 | Karaf com telemetria e tabela do PDV | Passo 3 pelo APM e a consulta de evidência do PDV |
| 7 | Testar o Hub de verdade | Ajustes do que já existe |

## Antes de sair

- **O que vai no pendrive ou na nuvem:** este roteiro e o arquivo `scripts/collect-integration-env.ps1`.
- **Se for rodar o Hub da branch na máquina,** o código do rastreio de lote precisa estar commitado e enviado ao remoto.
- **Não é obrigatório rodar o Hub lá.** As partes 1 a 6 só pedem o script, `curl.exe` e consultas SQL.

## Sigilo: o que nunca trazer

- Senhas, tokens, `client_secret`, chaves e cookies. Troque por `<TOKEN>` ou `<SENHA>` antes de copiar qualquer coisa.
- CPF, CNPJ, nomes de cliente e e-mails dentro de JSON de venda: mascare ou apague.
- O script mascara senhas e tokens que aparecem em linha de comando, mas **abra o arquivo e confira** antes de enviar.
- No PowerShell, use `curl.exe` (e não `curl`, que é um apelido de outro comando).

## 1. Levantamento do ambiente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\collect-integration-env.ps1 -OutFile .\coleta-ambiente.txt
```

É somente leitura: não conecta em banco, não chama API e não lê o conteúdo de nenhum arquivo. Ele lista serviços Windows,
processos Java e afins, portas em escuta, containers Docker, a pasta do Karaf (e se existe o agente OpenTelemetry) e os nomes dos
arquivos de log por perto. Se o filtro padrão não pegar o nome dos seus serviços, use `-Pattern 'parte1|parte2'`.

**Traga:** o `coleta-ambiente.txt` revisado.

## 2. Oracle do WSH

O WSH grava fluxos, variáveis e cada integração no Oracle. Se o banco já guarda o histórico, o Hub consegue mostrar as execuções
e o lote atual sem depender de log. Todas as consultas abaixo só leem.

```sql
-- 2.1 estrutura das tabelas do WSH
select table_name, column_name, data_type, data_length
from all_tab_columns
where table_name in ('PCINTEGRACAOCORE', 'PCINTEGRACAOVARIAVEIS', 'PCINTEGRACAOFLUXOEXECUCAO',
                     'PCINTEGRACAOAGENDAMENTO', 'PCINTEGRACAOERROREQUISICAO')
order by table_name, column_id;

-- 2.2 as 30 integrações mais recentes, sem o conteúdo (que pode ter dados de cliente)
select * from (select id, idexterno, datacriacao from pcintegracaocore order by id desc) where rownum <= 30;

-- 2.3 onde fica o número do lote (nada de senha aqui: só chaves de lote)
select idrotaservico, chave, tipochave, tipovalor, valor
from pcintegracaovariaveis
where upper(chave) like '%LOTE%' and upper(chave) not like '%URL%';

-- 2.4 fluxos ativos e agendamentos
select descricao, ordemexecucao, idrotaservico, idintegracaoclassemetodo, ativo
from pcintegracaofluxoexecucao where ativo = 'S' order by descricao, ordemexecucao;

select descricao, agendamentosegundos, delayinicialsegundos from pcintegracaoagendamento;
```

**Traga:**

- o resultado de **2.1** inteiro (é o que me diz se há colunas de **status, erro, rota e data de processamento**);
- **2.2**: os valores de `IDEXTERNO` mostram como o WSH nomeia cada integração e se o número do lote aparece neles;
- **2.3**: se `{{LOTE_ORIGEM}}` guarda o lote aberto e se, depois de um fluxo terminar bem, a variável some ou fica;
- **2.4**: quais fluxos estão ativos neste ambiente e de quanto em quanto tempo rodam;
- **o que você mais consulta hoje** nessas tabelas para saber se uma integração rodou.

Se algum valor puder ter senha, token ou dado de cliente, não traga: descreva.

## 3. PDVSync do ambiente

**O que preciso saber:** os endereços de abrir, fechar, consultar lote e status por loja **que este ambiente usa** (produção,
homologação ou uma cópia local), o código do inquilino e se o lote devolvido bate com o que o WSH registrou.

**O Hub já tem o cliente do PDVSync.** Se o Hub da branch rodar na máquina, o caminho mais curto é preencher a camada CH em
**Configurações → Integração ponta a ponta** (autenticação *Login do PDVSync (RAC)*, inquilino e os endereços; o atalho de ambiente
preenche produção ou homologação), clicar em *Conferir agora* no pré-voo (o item *Login PDVSync* confirma as credenciais) e rastrear
um lote. Os valores de usuário, senha, `client_id` e `client_secret` estão nas variáveis do WSH.

Os endereços ficam nas variáveis do WSH (parâmetros de ambiente `AMBIENTE_PRODUCAO` e `AMBIENTE_HOMOLOGACAO` do repositório).
Sem o Hub, ou para comparar com o que ele mostra, confirme o formato de resposta, **num lote que já existe**, no API Studio do Hub (evita deixar a senha no histórico do
terminal) ou assim:

```powershell
# token do PDVSync (substitua; não cole a resposta com o token)
curl.exe -s -X POST "<URL_RAC_PDVSYNC>" -H "Content-Type: application/x-www-form-urlencoded" `
  --data-urlencode "grant_type=password" --data-urlencode "username=<USUARIO>" --data-urlencode "password=<SENHA>" `
  --data-urlencode "scope=authorization_api" --data-urlencode "client_id=<CLIENT_ID>" --data-urlencode "client_secret=<SEGREDO>"

# consultar um lote
curl.exe -s -H "Authorization: Bearer <TOKEN>" "<URL_CONSULTAR_LOTE>/<INQUILINO>/<NUMERO_DO_LOTE>"

# status do lote por loja
curl.exe -s -H "Authorization: Bearer <TOKEN>" "<BASE_URL_STATUS_LOTE>?inquilino=<INQUILINO>&loteOrigem=<NUMERO_DO_LOTE>&idRetaguardaLoja=<FILIAL>"
```

**Traga:**

- a resposta de **consultar lote** e de **status por loja** para **três lotes**: um que ficou bom, um com erro e um ainda em andamento
  (sem dados de cliente);
- qual status aparece quando as lojas **já baixaram** o lote, para eu confirmar a leitura dos códigos 0 a 9;
- o endereço, o inquilino (pode mascarar parte) e se o ambiente é local, homologação ou produção.

## 4. Como forçar a execução de um fluxo

Os fluxos rodam por agendamento. Para o botão "Disparar fluxo" eu preciso saber **como você roda um fluxo agora quando está
testando**: baixa o tempo do agendamento, ativa o fluxo pelo `ATIVO`, chama alguma API ou tela do WSH? Traga o passo a passo
exato. Anote também o arquivo de **log do WSH** e **cinco linhas reais** de uma execução (abrir, enviar, fechar lote), com o número
do lote no texto.

## 5. Venda (sentido PDV → WinThor)

A venda não usa lote. Como você confere hoje que uma **venda chegou ao WinThor**? Traga: a tabela ou tela do WinThor que mostra a
venda recebida, o campo que liga a venda do PDV ao registro do WinThor (o `idMensagem` do PDVSync?), e o que acontece quando
falha (fica em fila, vai para um monitor de vendas?). O fluxo 25 do repositório (`Atualizar Status Venda Retaguarda`) usa "venda
monitor": diga o que é.

## 6. Karaf, PDV e serviços do CH

**Karaf (APM).** O script já mostra se `bin\opentelemetry-javaagent.jar` existe e se há `-javaagent` na linha do Java. Para
confirmar: em **Configurações → Karaf**, ligue a telemetria APM, reinicie o Karaf pelo Hub, chame a API que o fluxo consome do
WinThor e veja em **APM & Traces** se o trace apareceu. **Traga:** se apareceu e a **rota exata** que o APM mostra.

**PDV (Postgres).** Como o PDVSync diz por loja se o lote foi baixado, a consulta no Postgres passa a ser um complemento. Se ela ainda
for útil: no Postgres do PDV rode `select table_schema, table_name, column_name, data_type from information_schema.columns where
column_name ilike '%lote%'` e traga tabela, coluna, tipo, e quanto tempo o dado leva para aparecer depois que o lote fecha.

**Serviços do CH.** O PDVSync dos layouts é um serviço em nuvem. **Traga:** o ambiente local usa a nuvem (produção ou
homologação), uma cópia instalada na máquina, ou um simulador? Se houver serviços locais, o nome do serviço Windows (o script
mostra), a porta e o log.

## 7. Testar o que já foi construído

Só se o Hub da branch rodar na máquina:

```powershell
npm ci
npm run server      # um terminal
npm run dev         # outro terminal; abra http://localhost:5173
```

1. Em **Configurações → Integração ponta a ponta**, preencha as camadas e **um fluxo de saída** (produto, por exemplo; a venda não
   usa lote) com o que descobriu acima.
2. Em **Rastreio de Integração → Pré-voo**, clique em *Conferir agora*. Tire um print.
3. Em **Rastrear lote**, rastreie um lote **que desceu** e outro **que não desceu**. Use *Copiar relatório (Jira)* e traga os dois.

**Anote o que estranhar.** Principalmente:

- verificação que deu aviso ou falha sem motivo, ou que ficou ok quando não devia;
- o tempo de espera (`pdvWaitSeconds`) curto ou longo demais para a descida real;
- o `count(*)` e os binds `:lote`, `:inicio` e `:fim` funcionarem como a dica do editor promete;
- o log do lote não casar por causa do formato do número (zeros à esquerda, prefixo);
- o passo 3 pelo APM pegar a chamada certa, ou a de outro lote.

## Como me devolver

Cole o `coleta-ambiente.txt` e preencha a tabela abaixo (pode ser parcial, qualquer resposta já ajuda):

| Nº | Pergunta | Resposta |
|----|----------|----------|
| O1 | Resultado de 2.1 a 2.4 (estrutura, amostras, lote, fluxos ativos) | |
| P1 | Ambiente do PDVSync, inquilino e respostas reais de consulta de lote e status por loja | |
| P2 | Como forçar a execução de um fluxo; log do WSH e como o lote aparece nele | |
| V1 | Como conferir que uma venda chegou ao WinThor | |
| P3 | O Karaf exporta OTLP? Rota exata no APM e caminho do log | |
| P4 | Tabela, coluna e tipo do lote no PDV; tempo até o dado aparecer (se ainda for útil) | |
| P5 | O CH do ambiente é nuvem, cópia local ou simulador? Serviços, porta e log | |
| F1 | Os fluxos que você mais testa, em ordem | |
