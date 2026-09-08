# Dev Manager 🚀

> **Cockpit e Painel de Automação Desktop Integrado para Desenvolvedores e Apache Karaf OSGi.**

Desenvolvido em **Electron + React + TypeScript + Tailwind CSS**, o **Dev Manager** centraliza e automatiza todas as tarefas rotineiras do dia a dia de desenvolvimento: liberação de portas e serviços conflitantes em segundo plano, inicialização de IDEs, disparo do contêiner OSGi em modo debug, deploy automatizado de features Maven no Karaf, gerenciamento de repositórios Git / Azure DevOps, catálogo de rotinas e central completa de ajuda e diagnósticos. Além do Cockpit desktop, todas essas automações também ficam disponíveis para assistentes de IA como o Claude Code via um **servidor MCP** embutido.

---

## 📸 Visão Geral dos Recursos

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                   DEV MANAGER                                                    │
├─────────────┬──────────────┬─────────────┬─────────────────┬──────────────┬────────────┬──────────┬────────┬─────────┤
│ ⚡ Ambiente │ 🗄️ Database  │ 🐳 Docker   │ 📦 Karaf Deploy │ 🔀 Git/Azure │ 📑 Rotinas │ 📚 Docs  │⚙ Config│ ❓ Ajuda│
├─────────────┴──────────────┴─────────────┴─────────────────┴──────────────┴────────────┴──────────┴────────┴─────────┤
│ • Pipeline 1-Clique (Stop Srv -> Kill -> Launch IDE -> Servidor Debug)                                           │
│ • Database Studio Multi-Vendor (Oracle, Postgres, MySQL) com Inspetor de Colunas, Histórico e Snippets Custom     │
│ • Docker Cockpit: CPU/RAM em Tempo Real (docker stats), Terminal Interativo (docker exec) e Inspeção de Logs    │
│ • Karaf OSGi Deployer: Snapshots & Comparativo de Estado (Diff), Árvore de Dependências e Fiações Wired          │
│ • Hub Git & Azure DevOps: Sincronização rápida, detecção de branches e gerador de Pull Requests                  │
│ • Catálogo de Rotinas (.EXE e .PC) com busca rápida e favoritos                                                  │
│ • RAG Local com FastEmbed: Busca semântica vetorial sobre documentação, prévia rápida e abertura no editor      │
│ • Quick Launcher Spotlight (Ctrl+K) e Navegação Global por Teclado (Alt+1 .. Alt+9)                              │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Funcionalidades Detalhadas

### 1. ⚡ Cockpit & Preparação do Ambiente Dev
* **Pipeline Master de 1 Clique:**
  1. **Parada de Serviços Windows:** Interrompe serviços em segundo plano para liberar portas e comunicação.
  2. **Finalização de Processos:** Encerra processos em segundo plano que causam travas de portas ou arquivos.
  3. **Pausa de Segurança:** Aguarda liberação de sockets de rede e travas em arquivos de disco.
  4. **Inicialização da IDE:** Identifica e abre a IDE configurada (IntelliJ IDEA, VS Code, Cursor, Eclipse, etc.).
  5. **Disparo do Servidor Debug:** Inicializa o script de inicialização do Karaf em modo integrado no próprio painel ou em janela externa desvinculada.
* **Console Integrado OSGi:** Terminal interativo com streaming ao vivo e envio de comandos Karaf em tempo real (`bundle:list`, `la`, `feature:list`, `log:tail`, etc.).
* **Monitor de Portas de Rede em Tempo Real:**
  * Monitoramento contínuo de status e PID de portas essenciais: `:8889` (Portal Web), `:8101` (Karaf SSH), `:5005` (Java Remote Debug), `:1521` (DB Listener) e portas customizadas.
* **Controles Individuais:** Botões para iniciar/parar serviços separadamente, matar processos e abrir rotas web (`:8889` e `:8889/system/console`).

---

### 2. 🗄️ Database Studio Multi-Vendor
* **Suporte a Múltiplos Bancos de Dados:**
  * Conexão e execução direta para **Oracle Database** (`oracledb`), **PostgreSQL** (`pg`) e **MySQL** (`mysql2`).
