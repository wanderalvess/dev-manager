import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AppSettings,
  BackupFileInfo,
  BackupHistoryEntry,
  DatabaseConnectionConfig,
  DockerContainerInfo,
  KarafBundleInfo,
  KarafFeatureInfo,
  PortStatus,
  ProcessStatus,
  RoutineItem,
  ServiceStatus,
  TraceDetails
} from '../src/shared/types';

const CONFIG_PATH = path.join(os.tmpdir(), 'hub-manager-config.json');

export const defaultSettings: AppSettings = {
  projectsDir: '/workspace/projects',
  karafDir: '/workspace/karaf',
  appDir: '/workspace/app',
  routinesDir: '/workspace/app/rotinas',
  idePath: 'idea64.exe',
  karafSshHost: '127.0.0.1',
  karafSshPort: 8101,
  karafSshUser: 'karaf',
  karafSshPass: 'karaf',
  disabledModules: [],
  favoriteRoutines: ['2075', '1322', '560', '801'],
  trackedServices: [
    { id: 'oracle-xe', name: 'OracleServiceXE', displayName: 'Oracle Database XE', description: 'Instância principal Oracle 19c/XE' },
    { id: 'oracle-tns', name: 'OracleXETNSListener', displayName: 'Oracle TNS Listener', description: 'Listener porta :1521' },
    { id: 'wta-karaf', name: 'WinThorKaraf', displayName: 'Apache Karaf OSGi (WTA)', description: 'Container OSGi :8889 / SSH :8101' },
    { id: 'wsh-service', name: 'WinThorWSH', displayName: 'WSH Integration Bus', description: 'Serviço de integração PDV/E-commerce' }
  ],
  trackedProcesses: [
    { id: 'java', name: 'java.exe', displayName: 'JVM / Karaf Runtime' },
    { id: 'idea', name: 'idea64.exe', displayName: 'IntelliJ IDEA' },
    { id: 'pc', name: 'winthor.exe', displayName: 'WinThor Desktop' }
  ],
  automationProfiles: [
    {
      id: 'default-dev',
      name: 'Pipeline Dev Karaf Padrão',
      description: 'Para serviços -> Limpa JVM -> Sobe Karaf em Debug :5005',
      steps: [
        { id: 's1', name: 'Parar serviços WinThor', type: 'stop-services', enabled: true },
        { id: 's2', name: 'Encerrar processos java.exe presos', type: 'kill-processes', enabled: true },
        { id: 's3', name: 'Aguardar liberação de sockets (2s)', type: 'wait', enabled: true },
        { id: 's4', name: 'Abrir IDE configurada', type: 'launch-ide', enabled: true },
        { id: 's5', name: 'Iniciar Apache Karaf em Debug (:5005)', type: 'start-server', enabled: true }
      ]
    },
    {
      id: 'quick-restart',
      name: 'Restart Rápido Karaf',
      description: 'Reinicia apenas o servidor OSGi mantendo banco ativo',
      steps: [
        { id: 'r1', name: 'Encerrar processos java.exe', type: 'kill-processes', enabled: true },
        { id: 'r2', name: 'Iniciar Apache Karaf Embedded', type: 'start-server', enabled: true }
      ]
    }
  ],
  activeProfileId: 'default-dev',
  deployProfiles: [
    {
      id: 'deploy-wta-core',
      name: 'Build & Deploy WTA Core',
      description: 'Compila módulos Maven e atualiza bundles no Karaf',
      steps: [
        { id: 'd1', name: 'mvn clean install -DskipTests', type: 'maven', target: 'wta-core', enabled: true },
        { id: 'd2', name: 'bundle:update wta-fiscal-service', type: 'karaf-install', target: 'wta-fiscal-service', enabled: true },
        { id: 'd3', name: 'Verificar resolução OSGi', type: 'karaf-command', command: 'bundle:diag', enabled: true }
      ]
    }
  ],
  databaseConnections: [
    {
      id: 'conn-oracle-dev',
      name: 'WinThor Dev (Oracle XE)',
      vendor: 'oracle',
      host: 'localhost',
      port: 1521,
      database: 'XEPDB1',
      serviceName: 'XEPDB1',
      user: 'WINTHOR',
      isProduction: false,
      color: '#f97316'
    },
    {
      id: 'conn-pg-telemetry',
      name: 'Observability & QA (PostgreSQL)',
      vendor: 'postgres',
      host: 'localhost',
      port: 5432,
      database: 'hub_qa',
      user: 'postgres',
      isProduction: false,
      color: '#3b82f6'
    },
    {
      id: 'conn-mysql-pdv',
      name: 'PDV Sync Cache (MySQL)',
      vendor: 'mysql',
      host: 'localhost',
      port: 3306,
      database: 'pdvsync',
      user: 'root',
      isProduction: false,
      color: '#10b981'
    }
  ],
  backupConfigs: [
    {
      id: 'bkp-oracle-daily',
      connectionId: 'conn-oracle-dev',
      destinationFolder: '/workspace/backups/oracle',
      cronExpression: '0 2 * * *',
      enabled: true,
      compress: true,
      maxAgeDays: 7,
      maxCount: 10
    }
  ],
  backupWebhooks: [
    {
      id: 'wh-discord',
      name: 'Canal DevOps Discord',
      provider: 'discord',
      url: 'https://discord.com/api/webhooks/example',
      enabled: false
    }
  ],
  llmProviders: [
    {
      id: 'ollama-local',
      name: 'Ollama Local (Qwen 2.5 Coder)',
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      baseUrl: 'http://localhost:11434'
    }
  ],
  docsFolders: ['docs', '.'],
  logSources: [
    { id: 'karaf-log', name: 'karaf.log (WTA OSGi)', filePath: '/workspace/karaf/data/log/karaf.log', encoding: 'utf8' },
    { id: 'wsh-log', name: 'wsh-integration.log', filePath: '/workspace/app/logs/wsh-integration.log', encoding: 'utf8' }
  ],
  apmPort: 4318,
  quickLinks: [
    { id: 'ql-wta', label: 'Portal WTA (:8889)', url: 'http://localhost:8889' },
    { id: 'ql-felix', label: 'Felix Web Console', url: 'http://localhost:8889/system/console' },
    { id: 'ql-swagger', label: 'Swagger APIs', url: 'http://localhost:8889/cxf/api-docs' }
  ]
};

