; Telas do instalador (pt-BR), ligadas pelo electron-builder (nsis.include):
; - boas-vindas e conclusão com texto próprio (as imagens laterais vêm de scripts/generate-icons.cjs);
; - telas opcionais depois da escolha da pasta. Nada nelas é obrigatório: "Avançar" pula a tela.
; Boas-vindas e telas opcionais são ignoradas em atualizações.

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

  ; A área útil da página do assistente tem ~140u de altura: tudo aqui fica abaixo de 130u.
  ${NSD_CreateLabel} 0 0 100% 30u "Só precisa disto para Oracle 11g ou anterior (modo Thick) ou para backup com expdp/impdp. Para Oracle 12c ou mais novo o Hub Manager conecta direto (modo Thin): clique em Avançar."
  Pop $0

  ${NSD_CreateLabel} 0 32u 100% 34u "Como instalar: baixe os pacotes x64 Basic e Tools (para servidor 11.2 use a versão 19c) e extraia os dois na mesma pasta, por exemplo C:\oracle. Instale também o Visual C++ Redistributable x64 se o Windows não tiver."
  Pop $0

  ${NSD_CreateButton} 0 70u 45% 13u "Abrir página de download"
  Pop $0
  ${NSD_OnClick} $0 OraclePageOpenDownload

  ${NSD_CreateButton} 48% 70u 45% 13u "Abrir Visual C++ Redistributable"
  Pop $0
  ${NSD_OnClick} $0 OraclePageOpenVcRedist

  ${NSD_CreateCheckbox} 0 88u 100% 10u "Criar a pasta ${ORACLE_DIR_PADRAO} agora (onde extrair os arquivos)"
  Pop $extrasMakeDir

  ${NSD_CreateLabel} 0 102u 100% 26u "Depois, no app: Banco de Dados > editar a conexão Oracle > ative o Modo Thick e informe a pasta extraída. Detalhes no LEIA-ME.txt."
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

  ${NSD_CreateLabel} 0 0 100% 36u "O chat de IA e a busca na documentação usam um modelo de linguagem. Escolha uma opção, ou nenhuma:$\r$\nA) Chave de API: OpenAI, Gemini, Anthropic, OpenRouter, Groq ou DeepSeek. Não instala nada.$\r$\nB) Ollama: modelo local, gratuito, sem enviar dados para fora."
  Pop $0

  ${NSD_CreateLabel} 0 40u 100% 26u "No app: Configurações > IA & LLM. Para o Ollama, instale (botão abaixo), rode  ollama pull llama3.2  e escolha Ollama."
  Pop $0

  ${NSD_CreateButton} 0 70u 45% 13u "Abrir página do Ollama"
  Pop $0
  ${NSD_OnClick} $0 LlmPageOpenOllama

  ${NSD_CreateLabel} 0 90u 100% 36u "A busca semântica (RAG) baixa o modelo de embeddings sozinha no primeiro uso, com internet; sem acesso, veja o LEIA-ME.txt. Para pular, clique em Avançar."
  Pop $0

  nsDialogs::Show
FunctionEnd

Function LlmPageOpenOllama
  ExecShell "open" "${URL_OLLAMA}"
FunctionEnd

  Page custom OraclePageCreate OraclePageLeave
  Page custom LlmPageCreate
!macroend

; ---------------------------------------------------------------- Boas-vindas
; O instalador assistido do electron-builder não tem boas-vindas própria: só aparece a que for definida aqui.
!macro customWelcomePage
  !insertmacro skipPageIfUpdated
  !define MUI_WELCOMEPAGE_TITLE "Bem-vindo à instalação do Hub Manager"
  !define MUI_WELCOMEPAGE_TEXT "O cockpit para o dia a dia com WinThor: ambiente, Karaf, banco de dados, deploy OSGi e qualidade num lugar só.$\r$\n$\r$\n•  Atalhos na Área de Trabalho e no Menu Iniciar$\r$\n•  Atualizações automáticas pelo próprio app$\r$\n•  Suas conexões, perfis e configurações são mantidos ao atualizar$\r$\n$\r$\nSe o Hub Manager estiver aberto, feche-o antes de continuar."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; ---------------------------------------------------------------- Conclusão
; Mesmo comportamento da conclusão padrão do electron-builder (assistedInstaller.nsh: StartApp com
; --updated em atualizações), só com título e textos próprios.
!macro customFinishPage
  !ifndef HIDE_RUN_AFTER_FINISH
    Function StartApp
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
    !define MUI_FINISHPAGE_RUN_TEXT "Abrir o Hub Manager agora"
  !endif
  !define MUI_FINISHPAGE_TITLE "Hub Manager instalado"
  !define MUI_FINISHPAGE_TEXT "Na primeira abertura, uma configuração rápida detecta seus caminhos (projetos, Karaf, IDE) e liga só os módulos que você usa.$\r$\n$\r$\nAtalhos criados na Área de Trabalho e no Menu Iniciar."
  !insertmacro MUI_PAGE_FINISH
!macroend