* **Inspetor de Tabelas e Colunas:**
  * Barra lateral com listagem dinâmica de tabelas e expansão sob demanda para exibir colunas, tipos de dados, chaves primárias (PK) e nulabilidade.
  * Inserção rápida de nomes de colunas ou `SELECT` no editor com 1 clique.
* **Histórico Persistente de Consultas:**
  * Registro automático de queries executadas com tempo de resposta e quantidade de linhas retornadas, salvo localmente.
  * Reutilização, cópia rápida ou reexecução direta do histórico.
* **Biblioteca de Snippets Rápidos e Customizados:**
  * Snippets de fábrica (`SELECT`, `COUNT`, `JOIN`, `DDL`) e criação de snippets próprios do desenvolvedor para acelerar consultas recorrentes.

---

### 3. 📦 Gerenciador de Containers (Docker & Podman)
* **Compatibilidade Corporativa Multimotor (Docker & Podman):**
  * Auto-detecção inteligente do motor disponível (`docker` ou `podman`), permitindo operação completa em redes corporativas com restrições ao Docker Desktop.
* **Métricas de Recursos em Tempo Real:**
  * Exibição de consumo de **CPU (%)** e **Memória RAM** (`uso / limite e %`) diretamente no card de cada container via `stats --no-stream`.
* **Terminal Interativo Integrado (`exec -it`):**
  * Disparo com 1 clique de uma janela de terminal interativa conectada ao container (`sh` ou `bash`).
* **Controle de Ciclo de Vida & Logs:**
  * Iniciar, parar, reiniciar, remover containers e inspecionar logs com seleção de quantidade de linhas e cópia para área de transferência.

---

### 4. 📦 Deployer OSGi Apache Karaf & Gerenciador de Bundles
* **Auto-Detecção Inteligente via `pom.xml` e `deploy-local.bat`:**
  * Lê automaticamente `groupId`, `artifactId`, `version` e módulos ao selecionar qualquer projeto Git.
* **Snapshots de Estado e Comparativo Pós-Deploy (Diff):**
  * Salve "fotos" do estado de todos os bundles do Karaf e compare com o estado atual.
  * Identificação instantânea de versões atualizadas, novos bundles adicionados, bundles ausentes e componentes que mudaram de estado (ex: Active -> Resolved).
* **Árvore Hierárquica de Dependências OSGi:**
  * Visualização gráfica conectando o bundle selecionado aos seus bundles clientes dependentes (consumidores) e pacotes importados/exportados.
* **Gerenciamento Seguro de Bundles:**
  * Instalação via Maven/JAR/Projeto, atualização in-place de versão (`bundle:update`), reinstalação com rebuild Maven opcional e desinstalação com análise de risco de fiação.

---

### 5. 🔀 Git & Azure DevOps Hub
* **Varredura Automática de Repositórios:**
  * Localização automática de todos os projetos clonados na pasta de repositórios.
  * Detecção instantânea da branch atual ativa e contador de arquivos modificados (*uncommitted changes*).
* **Ações Rápidas de Sincronização:**
  * Botões diretos para `git fetch`, `git pull`, `git stash` e `git stash pop` sem precisar abrir o terminal.
* **Gerador de Pull Request no Azure DevOps:**
  * Reconhece organizações, projetos e repositórios hospedados no Azure DevOps (HTTPS e SSH).
  * Monta a URL de criação de PR comparando a branch de trabalho com a branch de destino (`develop`, `master`, etc.) e abre diretamente no navegador.

---

### 6. 📑 Catálogo & Lançador de Rotinas
* **Varredura Completa do Diretório Configurado:**
  * Reconhece executáveis (`.EXE`) e rotinas compiladas (`.PC`) organizadas por módulos funcionais.
* **Filtros e Busca Instantânea:**
  * Busca por código da rotina ou nome e filtro por módulo.
* **Sistema de Favoritos:**
  * Marcação de rotinas favoritas com estrelas fixadas no topo e salvas localmente.

---

### 7. 📚 RAG & Documentação Local Integrada
* **Busca Semântica Vetorial Local:**
  * Indexação e geração de embeddings locais via **FastEmbed** (`AllMiniLML6V2`), sem envio de dados para nuvem ou servidores externos.
  * Varre automaticamente arquivos `README.md` e documentações dos projetos Git e pastas avulsas configuradas.
