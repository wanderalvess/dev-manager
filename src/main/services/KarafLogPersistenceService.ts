import fs from 'fs';
import path from 'path';
import { getAppDataDir } from './ConfigService';

/** Tamanho máximo do arquivo de log antes de rotacionar para karaf-embedded.log.1 (mantém 1 rotação). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;
/** Quantidade de chunks brutos mantidos em memória para leitura rápida sem tocar o disco. */
const MEMORY_RING_SIZE = 500;

/**
 * Persiste em disco a saída do console Karaf embutido, que antes só existia como um array em
 * memória limitado a 500 chunks e limpo a cada leitura (src/mcp/index.ts) — se o processo
 * (Electron ou MCP) reiniciasse, o histórico se perdia. Escreve no mesmo arquivo independente
 * de quem iniciou o Karaf (app desktop ou servidor MCP), já que ambos usam getAppDataDir().
 */
export class KarafLogPersistenceService {
  private readonly logFilePath: string;
  private memoryRing: string[] = [];

  constructor() {
    const logsDir = path.join(getAppDataDir(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, 'karaf-embedded.log');
  }

  /** Registra um chunk de saída do Karaf embedded (chamado a cada evento stdout/stderr). */
  public append(chunk: string): void {
    this.memoryRing.push(chunk);
    if (this.memoryRing.length > MEMORY_RING_SIZE) this.memoryRing.shift();

    try {
      this.rotateIfNeeded();
      fs.appendFileSync(this.logFilePath, chunk);
    } catch (err) {
      console.warn('[KarafLogPersistenceService] Falha ao persistir log do Karaf embedded:', err);
    }
  }

  private rotateIfNeeded(): void {
    try {
      const stat = fs.statSync(this.logFilePath);
      if (stat.size >= MAX_FILE_BYTES) {
        const rotatedPath = `${this.logFilePath}.1`;
        fs.rmSync(rotatedPath, { force: true });
        fs.renameSync(this.logFilePath, rotatedPath);
      }
    } catch {
      // Primeira escrita: o arquivo ainda não existe. Nada a rotacionar.
    }
  }

  /**
   * Retorna os últimos `maxChars` caracteres do log persistido, sem apagar nada (diferente do
   * antigo buffer em memória que era drenado a cada leitura). Usa o ring buffer em memória
   * quando disponível (processo que gravou ainda vivo); cai para o arquivo em disco quando o
   * processo foi reiniciado e a memória está vazia.
   */
  public read(maxChars: number = 20000): string {
    const source = this.memoryRing.length > 0 ? this.memoryRing.join('') : this.readFileSafe();
    return source.length > maxChars ? source.slice(-maxChars) : source;
  }

  private readFileSafe(): string {
    try {
      return fs.readFileSync(this.logFilePath, 'utf-8');
    } catch {
      return '';
    }
  }

  /** Limpa o histórico persistido (memória e arquivos, incluindo a rotação). */
  public clear(): void {
    this.memoryRing = [];
    fs.rmSync(this.logFilePath, { force: true });
    fs.rmSync(`${this.logFilePath}.1`, { force: true });
  }
}
