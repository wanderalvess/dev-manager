; Telas opcionais do instalador (pt-BR). Nada aqui é obrigatório: "Avançar" pula a tela.
; Ligado pelo electron-builder (nsis.include). As telas entram depois da escolha da pasta e são
; ignoradas em atualizações automáticas.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!define URL_ORACLE_IC "https://www.oracle.com/database/technologies/instant-client/winx64-64-downloads.html"
!define URL_VCREDIST "https://aka.ms/vs/17/release/vc_redist.x64.exe"
!define URL_OLLAMA "https://ollama.com/download"
!define ORACLE_DIR_PADRAO "C:\oracle"

!macro customPageAfterChangeDir
  Var extrasDialog
  Var extrasMakeDir

; ---------------------------------------------------------------- Oracle Instant Client
Function OraclePageCreate
  ${If} ${isUpdated}
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Oracle Instant Client (opcional)" "Só para Oracle 11g ou antigo, e para backup com expdp/impdp."
  nsDialogs::Create 1018
  Pop $extrasDialog
  ${If} $extrasDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 62u "Você NÃO precisa disto se só usa Oracle 12c ou mais novo: o Hub Manager já conecta direto (modo Thin).$\r$\n$\r$\nInstale o Instant Client se você:$\r$\n  - conecta em Oracle 11g ou anterior (modo Thick), ou$\r$\n  - quer fazer backup/restore com expdp/impdp (precisa do pacote Tools)."
  Pop $0

  ${NSD_CreateLabel} 0 66u 100% 52u "Como instalar:$\r$\n1) Baixe os pacotes x64 Basic (ou Basic Light) e Tools. Para servidor 11.2 use a versão 19c: a 21 em diante não conecta em 11g.$\r$\n2) Extraia os dois .zip na mesma pasta, por exemplo C:\oracle (vira C:\oracle\instantclient_19_25).$\r$\n3) Instale também o Visual C++ Redistributable x64 se o Windows ainda não tiver."
  Pop $0

  ${NSD_CreateButton} 0 122u 40% 13u "Abrir página de download"
  Pop $0
  ${NSD_OnClick} $0 OraclePageOpenDownload

  ${NSD_CreateButton} 44% 122u 40% 13u "Abrir Visual C++ Redistributable"
  Pop $0
  ${NSD_OnClick} $0 OraclePageOpenVcRedist

  ${NSD_CreateCheckbox} 0 140u 100% 10u "Criar a pasta ${ORACLE_DIR_PADRAO} agora (onde extrair os arquivos)"
  Pop $extrasMakeDir

  ${NSD_CreateLabel} 0 154u 100% 30u "Depois, no app: Banco de Dados > editar a conexão Oracle > ative 'Modo Thick / Suporte a Oracle 11g' e informe a pasta extraída. Para expdp/impdp: Configurações > Backup de Bancos.$\r$\nPara pular, clique em Avançar."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function OraclePageOpenDownload
  ExecShell "open" "${URL_ORACLE_IC}"
FunctionEnd

Function OraclePageOpenVcRedist
  ExecShell "open" "${URL_VCREDIST}"
FunctionEnd

Function OraclePageLeave
  ${NSD_GetState} $extrasMakeDir $0
  ${If} $0 == ${BST_CHECKED}
    CreateDirectory "${ORACLE_DIR_PADRAO}"
  ${EndIf}
FunctionEnd

; ---------------------------------------------------------------- IA (LLM)
Function LlmPageCreate
  ${If} ${isUpdated}
    Abort
  ${EndIf}
  !insertmacro MUI_HEADER_TEXT "Assistente de IA (opcional)" "O Hub Manager funciona sem IA. Configure só se quiser usar o chat."
  nsDialogs::Create 1018
  Pop $extrasDialog
  ${If} $extrasDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 42u "O chat de IA e a busca na documentação usam um modelo de linguagem. Escolha uma das opções, ou nenhuma:$\r$\n$\r$\nA) Chave de API (BYOK): OpenAI, Gemini, Anthropic, OpenRouter, Groq ou DeepSeek. Não precisa instalar nada.$\r$\nB) Modelo local com o Ollama: gratuito, roda no seu computador, sem enviar dados para fora."
  Pop $0

  ${NSD_CreateLabel} 0 46u 100% 50u "Opção A, no app: Configurações > IA & LLM (BYOK) > escolha o provedor e cole a sua chave.$\r$\n$\r$\nOpção B: 1) instale o Ollama (botão abaixo); 2) abra um terminal e rode:  ollama pull llama3.2  3) no app, em Configurações > IA & LLM, escolha Ollama."
  Pop $0

  ${NSD_CreateButton} 0 100u 40% 13u "Abrir página do Ollama"
  Pop $0
  ${NSD_OnClick} $0 LlmPageOpenOllama

  ${NSD_CreateLabel} 0 120u 100% 20u "A busca semântica (RAG) baixa seu modelo de embeddings sozinha no primeiro uso, com internet. Se o computador não tiver acesso, veja o LEIA-ME.txt.$\r$\nPara pular, clique em Avançar."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function LlmPageOpenOllama
  ExecShell "open" "${URL_OLLAMA}"
FunctionEnd

  Page custom OraclePageCreate OraclePageLeave
  Page custom LlmPageCreate
!macroend