* **Prévia Rápida de Documentos:**
  * Modal integrado para leitura imediata de arquivos de documentação sem sair da aplicação.
* **Abertura Flexível:**
  * Abertura direta no editor de código padrão do sistema operacional ou revelação na pasta do explorador de arquivos.

---

### 8. ⚙️ Configurações & Personalização
* **Detecção e Configuração Flexível de Diretórios:**
  * Permite ao usuário configurar caminhos personalizados para diretórios de projetos, executáveis, banco de dados e servidor Karaf.
* **Gerenciador de Portas de Rede Monitoradas:**
  * Adição, remoção e alternância de portas monitoradas, com atalhos de adição rápida (`:8889`, `:8181`, `:8101`, `:5005`, `:1521`).
* **Suporte a Temas:**
  * Alternador entre **Dark Mode**, **Light Mode** e variante **Midnight**.

---

### 9. ❓ Central de Ajuda, FAQ e Diagnóstico
* **Diagnóstico do Sistema (Health Check):**
  * Verificação de saúde de binários essenciais (Node.js, Git, Java, Docker, Karaf client).
* **Base de Conhecimento e FAQ Integrado:**
  * Guia rápido de resolução de problemas comuns e atalhos operacionais.

---

### 6. 🤖 Servidor MCP — Automação via Assistentes de IA
* **Model Context Protocol (MCP) via stdio:**
  * Expõe as mesmas automações do Cockpit (Ambiente, Perfis, Karaf, Git & Azure, Rotinas, Configurações) como *tools* que um cliente MCP — como o Claude Code — pode chamar diretamente, sem passar pela interface gráfica.
* **73 Tools Organizadas por Domínio:**
  * `system_*`, `env_*`, `profile_*`, `karaf_*` (inclui gerência de bundles: listar, instalar, reinstalar, atualizar versão, desinstalar e checar dependências), `docker_*`, `git_*`, `routines_*`, `rag_*`, `settings_*`, `db_*` (Oracle/PostgreSQL/MySQL), `deploy_*` e `network_*` — desde consultas de status até o pipeline completo de deploy Karaf e execução de perfis de automação.
* **Terceiro Consumidor da Mesma Camada de Serviços:**
  * Reaproveita exatamente as mesmas classes de serviço e validações de segurança (`isValidIdentifier`, `isSafeLocalPath`, `isSafeKarafCommand`) já usadas pelo IPC do Electron e pela API REST (`src/server`) — nenhuma lógica de negócio duplicada.
* **Protocolo Aberto — Funciona em Qualquer Cliente MCP:**
  * O servidor é MCP puro via stdio, sem nada específico de um cliente. Só muda o arquivo de registro:
  * **Claude Code:** [`.mcp.json`](.mcp.json) na raiz — abra o projeto e rode `/mcp`.
  * **VS Code / GitHub Copilot Chat (agent mode):** [`.vscode/mcp.json`](.vscode/mcp.json).
  * **Google Antigravity:** [`.agents/mcp_config.json`](.agents/mcp_config.json) (workspace) ou `~/.gemini/config/mcp_config.json` (global).
* **Execução Manual:**
  ```bash
  npm run mcp
  ```
  Inicia o servidor MCP via stdio (`tsx src/mcp/index.ts`) — mesmo mecanismo do script `server` (REST/Docker), agora falando o protocolo MCP.

