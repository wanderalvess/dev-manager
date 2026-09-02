# Dev Manager 🚀

> **Cockpit e Painel de Automação Desktop Integrado para Desenvolvedores e Apache Karaf OSGi.**

Desenvolvido em **Electron + React + TypeScript + Tailwind CSS**, o **Dev Manager** centraliza e automatiza todas as tarefas rotineiras do dia a dia de desenvolvimento: liberação de portas e serviços conflitantes em segundo plano, inicialização de IDEs, disparo do contêiner OSGi em modo debug, deploy automatizado de features Maven no Karaf, gerenciamento de repositórios Git / Azure DevOps, catálogo de rotinas e central completa de ajuda e diagnósticos.

---

## 📸 Visão Geral dos Recursos

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                      DEV MANAGER                                       │
├───────────────┬──────────────────┬─────────────────┬──────────────┬──────────┬─────────┤
│ ⚡ Ambiente   │ 📦 Karaf Deploy  │ 🔀 Git & Azure  │ 📑 Rotinas   │ ⚙️ Config│ ❓ Ajuda │
├───────────────┴──────────────────┴─────────────────┴──────────────┴──────────┴─────────┤
│ • Pipeline 1-Clique (Stop Srv -> Kill -> Launch IDE -> Servidor Debug)                 │
│ • Console Integrado com Terminal Interativo OSGi (karaf@root)                         │
│ • Monitor em Tempo Real de Portas (:8889, :8101, :5005, :1521, etc.) com PID          │
│ • Auto-parser de pom.xml / deploy-local.bat para Deploy de Features Maven              │
│ • Gestão Git (Branch, Diff, Fetch, Pull, Stash) e Criação de Pull Requests             │
│ • Catálogo de Rotinas (.EXE e .PC) com Busca e Favoritos                              │
│ • Central de Ajuda Completa, FAQ com Busca, Atalhos e Diagnóstico do Sistema          │
└────────────────────────────────────────────────────────────────────────────────────────┘
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
* **Notificações Nativas do Windows:** Alertas de conclusão de pipeline diretamente na bandeja do sistema operacional.

---

### 2. 📦 Deployer OSGi Apache Karaf (`client.bat`)
* **Auto-Detecção Inteligente via `pom.xml` e `deploy-local.bat`:**
  * Lê automaticamente `groupId`, `artifactId`, `version` e módulos ao selecionar qualquer projeto Git.
  * Sugere automaticamente os comandos:
    * `feature:repo-add mvn:<groupId>/<serviceModule>/<version>/xml/features`
    * `feature:install -r -u <featureName>/<version>`
* **Execução Assíncrona do `client.bat`:**
  * Streaming da saída do console Karaf com tratamento de saída e erros.
  * Credenciais de acesso configuráveis e salvas com segurança.
* **Diagnósticos Rápidos com 1 Clique:**
  * `feature:list -i`: Lista de features instaladas.
  * `bundle:list -s`: Lista de bundles ativos.
  * `log:display -n 50`: Visualização das últimas 50 linhas de log.
  * `log:clear`: Limpeza do buffer de logs do contêiner.

---

### 3. 🔀 Git & Azure DevOps Hub
* **Varredura Automática de Repositórios:**
  * Localização automática de todos os projetos clonados na pasta de repositórios.
  * Detecção instantânea da branch atual ativa e contador de arquivos modificados (*uncommitted changes*).
* **Ações Rápidas de Sincronização:**
  * Botões diretos para `git fetch`, `git pull`, `git stash` e `git stash pop` sem precisar abrir o terminal.
* **Gerador de Pull Request no Azure DevOps:**
  * Reconhece organizações, projetos e repositórios hospedados no Azure DevOps (HTTPS e SSH).
  * Monta a URL de criação de PR comparando a branch de trabalho com a branch de destino (`develop`, `master`, etc.) e abre diretamente no navegador.
* **Acesso Rápido a Pipelines CI/CD:**
  * Link direto para a página de builds e pipelines do repositório no Azure DevOps.

---

### 4. 📑 Catálogo & Lançador de Rotinas
* **Varredura Completa do Diretório Configurado:**
  * Reconhece executáveis (`.EXE`) e rotinas compiladas (`.PC`) organizadas por módulos.