export interface RuntimeState {
  settings: AppSettings;
  services: ServiceStatus[];
  processes: ProcessStatus[];
  ports: PortStatus[];
  karafRunning: boolean;
  karafLogs: string[];
  bundles: KarafBundleInfo[];
  features: KarafFeatureInfo[];
  containers: DockerContainerInfo[];
  sqlTables: Record<string, Array<Record<string, any>>>;
  sqlHistory: Array<{ id: string; connectionName: string; sql: string; executionTimeMs: number; rowCount: number; timestamp: string; success: boolean }>;
  backups: BackupFileInfo[];
  backupHistory: BackupHistoryEntry[];
  traces: TraceDetails[];
  routines: RoutineItem[];
  logLines: Array<{ id: string; timestamp: string; level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'; logger: string; message: string }>;
}

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return { ...defaultSettings, ...raw };
    }
  } catch {
    // Fallback to default settings
  }
  return structuredClone(defaultSettings);
}

export function saveSettingsToDisk(settings: AppSettings): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf8');
  } catch {
    // Ignore ephemeral write errors
  }
}

export const state: RuntimeState = {
  settings: loadSettings(),
  services: [
    { name: 'OracleServiceXE', displayName: 'Oracle Database XE', status: 'Running', pid: 4120, startType: 'Automatic', description: 'Banco Oracle 19c XE' },
    { name: 'OracleXETNSListener', displayName: 'Oracle TNS Listener', status: 'Running', pid: 4188, startType: 'Automatic', description: 'Listener porta 1521' },
    { name: 'WinThorKaraf', displayName: 'Apache Karaf OSGi (WTA)', status: 'Running', pid: 9312, startType: 'Manual', description: 'Servidor OSGi porta 8889' },
    { name: 'WinThorWSH', displayName: 'WSH Integration Bus', status: 'Stopped', startType: 'Manual', description: 'Integração síncrona/assíncrona' }
  ],
  processes: [
    { name: 'java.exe', displayName: 'JVM / Karaf (Debug :5005)', running: true, pid: 9312, memoryMb: 1240 },
    { name: 'idea64.exe', displayName: 'IntelliJ IDEA', running: true, pid: 6204, memoryMb: 1850 },
    { name: 'winthor.exe', displayName: 'WinThor Launcher', running: false }
  ],
  ports: [
    { port: 3000, label: 'Hub Manager Cockpit', inUse: true, pid: process.pid, processName: 'node' },
    { port: 8889, label: 'Portal Web WTA / CXF', inUse: true, pid: 9312, processName: 'java.exe' },
    { port: 8101, label: 'Karaf SSH Console', inUse: true, pid: 9312, processName: 'java.exe' },
    { port: 5005, label: 'Java Remote Debug (JDWP)', inUse: true, pid: 9312, processName: 'java.exe' },
    { port: 1521, label: 'Oracle TNS Listener', inUse: true, pid: 4188, processName: 'tnslsnr.exe' },
    { port: 5432, label: 'PostgreSQL', inUse: false },
    { port: 4318, label: 'OTLP HTTP Receiver (APM)', inUse: true, pid: process.pid, processName: 'node' }
  ],
  karafRunning: true,
  karafLogs: [
    '[INFO] Apache Karaf 4.4.3 inicializado em 3.84s (modo debug JDWP :5005)',
    '[INFO] BlueprintContainer | Bundle br.com.pcinformatica.wta.core/2.48.0 iniciado',
    '[INFO] CXF Endpoint publicado em http://0.0.0.0:8889/cxf/winthor/v1',
    '[INFO] Datasource WinThor Oracle Pool conectado (12 conexões ativas)'
  ],
  bundles: [
    { id: '142', state: 'Active', level: 80, version: '2.48.0', name: 'WTA Core Platform Services', symbolicName: 'br.com.pcinformatica.wta.core', location: 'mvn:br.com.pcinformatica.wta/wta-core/2.48.0' },
    { id: '143', state: 'Active', level: 80, version: '2.48.0', name: 'WTA Auth & JWT Security', symbolicName: 'br.com.pcinformatica.wta.auth', location: 'mvn:br.com.pcinformatica.wta/wta-auth/2.48.0' },
    { id: '144', state: 'Active', level: 80, version: '1.19.4', name: 'WTA Fiscal NFC-e / NF-e', symbolicName: 'br.com.pcinformatica.wta.fiscal', location: 'mvn:br.com.pcinformatica.wta/wta-fiscal/1.19.4' },
    { id: '145', state: 'Active', level: 80, version: '3.12.1', name: 'WTA Pedido & Faturamento API', symbolicName: 'br.com.pcinformatica.wta.pedido', location: 'mvn:br.com.pcinformatica.wta/wta-pedido/3.12.1' },
    { id: '146', state: 'Resolved', level: 80, version: '1.8.2', name: 'WSH Connector PDV Sync', symbolicName: 'br.com.pcinformatica.wsh.pdvsync', location: 'mvn:br.com.pcinformatica.wsh/pdvsync/1.8.2' },
    { id: '147', state: 'Waiting', level: 80, version: '2.1.0-SNAPSHOT', name: 'WTA Estoque & Inventário 801', symbolicName: 'br.com.pcinformatica.wta.estoque', location: 'mvn:br.com.pcinformatica.wta/wta-estoque/2.1.0-SNAPSHOT' }
  ],
  features: [
    { name: 'wta-core', version: '2.48.0', status: 'Started', repository: 'winthor-wta-2.48.0', description: 'Serviços base do WinThor Anywhere' },
    { name: 'wta-fiscal', version: '1.19.4', status: 'Started', repository: 'winthor-wta-2.48.0', description: 'Emissão e contingência NF-e / NFC-e' },
    { name: 'wta-pedido', version: '3.12.1', status: 'Started', repository: 'winthor-wta-2.48.0', description: 'APIs REST de pedido de venda e pré-venda' },
    { name: 'wsh-pdvsync', version: '1.8.2', status: 'Installed', repository: 'winthor-wsh-1.8.2', description: 'Sincronizador de carga e movimento PDV' },
    { name: 'cxf-jaxrs', version: '3.5.5', status: 'Started', repository: 'cxf-3.5.5', description: 'Apache CXF JAX-RS Runtime' }
  ],
  containers: [
    { id: 'c8a1f02d11a0', name: 'infr-oracle-xe-19c', image: 'container-registry.oracle.com/database/express:19c', state: 'running', status: 'Up 3 hours (healthy)', ports: ['1521:1521', '5500:5500'], group: 'WinThor Stack' },
    { id: 'd9b2e13c44b1', name: 'infr-wta-karaf', image: 'winthor/wta-karaf:2.48.0', state: 'running', status: 'Up 2 hours', ports: ['8889:8889', '8101:8101', '5005:5005'], group: 'WinThor Stack' },
    { id: 'e7c3d24a55c2', name: 'infr-wsh-bus', image: 'winthor/wsh-integration:1.8.2', state: 'running', status: 'Up 2 hours', ports: ['8085:8085'], group: 'WinThor Stack' },
    { id: 'f4d4a35b66d3', name: 'hub-otel-collector', image: 'otel/opentelemetry-collector:0.98.0', state: 'exited', status: 'Exited (0) 40 minutes ago', ports: ['4317:4317', '4318:4318'], group: 'Observabilidade' }
  ],
  sqlTables: {
    PCFILIAL: [
      { CODIGO: '1', RAZAOSOCIAL: 'MATRIZ DISTRIBUIDORA CENTRO OESTE LTDA', CGC: '01.234.567/0001-89', UF: 'GO', ATIVA: 'S' },
      { CODIGO: '2', RAZAOSOCIAL: 'FILIAL SUDESTE LOGISTICA S/A', CGC: '01.234.567/0002-60', UF: 'SP', ATIVA: 'S' },
      { CODIGO: '3', RAZAOSOCIAL: 'FILIAL NORDESTE ATACADO LTDA', CGC: '01.234.567/0003-41', UF: 'BA', ATIVA: 'S' }
    ],
    PCPRODUT: [
      { CODPROD: 1001, DESCRICAO: 'ARROZ TIPO 1 PCT 5KG', EMBALAGEM: 'FD 6X5KG', PVENDA: 158.9, ESTOQUE: 420, CODFORNEC: 201 },
      { CODPROD: 1002, DESCRICAO: 'FEIJAO CARIOCA 1KG', EMBALAGEM: 'FD 10X1KG', PVENDA: 79.5, ESTOQUE: 315, CODFORNEC: 201 },
      { CODPROD: 1003, DESCRICAO: 'OLEO DE SOJA PET 900ML', EMBALAGEM: 'CX 20X900ML', PVENDA: 134.0, ESTOQUE: 190, CODFORNEC: 204 },
      { CODPROD: 1004, DESCRICAO: 'CAFE TORRADO MOIDO 500G', EMBALAGEM: 'FD 10X500G', PVENDA: 189.0, ESTOQUE: 88, CODFORNEC: 209 }
    ],
    PCPEDC: [
      { NUMPED: 900145, CODCLI: 5012, CODFILIAL: '1', DATA: '2026-11-12', VLTOTAL: 4820.5, POSICAO: 'L', CODUSUR: 14 },
      { NUMPED: 900146, CODCLI: 5088, CODFILIAL: '1', DATA: '2026-11-12', VLTOTAL: 1290.0, POSICAO: 'P', CODUSUR: 14 },
      { NUMPED: 900147, CODCLI: 5110, CODFILIAL: '2', DATA: '2026-11-12', VLTOTAL: 9410.75, POSICAO: 'F', CODUSUR: 22 },
      { NUMPED: 900148, CODCLI: 5012, CODFILIAL: '1', DATA: '2026-11-12', VLTOTAL: 640.0, POSICAO: 'B', CODUSUR: 19 }
    ],
    PCCONSUM: [
      { CODFILIALPADRAO: '1', VERSAOWINTHOR: '32.0.14', AMBIENTENFE: 'HOMOLOGACAO', USAPDVSYNC: 'S', INTEGRACAOWSH: 'S' }
    ],
    PCUSUARI: [
      { CODUSUR: 14, NOME: 'CARLOS HENRIQUE (RCA)', CODFILIAL: '1', BLOQUEIO: 'N', DTULTACESSO: '2026-11-12 09:42:10' },
      { CODUSUR: 19, NOME: 'MARIANA COSTA (SUP)', CODFILIAL: '1', BLOQUEIO: 'N', DTULTACESSO: '2026-11-12 10:15:02' },
      { CODUSUR: 22, NOME: 'LUCAS ALMEIDA (RCA)', CODFILIAL: '2', BLOQUEIO: 'S', DTULTACESSO: '2026-11-11 17:30:00' }
    ]
  },
  sqlHistory: [
    {
      id: 'q1',
      connectionName: 'WinThor Dev (Oracle XE)',
      sql: 'SELECT NUMPED, CODCLI, CODFILIAL, VLTOTAL, POSICAO FROM PCPEDC ORDER BY NUMPED DESC',
      executionTimeMs: 14,
      rowCount: 4,
      timestamp: new Date(Date.now() - 3600_000).toISOString(),
      success: true
    },
    {
      id: 'q2',
      connectionName: 'WinThor Dev (Oracle XE)',
      sql: 'SELECT CODPROD, DESCRICAO, PVENDA, ESTOQUE FROM PCPRODUT WHERE ESTOQUE < 200',
      executionTimeMs: 9,
      rowCount: 2,
      timestamp: new Date(Date.now() - 1800_000).toISOString(),
      success: true
    }
  ],
  backups: [
    {
      fileName: 'winthor_dev_20261112_020000.dmp',
      filePath: '/workspace/backups/oracle/winthor_dev_20261112_020000.dmp',
      sizeBytes: 184_520_912,
      createdAt: '2026-11-12T02:00:18Z',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    },
    {
      fileName: 'winthor_dev_20261111_020000.dmp',
      filePath: '/workspace/backups/oracle/winthor_dev_20261111_020000.dmp',
      sizeBytes: 181_904_384,
      createdAt: '2026-11-11T02:00:21Z',
      sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
    }
  ],
  backupHistory: [
    {
      id: 'bh-1',
      connectionId: 'conn-oracle-dev',
      connectionName: 'WinThor Dev (Oracle XE)',
      status: 'success',
      startedAt: '2026-11-12T02:00:00Z',
      durationMs: 18420,
      fileName: 'winthor_dev_20261112_020000.dmp',
      sizeBytes: 184_520_912,
      output: 'Export: Release 19.0.0.0.0 - Production\nStarting "WINTHOR"."SYS_EXPORT_SCHEMA_01"\n. . exported "WINTHOR"."PCPEDC" 12.4 MB 42100 rows\nJob "WINTHOR"."SYS_EXPORT_SCHEMA_01" successfully completed'
    }
  ],
  traces: [
    {
      traceId: '4f8b92a10c7e41d2a8b19c002e441101',
      rootService: 'wta-pedido',
      rootOperation: 'POST /cxf/winthor/v1/pedidos',
      httpMethod: 'POST',
      httpStatus: 201,
      durationMs: 184,
      spanCount: 4,
      errorCount: 0,
      timestamp: new Date(Date.now() - 120_000).toISOString(),
      spans: [
        { spanId: 'sp1', name: 'POST /cxf/winthor/v1/pedidos', service: 'wta-pedido', kind: 'HTTP', startOffsetMs: 0, durationMs: 184, status: 'ok', attributes: { 'http.status_code': 201, 'http.route': '/cxf/winthor/v1/pedidos' } },
        { spanId: 'sp2', parentSpanId: 'sp1', name: 'PedidoService.validarCredito', service: 'wta-pedido', kind: 'JAVA', startOffsetMs: 12, durationMs: 42, status: 'ok', attributes: { 'codcli': 5012 } },
        { spanId: 'sp3', parentSpanId: 'sp1', name: 'SELECT PCFILIAL, PCCONSUM', service: 'oracle-xe', kind: 'JDBC', startOffsetMs: 56, durationMs: 38, status: 'ok', attributes: { 'db.system': 'oracle', 'db.statement': 'SELECT * FROM PCCONSUM WHERE CODFILIALPADRAO = :1' } },
        { spanId: 'sp4', parentSpanId: 'sp1', name: 'INSERT INTO PCPEDC', service: 'oracle-xe', kind: 'JDBC', startOffsetMs: 98, durationMs: 79, status: 'ok', attributes: { 'db.system': 'oracle', 'db.statement': 'INSERT INTO PCPEDC (...) VALUES (...)' } }
      ]
    },
    {
      traceId: '8a1c30d45f2e4991b33e710099112202',
      rootService: 'wta-fiscal',
      rootOperation: 'GET /cxf/winthor/v1/nfce/status',
      httpMethod: 'GET',
      httpStatus: 500,
      durationMs: 642,
      spanCount: 3,
      errorCount: 1,
      timestamp: new Date(Date.now() - 45_000).toISOString(),
      spans: [
        { spanId: 'sp10', name: 'GET /cxf/winthor/v1/nfce/status', service: 'wta-fiscal', kind: 'HTTP', startOffsetMs: 0, durationMs: 642, status: 'error', attributes: { 'http.status_code': 500 } },
        { spanId: 'sp11', parentSpanId: 'sp10', name: 'SefazClient.consultarStatus', service: 'wta-fiscal', kind: 'JAVA', startOffsetMs: 18, durationMs: 610, status: 'error', attributes: { 'error.type': 'SocketTimeoutException', 'sefaz.uf': 'GO' } },
        { spanId: 'sp12', parentSpanId: 'sp10', name: 'SELECT * FROM PCFILIAL', service: 'oracle-xe', kind: 'JDBC', startOffsetMs: 4, durationMs: 11, status: 'ok', attributes: { 'db.system': 'oracle' } }
      ]
    }
  ],
  routines: [
    { id: '2075', code: '2075', name: 'Frente de Caixa / PDV', fullPath: 'C:\\WinThor\\Prod\\PC2075.EXE', category: 'Vendas & PDV', version: '32.0.14.8', isFavorite: true },
    { id: '1322', code: '1322', name: 'Digitação de Pedido de Venda', fullPath: 'C:\\WinThor\\Prod\\PC1322.EXE', category: 'Comercial', version: '32.0.14.2', isFavorite: true },
    { id: '560', code: '560', name: 'Atualizar Banco de Dados', fullPath: 'C:\\WinThor\\Prod\\PC560.EXE', category: 'Sistema & Banco', version: '32.0.14.11', isFavorite: true },
    { id: '801', code: '801', name: 'Instalação e Atualização de Serviços Web', fullPath: 'C:\\WinThor\\Prod\\PC801.EXE', category: 'Infra & OSGi', version: '32.0.14.5', isFavorite: true },
    { id: '1452', code: '1452', name: 'Emitir Documento Fiscal Eletrônico', fullPath: 'C:\\WinThor\\Prod\\PC1452.EXE', category: 'Fiscal', version: '32.0.14.9', isFavorite: false },
    { id: '3314', code: '3314', name: 'Monitoramento de Integração WSH', fullPath: 'C:\\WinThor\\Prod\\PC3314.EXE', category: 'Integração', version: '32.0.14.3', isFavorite: false }
  ],
  logLines: [
    { id: 'l1', timestamp: '11:28:10.124', level: 'INFO', logger: 'br.com.pcinformatica.wta.core.Bootstrap', message: 'Karaf OSGi container pronto na porta 8889 (profile: dev)' },
    { id: 'l2', timestamp: '11:28:12.402', level: 'INFO', logger: 'org.apache.cxf.endpoint.ServerImpl', message: 'Setting the server publish address to be /winthor/v1' },
    { id: 'l3', timestamp: '11:29:04.881', level: 'WARN', logger: 'com.zaxxer.hikari.pool.HikariPool', message: 'OraclePool - Connection validation took 412ms (threshold 250ms)' },
    { id: 'l4', timestamp: '11:29:45.019', level: 'ERROR', logger: 'br.com.pcinformatica.wta.fiscal.SefazClient', message: 'java.net.SocketTimeoutException: Read timed out ao consultar SEFAZ-GO homologação (610ms)' },
    { id: 'l5', timestamp: '11:30:01.330', level: 'INFO', logger: 'br.com.pcinformatica.wsh.pdvsync.SyncJob', message: 'Carga incremental PDV concluída: 14 produtos, 0 rejeições' }
  ]
};
