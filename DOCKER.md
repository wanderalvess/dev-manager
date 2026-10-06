# Guia de Execução no Docker 🐳 - Hub Manager

O **Hub Manager** suporta execução nativa em contêineres **Docker**, disponibilizando um **Web Cockpit completo** acessível via navegador web (`http://localhost:3000`), sem necessidade de instalar Electron na máquina de execução.

---

## 🚀 Como Iniciar em 1 Minuto com Docker Compose

### 1. Preparar o arquivo de ambiente
Copie o modelo de variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o `.env` para apontar para a sua pasta de repositórios e Karaf local:
```ini
PORT=3000
HOST_PROJECTS_DIR=C:/Projetos
HOST_KARAF_DIR=C:/karaf
HOST_APP_DIR=C:/app
```

### 2. Iniciar a aplicação
```bash
docker compose up -d
```

### 3. Acessar o Web Cockpit
Abra seu navegador em:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📦 Perfis de Execução no Docker Compose

O `docker-compose.yml` inclui perfis modulares para diferentes cenários:

### 🔹 Modo 1: Apenas o Hub Manager (Padrão)
Inicia o painel de gerenciamento Web conectado às suas pastas locais montadas:
```bash
docker compose up -d
```

### 🔹 Modo 2: Full-Stack (Hub Manager + Karaf OSGi + Oracle Database)
Inicia o painel Web junto com contêineres dedicados do Apache Karaf e Oracle Database Free:
```bash
docker compose --profile full-stack up -d
```

---

## 🛠️ Comandos Úteis do Docker Compose

| Ação | Comando |
| :--- | :--- |
| **Iniciar em segundo plano** | `docker compose up -d` |
| **Parar e remover contêineres** | `docker compose down` |
| **Visualizar logs em tempo real** | `docker compose logs -f app` |
| **Recompilar imagem após alterações** | `docker compose build --no-cache` |
| **Status dos contêineres** | `docker compose ps` |
| **Reiniciar o serviço** | `docker compose restart app` |

---

## 🏗️ Execução Direta via Docker CLI (Sem Compose)

### 1. Construir a Imagem
```bash
docker build -t dev-manager:latest .
```

### 2. Executar o Contêiner
```bash
docker run -d \
  --name dev-manager \
  -p 3000:3000 \
  -v C:/Projetos:/workspace/projects \
  -v dev-config:/workspace/config \
  dev-manager:latest
```

---

## 🔄 Como Funciona a Arquitetura Dual-Mode

* **No Windows (Electron Desktop):** A aplicação executa como programa desktop nativo `.exe`, usando IPC com permissões administrativas para parar e iniciar serviços do Windows.
* **No Docker / Navegador:** A interface React é servida por um servidor Express integrado, comunicando-se via REST APIs e WebSocket bidirecional em tempo real (`/ws`) para streaming de logs do Karaf, diagnósticos e automações.
* **Mapeamento de Repositórios:** Seus repositórios Git permanecem no seu computador Windows/Linux e são montados dentro do contêiner em `/workspace/projects`, permitindo criar PRs no Azure DevOps, verificar branches, diffs e executar git pull/fetch diretamente pela web!

---

## ⚙️ Variáveis de Ambiente Suportadas

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta HTTP exposta pelo Web Cockpit |
| `HOST` | `0.0.0.0` | Endereço de escuta do servidor |
| `PROJECTS_DIR` | `/workspace/projects` | Diretório interno onde ficam os repositórios Git |
| `KARAF_DIR` | `/workspace/karaf` | Diretório interno da instalação do Karaf |
| `APP_DIR` | `/workspace/app` | Diretório interno das rotinas / Prod |
| `CONFIG_DIR` | `/workspace/config` | Diretório interno para persistência de preferências |
| `KARAF_USER` | `karaf` | Usuário para login no `client` Karaf |
| `KARAF_PASS` | `karaf` | Senha para login no `client` Karaf |
| `TARGET_PR_BRANCH` | `develop` | Branch de destino padrão nos PRs do Azure DevOps |
| `API_KEY` | *(vazio)* | Chave exigida no header `x-api-key` em toda rota `/api/*`. **Recomendado sempre que o painel for acessado além de `localhost`** — sem ela, qualquer pessoa na rede controla serviços do Windows, mata processos e dispara deploys sem autenticação. |
| `APM_OTLP_PORT` | *(porta configurada no app, ou `4318`)* | Porta do receptor OpenTelemetry (OTLP/HTTP) dedicado do APM |
| `APM_OTLP_HOST` | *(o mesmo de `HOST`)* | Endereço de escuta do receptor OTLP dedicado |

---

## ❓ Perguntas Frequentes (FAQ)

### Como acessar o painel de outro computador na rede local?
O servidor escuta em `0.0.0.0`, permitindo que outros membros do time acessem pelo IP da sua máquina (ex: `http://192.168.1.50:3000`).

### Várias pessoas podem usar essa mesma instância ao mesmo tempo?
Tecnicamente sim, mas **não é esse o modelo pensado para o Hub Manager**. Cada instância é *single-tenant*: existe um único arquivo de configurações (`CONFIG_DIR/config.json`) compartilhado por qualquer um que acesse aquela URL — conexões de banco, credenciais do Karaf, perfis de backup e chaves de LLM incluídos. Não há login nem separação por usuário; a `API_KEY` autentica o acesso à instância como um todo, não identifica quem está usando. Se duas pessoas editarem configurações ao mesmo tempo, uma sobrescreve a outra.

O modelo pretendido é **uma instância por pessoa** (rodando localmente ou no seu próprio container). Para padronizar a configuração entre a equipe sem compartilhar credenciais, use **Configurações → Exportar** (com a opção de sanitizar senhas) e cada pessoa importa o arquivo na sua própria instância.

### Como enviar traces OpenTelemetry para a tela de APM no Docker?
O próprio servidor web aceita exportações OTLP/HTTP (JSON ou Protobuf, com ou sem gzip) em `/v1/traces`, na mesma porta do painel — basta apontar o exportador para a base do servidor, sem porta extra:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://<ip-do-host>:3000
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
```

O receptor dedicado (`APM_OTLP_PORT`, padrão `4318`) também sobe dentro do contêiner, mas o `docker-compose.yml` não publica essa porta de propósito: é comum ela já estar ocupada no host por outro coletor (OTel Collector, Jaeger, SigNoz). Se quiser usá-la, publique uma porta livre do host apontando para ela (ex.: `"4418:4318"`).

A rota `/v1/traces` fica fora de `/api/*` e por isso não exige a `API_KEY` (exportadores OTel raramente enviam cabeçalhos customizados); qualquer máquina que alcance o painel pode enviar spans. A API local de consulta usada pelas tools `apm_*` do MCP só atende conexões de dentro do próprio contêiner.

### Os meus arquivos Git são alterados no host?
Sim! A montagem de volumes é bidirecional. Comandos como `git pull` ou `git stash` executados no painel Web refletem imediatamente na sua pasta local.
