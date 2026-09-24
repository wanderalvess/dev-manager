# =========================================================
# Multi-stage Dockerfile para Dev Manager
# =========================================================

# --- Estágio 1: Build do Frontend React + Vite ---
FROM node:22-alpine AS builder

WORKDIR /app

# Instala dependências
COPY package.json package-lock.json ./
RUN npm ci

# Copia o código-fonte e compila
COPY . .
RUN npm run build

# --- Estágio 2: Runtime da Aplicação ---
FROM node:22-alpine AS runner

WORKDIR /app

# Instala ferramentas essenciais (Git para repositórios, bash e utilitários de rede)
RUN apk add --no-cache git bash curl net-tools tzdata

# Define variáveis de ambiente padrão
ENV NODE_ENV=production \
    DOCKER_CONTAINER=true \
    PORT=3000 \
    HOST=0.0.0.0 \
    CONFIG_DIR=/workspace/config \
    PROJECTS_DIR=/workspace/projects \
    KARAF_DIR=/workspace/karaf \
    APP_DIR=/workspace/app

# Cria diretórios de workspace para montagem de volumes
RUN mkdir -p /workspace/config /workspace/projects /workspace/karaf /workspace/app

# Copia dependências e build do estágio anterior
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm install -g tsx

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src
COPY --from=builder /app/docs ./docs
COPY --from=builder /app/CHANGELOG.md ./CHANGELOG.md
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Expõe a porta do Web Cockpit
EXPOSE 3000

# Healthcheck para monitorar o status do contêiner
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/system/info || exit 1

# Inicializa o servidor Web e WebSocket
CMD ["npm", "run", "start"]