* **Filtros e Busca Instantânea:**
  * Busca por código da rotina ou nome e filtro por módulo funcional.
* **Sistema de Favoritos:**
  * Marcação de rotinas favoritas com estrelas fixadas no topo e salvas no `%APPDATA%`.
* **Execução Direta:**
  * Disparo com 1 clique em segundo plano desvinculado.

---

### 5. ⚙️ Configurações & Personalização
* **Detecção e Configuração Flexível de Diretórios:**
  * Permite ao usuário configurar caminhos personalizados para diretórios de projetos, executáveis e servidor Karaf.
* **Validação Visual de Caminhos em Tempo Real:**
  * Indicadores dinâmicos de existência de diretórios e executáveis no disco com seletores visuais do Windows Explorer.
* **Gerenciador de Portas de Rede Monitoradas:**
  * Adição, remoção e alternância de portas monitoradas, com atalhos de adição rápida (`:8889`, `:8181`, `:8101`, `:5005`).
* **Suporte a Temas:**
  * Alternador entre **Dark Mode**, **Light Mode** e variante **Midnight**.
* **Atalhos de Teclado Globais:**
  * `Alt+1`: Ambiente Dev
  * `Alt+2`: Deploy OSGi Karaf
  * `Alt+3`: Git & Azure DevOps
  * `Alt+4`: Catálogo de Rotinas
  * `Alt+5`: Configurações
  * `Alt+6`: Ajuda & Sobre

---

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Shell Desktop** | [Electron](https://www.electronjs.org/) (v29), Node.js API (`child_process`, `fs`, `os`, `path`) |
| **Frontend** | [React](https://react.dev/) (v18), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/) |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) |
| **Empacotamento** | [Electron Builder](https://www.electron.build/) (Instalador NSIS e Portátil com elevação de Admin) |
| **Integrações** | Windows Services (`sc`, `net stop/start`, `netstat`), Git CLI, Apache Karaf Client, Azure DevOps |

---

## 📋 Pré-requisitos

* **Sistema Operacional:** Windows 10 ou Windows 11 (64-bit).
* **Node.js:** Versão 18.x ou 20.x ou superior.
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
    │   └── services/           # Regras de negócio e integração de sistema
    │       ├── ConfigService.ts    # Persistência de configurações e auto-detecção
    │       ├── GitAzureService.ts  # Leitura de repositórios Git e URLs do Azure
    │       ├── KarafService.ts     # Execução de comandos Karaf e console embutido
    │       ├── RoutinesService.ts  # Varredura e lançamento de rotinas
    │       └── WindowsService.ts   # Controle de serviços Windows e portas de rede
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
    │           ├── KarafDeployPage.tsx # Deploy e diagnósticos de features Karaf OSGi
    │           ├── GitAzurePage.tsx    # Hub de repositórios Git e Pull Requests
    │           ├── RoutinesPage.tsx    # Catálogo e lançador de rotinas
    │           └── SettingsPage.tsx    # Tela de configurações e portas monitoradas
    │
    └── shared/                 # Tipos e utilitários compartilhados entre main e renderer
        └── types.ts            # Interfaces TypeScript (AppSettings, ServiceStatus, etc.)
```

---

## ⌨️ Atalhos de Teclado

| Atalho | Ação |
| :--- | :--- |
| `Alt + 1` | Navega para a aba **Ambiente Dev** |
| `Alt + 2` | Navega para a aba **Deploy OSGi Karaf** |
| `Alt + 3` | Navega para a aba **Git & Azure DevOps** |
| `Alt + 4` | Navega para a aba **Catálogo de Rotinas** |
| `Alt + 5` | Navega para a aba **Configurações** |
| `Alt + 6` | Navega para a aba **Ajuda & Sobre** |

---

## 📄 Licença

Este projeto é distribuído sob a licença **MIT**. Veja o arquivo `LICENSE` para mais detalhes.

---

<p align="center">
  Desenvolvido por <b>Wanderson Alves</b> • Cockpit integrado para produtividade e automação no desenvolvimento de software 🚀
</p>