> ⚠️ **Nota de segurança:** o servidor MCP tem o mesmo poder que o próprio Cockpit — iniciar/parar serviços Windows, matar processos, rodar builds Maven e comandos Karaf. Ele roda localmente via stdio (sem porta de rede exposta) e é pensado para uso pelo mesmo desenvolvedor que já opera essas ações pela interface. Transporte remoto/HTTP não faz parte desta versão.

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Shell Desktop** | [Electron](https://www.electronjs.org/) (v44), Node.js API (`child_process`, `fs`, `os`, `path`) |
| **Frontend** | [React](https://react.dev/) (v18), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Empacotamento** | [Electron Builder](https://www.electron.build/) (Instalador NSIS e Portátil com elevação de Admin) |
| **Integrações** | Windows Services (`sc`, `net stop/start`, `netstat`), Git CLI, Apache Karaf Client, Azure DevOps |
| **Servidor Web/Docker** | [Express](https://expressjs.com/), [ws](https://github.com/websockets/ws) (WebSocket), [tsx](https://github.com/privatenumber/tsx) |
| **Integração com IA** | [Model Context Protocol](https://modelcontextprotocol.io/) (`@modelcontextprotocol/sdk`), [Zod](https://zod.dev/) |

---

## 📋 Pré-requisitos

* **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit).
* **Node.js:** Versão 22.12.x ou superior.
* **npm:** Versão 9.x ou superior.
* **Privilégios de Administrador:** Necessário para iniciar e parar serviços do Windows.
* **Git:** Instalado e configurado no PATH do Windows.
* **Java JDK e Apache Karaf:** Instalados localmente para desenvolvimento OSGi.

---

## 🚀 Como Executar em Modo de Desenvolvimento

1. **Clone o repositório:**
   ```bash
   git clone <url-do-repositorio>
   cd dev-manager
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie a aplicação em modo de desenvolvimento:**
   ```bash
   npm run dev
   ```
   > O Vite inicializará o servidor de desenvolvimento e o Electron abrirá a janela com hot-reload ativo.

---

## 🐳 Como Executar no Docker (Web Cockpit)

Para executar o painel como um aplicativo web em contêiner Docker acessível pelo navegador em `http://localhost:3000`:

1. **Inicie os contêineres via Docker Compose:**
   ```bash
   docker compose up -d
   ```

2. **Acesse no navegador:**
   👉 [http://localhost:3000](http://localhost:3000)

> 💡 **Para detalhes completos sobre montagem de volumes, perfis Karaf/Oracle e comandos, veja o [DOCKER.md](DOCKER.md).**

---

## 📦 Como Gerar o Executável de Produção (.exe)

O projeto está configurado com o **Electron Builder** para empacotar a aplicação em binários nativos do Windows (`.exe`) com solicitação automática de privilégios de administrador.

### Comando de Build Completo:

Para compilar o código TypeScript, gerar os bundles otimizados do React/Vite e criar os executáveis:

```bash
npm run build:electron
```

> **Nota:** Esse comando executa internamente `npm run build` (checagem de tipos com `tsc` + compilação via `vite build`) e em seguida dispara o `electron-builder`.

---

### Tipos de Executáveis Gerados na pasta `release/`:

| Arquivo | Formato | Descrição |
| :--- | :--- | :--- |
| **`Dev Manager 1.0.0.exe`** | Portátil (*Standalone*) | Executa diretamente sem necessidade de instalação prévia. Ideal para pendrives, ambientes restritos ou compartilhamento rápido em rede. |
| **`Dev Manager Setup 1.0.0.exe`** | Instalador NSIS | Assistente tradicional do Windows com opções de escolha do diretório de instalação e criação de atalhos no Desktop e Menu Iniciar. |

---

### Opções Avançadas de Build:

Se desejar compilar apenas um dos formatos para economizar tempo de empacotamento:

* **Apenas Versão Portátil:**
  ```bash
  npm run build && npx electron-builder --win portable
  ```

* **Apenas Instalador NSIS:**
  ```bash
  npm run build && npx electron-builder --win nsis
  ```

---

### 🛡️ Elevação UAC Automática:
Ambos os executáveis incluem manifesto interno configurado com `requestedExecutionLevel: requireAdministrator`. Ao abrir o executável, o Windows solicitará permissão de Administrador automaticamente, o que garante permissão para:
* Iniciar e parar serviços do sistema operacional Windows (`sc.exe`, `net.exe`).
* Encerrar processos em segundo plano para liberação de portas e arquivos travados.
* Monitorar sockets e conexões TCP ativas via `netstat`.

---

## 📂 Estrutura de Diretórios do Projeto

```
dev-manager/
├── .mcp.json                   # Registro do servidor MCP para clientes como o Claude Code
├── electron-builder.json5      # Configuração de empacotamento Windows / NSIS
├── package.json                # Dependências e scripts do projeto
├── tailwind.config.js          # Configurações de cores, fontes e temas
├── tsconfig.json               # Configuração do compilador TypeScript
├── vite.config.ts              # Configuração do Vite + Plugins Electron
│
└── src/
    ├── main/                   # Processo Principal do Electron (Node.js backend)
    │   ├── index.ts            # Inicialização da janela principal e ciclo de vida
    │   ├── ipc/
    │   │   └── registerIpc.ts  # Registro de canais de comunicação IPC seguros
    │   ├── services/           # Regras de negócio e integração de sistema
    │   │   ├── ConfigService.ts    # Persistência de configurações e auto-detecção
    │   │   ├── GitAzureService.ts  # Leitura de repositórios Git e URLs do Azure
    │   │   ├── KarafService.ts     # Execução de comandos Karaf e console embutido
    │   │   ├── RoutinesService.ts  # Varredura e lançamento de rotinas
    │   │   └── WindowsService.ts   # Controle de serviços Windows e portas de rede
    │   └── utils/
    │       └── security.ts     # Validadores compartilhados (paths, comandos, identificadores)
    │
    ├── server/                 # API REST + WebSocket standalone (modo Web/Docker)
    │   ├── index.ts            # Express + ws, mesmos services do Electron, sem UI
    │   └── services/
    │       └── NetworkPortScanner.ts
    │
    ├── mcp/                    # Servidor MCP (Model Context Protocol) via stdio
    │   └── index.ts            # Terceiro consumidor dos services — tools para clientes MCP/IA
    │
    ├── preload/                # Script Preload (Ponte IPC segura com contextBridge)
    │   ├── index.ts
    │   └── index.d.ts          # Definição TypeScript global para window.electronAPI
    │
    ├── renderer/               # Processo de Renderização (Interface React)
    │   ├── index.html          # HTML mestre
    │   └── src/
    │       ├── App.tsx         # Componente raiz, abas e atalhos de teclado
    │       ├── main.tsx        # Ponto de entrada do React
    │       ├── index.css       # Estilos globais e variáveis de tema
    │       ├── components/     # Componentes reutilizáveis
    │       │   ├── Header.tsx          # Barra superior cockpit com status e tema
    │       │   ├── TerminalViewer.tsx  # Terminal com streaming de logs e prompt interativo
    │       │   └── ThemeToggle.tsx     # Alternador de modo escuro / claro / midnight
    │       ├── context/
    │       │   └── ThemeContext.tsx    # Contexto global de temas
    │       └── pages/          # Telas principais da aplicação
    │           ├── EnvironmentPage.tsx # Cockpit de preparação de ambiente e serviços
    │           ├── DatabasePage.tsx    # Studio SQL Multi-Vendor, histórico e snippets
    │           ├── ContainersPage.tsx  # Containers (Docker / Podman), métricas em tempo real e terminal
    │           ├── DeployPage.tsx      # Deployer Karaf OSGi, snapshots e árvore de bundles
    │           ├── GitAzurePage.tsx    # Hub de repositórios Git e Pull Requests
    │           ├── RoutinesPage.tsx    # Catálogo e lançador de rotinas
    │           ├── DocsPage.tsx        # Busca semântica RAG, preview e abertura em editor
    │           ├── SettingsPage.tsx    # Tela de configurações e portas monitoradas
    │           └── HelpPage.tsx        # Central de Ajuda, FAQ, atalhos e diagnóstico
    │
    └── shared/                 # Tipos e utilitários compartilhados entre main, server e mcp
        └── types.ts            # Interfaces TypeScript (AppSettings, ServiceStatus, etc.)
```

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Ctrl + K` / `Cmd + K` | Abre o **Quick Launcher (Spotlight)** com busca unificada e ações rápidas |
| `Alt + 1` | Navega para a aba **Ambiente Dev** |
| `Alt + 2` | Navega para a aba **Database Studio** |
| `Alt + 3` | Navega para a aba **Containers** |
| `Alt + 4` | Navega para a aba **Deployer Karaf OSGi** |
| `Alt + 5` | Navega para a aba **Git & Azure DevOps** |
| `Alt + 6` | Navega para a aba **Catálogo de Rotinas** |
| `Alt + 7` | Navega para a aba **Documentação & RAG** |
| `Alt + 8` | Navega para a aba **Configurações** |
| `Alt + 9` | Navega para a aba **Ajuda & Diagnóstico** |

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">
  Desenvolvido por <b>Wanderson Alves</b> • Cockpit integrado para produtividade e automação no desenvolvimento de software 🚀
</p>
