# Referência: como o WSH integra o WinThor com o PDVSync (CH)

Resumo do repositório [totvs/winthor-smart-hub-layouts](https://github.com/totvs/winthor-smart-hub-layouts), lido na versão
`1.37.0.10` (commit `9f2bc66`), pasta `pdvsync`. O PDVSync é o antigo nome do CH. Serve de base para o Rastreio de Integração
(decisão [0003](decisions/0003-rastreio-de-integracao-ponta-a-ponta.md)).

Cada afirmação abaixo vem dos arquivos do repositório, salvo as marcadas como **a confirmar**.

## 1. Como o WSH guarda tudo

Os layouts do repositório viram linhas em tabelas Oracle do WinThor. Em tempo de execução o WSH lê as mesmas tabelas.

| Tabela | O que guarda |
|--------|--------------|
| `PCINTEGRACAOROTASERVICO` | Uma **rota** por chamada de API: layout de comunicação (método, URL, cabeçalhos e corpo, no formato do Postman), layout de transformação (spec do JOLT), tipo (`BUSCAR` ou `ENVIAR`) e se é autenticador |
| `PCINTEGRACAOFLUXOEXECUCAO` | Os **passos** de um fluxo: ordem, rota, classe Java que executa (`IDINTEGRACAOCLASSEMETODO`), passo de que depende e se está ativo |
| `PCINTEGRACAOVARIAVEIS` | Variáveis de cada rota (`{{TOKEN}}`, `{{URL_...}}`...), por `PARAMS` ou `BODY`. O valor pode ser um texto fixo ou um **SELECT** que o WSH executa |
| `PCINTEGRACAOCORE` | Registros integrados. Colunas já usadas pelo Hub: `ID`, `IDEXTERNO`, `DADOSTRANSFORMADOS` (JSON) e `DATACRIACAO` |
| `PCINTEGRACAOAGENDAMENTO` e `...AGENDAMENTOFLUXO` | De quanto em quanto tempo cada fluxo roda |
| `PCINTEGRACAODADOSEMPRESA` e `...EMPRESAFILIAL` | Dados da empresa de API (PDVSYNC, WTA) e das filiais |
| `PCINTEGRACAOERROREQUISICAO` | Tratamento de erro conhecido por rota |

## 2. Dois sentidos de fluxo

**Saída (WinThor → PDV)**, com lote: clientes, filiais, produto, preço, estoque, impostos, formas de pagamento e mais de vinte
outros. Um fluxo típico tem 7 passos.

**Entrada (PDV → WinThor)**, **sem lote**: vendas, pedidos recebidos e cancelados, movimentação de caixa, clientes. Um fluxo
típico tem 5 passos.

> **Venda é de entrada.** O fluxo 16 busca as vendas no PDVSync, envia ao WinThor e devolve o status. Nunca abre lote. O rastreio
> que construí até aqui segue o modelo de saída (lote), então serve a produto, preço e estoque, não à venda.

### Fluxo de saída, com Produto de exemplo

| # | Rota | Classe de execução | O que faz |
|---|------|--------------------|-----------|
| 1 | `WTA - LoginWTA` | `AutenticadorRefreshTokenApi` | Login no WinThor |
| 2 | `WTA - Buscar Produto PDV` | `BuscaRotaServicoPaginada` | Busca os dados na API do WinThor e aplica o JOLT |
| 3 | `PDVSYNC - RAC LoginPDVSync` | `AutenticadorRefreshTokenApi` | Token do PDVSync |
| 4 | `PDVSYNC - Criar variavel temporaria` | `CriaVariavelTemporaria` | **Abre o lote** e guarda o número |
| 5 | `PDVSYNC - Salvar Produto` | `EnvioIntegracaoStatusRecebidoLote` | Envia o JSON ao PDVSync com o lote |
| 6 | `PDVSYNC - Encerrar variavel temporaria` | `FinalizaVariavelTemporaria` | **Fecha o lote** |
| 7 | `PDVSYNC - Consultar lote` | `ConsultarStatusPosIntegracao` | Consulta o status do lote |

A ordem real difere da que eu havia descrito: o login no PDVSync e a abertura do lote vêm **depois** da busca no WinThor, não antes.

### Fluxo de entrada: Vendas (fluxo 16)

`Login PDVSync` → `Buscar vendas` (GET do inquilino em `preVendaMensagens` ou `vendaMensagens`, conforme o ambiente) → `Login WinThor` →
`Enviar venda` (POST `/winthor/varejo/v1/movimentacao/venda`) → `Atualizar status venda` (PUT `vendaMensagens` com
`idMensagem` e `status`). Roda por agendamento (300 s no layout padrão).

## 3. Contrato do lote no PDVSync

Autenticação: `POST {{URL_RAC_PDVSYNC}}`, formulário `grant_type=password`, `username`, `password`, `scope=authorization_api`,
`client_id`, `client_secret`; o token vem em `access_token`. As chamadas seguintes usam `Authorization: Bearer`.

| Ação | Chamada | Resposta que importa |
|------|---------|----------------------|
| Abrir lote | `POST {{BASE_URL_ABRIR_LOTE}}` com `{"tipoLote":[<código>],"idInquilino":"<inquilino>","status":"0"}` | `data.loteOrigem`: **o número do lote** |
| Fechar lote | `PUT {{BASE_URL_FECHAR_LOTE}}/<inquilino>/<loteOrigem>` | sem corpo |
| Consultar lote | `GET {{URL_CONSULTAR_LOTE}}/<inquilino>/<loteOrigem>` | `data[0].loteOrigem` e `data[0].status` (0 a 9, abaixo) |
| Status por loja | `GET {{BASE_URL_STATUS_LOTE}}?inquilino=&loteOrigem=&idRetaguardaLoja=` | `data.lojaLotes[]` com status e `errosIdentificados` por loja |

Os endereços variam por ambiente. Em produção, `https://pdvsync.varejo.totvs.com.br/controleprocesso/api/retaguarda/v3/`
(`inquilinolotesexternos`, `LoteExternoRetornos`) e `.../controle/api/retaguarda/v3/LojaLoteStatusretorno`. Em homologação, o
mesmo caminho em `qua-pdvsync.varejo.totvs.com.br`; os serviços de dados (produto, preço, estoque) usam endereços `*.run.app`.

### Status do lote (`LoteExternoRetornos`)

| Código | Nome | Código interno do WSH | Leitura |
|--------|------|-----------------------|---------|
| 0 | EmPreparacao | 1 | aguardando |
| 1 | EmProcessamento | 4 | em andamento |
| 2 | Disponivel | 2 | sucesso |
| 3 | Indisponivel | 3 | erro |
| 4 | EmProcessoDeBaixa | 4 | em andamento |
| 5 | BaixadoComSucesso | 2 | sucesso |
| 6 | BaixadoComErro | 3 | erro |
| 7 | EnviadoComSucesso | 2 | sucesso |
| 8 | EnviadoComErro | 3 | erro |
| 9 | ComProblemaVerificar | 3 | erro |

Os códigos 1 a 4 do WSH vêm da transformação da rota; os rótulos da última coluna são leitura minha (**a confirmar**).

Pelo nome, `BaixadoComSucesso` significa que as lojas já baixaram o lote (**a confirmar**). Se for isso, a chegada ao PDV pode ser
provada **pela própria API do PDVSync**, sem consultar o Postgres. Ao gravar no WinThor, o WSH converte o status por loja para 11,
12, 13 ou 99 (**a confirmar** o significado de cada um).

### Tipo de lote por rota

O `{{TIPO_LOTE}}` é um SELECT que devolve um código fixo por rota de busca. Os principais:

| Código | Rotas |
|--------|-------|
| 0 | Clientes |
| 1 | Filiais lojas |
| 3 | Perfil padrão |
| 4 | Usuário operador, RCA, profissionais |
| 6 | Compartilhamento master e filiais |
| 7 | ICMS |
| 8 | Imposto NCM |
| 9 | PIS e COFINS |
| 12 | Produto |
| 13 | Preço produto, região e embalagem |
| 14 | Estoque |
| 15 | Operadora de cartão |
| 16 | Dados de pagamento |
| 17 | Planos de pagamento |
| 18 | Tipos de cobrança |
| 21 | Grupo campanha cliente |
| 28 | Preço fixo |
| 29 | CFOP da reforma tributária |
| 55 | Status do pedido |
| 58 | Ramo de atividade |
| 59 | Desconto e acréscimo |
| 100 | Região |
| 101, 102, 103 | Imposto, NCM e produto da reforma tributária |

### Regras que o WSH já conhece

- **Só um lote aberto por vez para o mesmo tipo.** Abrir de novo devolve HTTP 400 com a mensagem
  `Não é possível solicitar um novo lote. Lote N em andamento`. O WSH extrai o `N` dessa mensagem, e a rota
  `PDVSYNC - Encerrar variavel temporaria` é executada para fechá-lo (`ERRO_REQUISICAO_CRIAR_FINALIZAR_LOTE`).
- **O lote fica numa variável.** A abertura grava o `loteOrigem` na variável `{{LOTE_ORIGEM}}` da rota (**a confirmar** no
  Oracle). Se for assim, um lote preso aparece como variável preenchida.
- **O WinThor também registra lotes:** `GET /winthor/integracao/fulfillment/v1/lote?dataInicial=` lista os lotes
  (`numeroLote`), o fluxo 24 consulta o status de cada um no PDVSync e grava o resultado de volta por
  `POST` e `PUT` na mesma API.

## 4. Agendamento

Os fluxos não são disparados à mão: o WSH os executa por agendamento. **O intervalo é configuração de cada cliente**
(`PCINTEGRACAOAGENDAMENTO.AGENDAMENTOSEGUNDOS`): por isso o repositório traz 600 s para a consulta de status do lote e o
levantamento WORKFLOW_PDVSYNC traz 300 s, e nenhum dos dois vale para todo ambiente. Os layouts sugerem 300 s para vendas,
monitor de vendas, movimento de caixa e pedidos. O Hub não fixa intervalo no catálogo: a Ficha do fluxo, aberta, lê o agendamento do
próprio ambiente (`PCINTEGRACAOFLUXOEXECUCAO` com a rota, `PCINTEGRACAOAGENDAMENTOFLUXO` e `PCINTEGRACAOAGENDAMENTO`), aceitando a
ligação por id ou por descrição, porque os layouts usam nomes e o tipo da coluna no banco ainda não foi confirmado. Ativar ou desativar um fluxo é a coluna `ATIVO` de `PCINTEGRACAOFLUXOEXECUCAO` (nos fluxos que li, Vendas e Produto,
os layouts vêm com `N`).

## 5. O que isso muda no Rastreio de Integração

| Ponto | Antes | Agora |
|-------|-------|-------|
| Venda | Tratada como fluxo de saída com lote | É de entrada, sem lote. Fora do rastreio por enquanto; precisa de modelo próprio (V1) |
| Ordem dos passos | Lote aberto primeiro | **Aplicada**: `winthor-login`, `winthor-fetch`, `jolt`, `pdvsync-login`, `open-batch`, `send`, `close-batch`, `pdv-arrival` |
| API do CH (P1) | Pendente | **Cliente implementado** (login RAC, consultar lote e status por loja), testado com um servidor falso. Falta validar contra um ambiente real: inquilino, credenciais e endereços ficam com você |
| Chegada ao PDV | Só por SQL no Postgres | Pelo status por loja na API do PDVSync, com o SQL do banco do PDV como confirmação |
| Disparar fluxo (P2) | Esperava uma API do WSH | Há agendamento. Falta saber como forçar a execução |
| Lote atual ou preso | Desconhecido | Provável variável `{{LOTE_ORIGEM}}` no Oracle (a confirmar) |
| Execuções do WSH | Só logs | **Monitor do WSH**: cada item na `PCINTEGRACAOCORE`, com status (2 integrado, 3 erro) e a resposta do PDVSync na `OBSERVACAO` |

Perguntas que continuam abertas estão em [roteiro-coleta-integracao.md](roteiro-coleta-integracao.md).

## 6. Catálogo dos fluxos e dependências (WORKFLOW_PDVSYNC)

O levantamento WORKFLOW_PDVSYNC (serviço `winthor-integracao-core`, 38 fluxos e 87 rotas) está codificado em
`src/shared/wshFlowCatalog.ts`, que o Monitor do WSH usa para nomear a rota pelo fluxo, desenhar o sentido certo e mostrar as dependências.

- **Envio (WinThor → PDVSync):** 01-14, 17, 21, 23, 26-36 e 38. A rota `WTA - Buscar ...` cria a linha; a `PDVSYNC - ...` envia.
- **Recebimento pelo ERP (PDVSync → WinThor):** 15 (caixa), 16 (vendas), 19 (pedido recebido), 20 (pedido cancelado) e 37
  (cliente). A rota `PDVSYNC - BUSCAR ...` cria a linha; a `WTA - Enviar ...` grava no WinThor.
- **Monitor:** 18 (status pedido), 24 (status do lote) e 25 (status venda). **Utilitário:** 22 (registrar IP).
- **Processos online (fora do WSH):** 12 endpoints do PDVOmni vão direto ao WinThor (pré-venda, crédito, estoque, nota de
  entrada e saída, formas e condições do cliente). Não passam pela `PCINTEGRACAOCORE`. Estão em `src/shared/onlineProcessCatalog.ts`
  e na aba *Online do PDV*; as tabelas Oracle de cada um ainda serão mapeadas (Statement Tracer durante uma operação real).

**Dependências.** Um fluxo só integra bem se os fluxos de que ele depende já estão no PDVSync; senão os `idRetaguarda*`
referenciados não existem. A mais importante: **Produto (09) depende de ICMS (07), PIS/COFINS (06) e NCM (05)**, que ele
embute em `impostos[]`, `pisCofins[]` e `ncms[]`. O erro `impostos: O campo não pode ser nulo ou vazio` da coleta é esse caso.
Estoque e todos os preços dependem do Produto. A tabela completa está no catálogo.

## 7. Como o JOLT de vendas monta o que vai ao WinThor (par real, 2026-10-23)

Conferido num par de entrada e saída do mesmo registro (venda 50277 no PDVSync, cupom 10905), sem guardar os dados no repositório.

- **Entrada:** a rota `PDVSYNC - BUSCAR VENDAS` recebe `data[]` com `tipoDado: "Venda"`, `loteOrigem` (ex.: `Venda20261023172023547`) e
  a venda inteira em Base64 no campo `conteudo`. A operação `custom-totvs` (`=base64ToObject`) decodifica antes do shift.
- **Saída:** um envelope `{"items":[...], "_attr_access":"items"}`. O `_attr_access` diz qual lista vira linhas: **uma linha da
  `PCINTEGRACAOCORE` por item**, e o `DADOSTRANSFORMADOS` é o item. O mesmo `default` com `_attr_access` fecha os layouts de busca.
- **Identificadores:** `IDEXTERNO` = `pdvsync-vendamensagem-<id da mensagem>-<dataAtualizacao>`; `IDINTERNO` = `filial-série-cupom`
  (ex.: `1-3-10905`). Por isso o Monitor do WSH procura também no `IDINTERNO`: o cupom acha a venda sem ler dado de cliente.
- **Campos:** `numCupom` ← `Ccf`; `chaveNfce` ← `ChaveAcesso`; `codCob` ← `VendaPagamentos[].PagamentoForma.IdRetaguarda`; `codPlPag` ←
  `PagamentoCondicao.IdRetaguarda`; `codCli` ← `Cliente.IdRetaguarda`; `codProd` ← `Produto.IdRetaguarda`; `codUsur` ←
  `Vendedor.IdRetaguarda` **sem o prefixo `RCA-`**; `vlTabela`/`vlTotal` ← `ValorBruto`/`ValorLiquido`; o XML da nota passa em Base64 como
  veio. A lista completa está em `VENDA_ORIGINS`, em `src/shared/wshFlowCatalog.ts`.
- **Tipos:** neste par, valores saem como número e booleano (`316.93`, `false`); em outro exemplo saíram como texto (`"6.0"`). Ao comparar
  payloads, não assumir tipo nem ordem de chaves.
