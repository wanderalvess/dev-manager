import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { EVIDENCE_KEYS, escapeSendKeys, type EvidenceAction } from '../../../shared/evidenceTypes';

// Automação de mouse/teclado no Windows sem módulo nativo: um PowerShell com P/Invoke em user32.
// O gravador só lê o ESTADO DOS BOTÕES DO MOUSE (nunca o teclado), então nada digitado é capturado.

const TYPES = `
using System;
using System.Runtime.InteropServices;
public struct PT { public int X; public int Y; }
public static class W {
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int k);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out PT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
}`;

const WATCH_SCRIPT = `
Add-Type -TypeDefinition @'${TYPES}
'@
[W]::SetProcessDPIAware() | Out-Null
$was = @{ 1 = $false; 2 = $false }
while ($true) {
  foreach ($b in 1, 2) {
    $down = ([W]::GetAsyncKeyState($b) -band 0x8000) -ne 0
    if ($down -and -not $was[$b]) {
      $p = New-Object PT
      [W]::GetCursorPos([ref]$p) | Out-Null
      [Console]::Out.WriteLine("click $b $($p.X) $($p.Y)")
      [Console]::Out.Flush()
    }
    $was[$b] = $down
  }
  Start-Sleep -Milliseconds 15
}`;

const REPLAY_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @'${TYPES}
'@
[W]::SetProcessDPIAware() | Out-Null
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
[Console]::Out.WriteLine('ready'); [Console]::Out.Flush()
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    $a = $line | ConvertFrom-Json
    if ($a.t -eq 'click') {
      [W]::SetCursorPos([int]$a.x, [int]$a.y) | Out-Null
      Start-Sleep -Milliseconds 80
      if ($a.b -eq 'right') { $d = 0x8; $u = 0x10 } else { $d = 0x2; $u = 0x4 }
      [W]::mouse_event($d, 0, 0, 0, [UIntPtr]::Zero)
      Start-Sleep -Milliseconds 40
      [W]::mouse_event($u, 0, 0, 0, [UIntPtr]::Zero)
    } elseif ($a.t -eq 'keys') {
      [System.Windows.Forms.SendKeys]::SendWait([string]$a.keys)
    }
    [Console]::Out.WriteLine('ok')
  } catch {
    [Console]::Out.WriteLine('err ' + $_.Exception.Message)
  }
  [Console]::Out.Flush()
}`;

const psArgs = (script: string): string[] => [
  '-NoProfile',
  '-NonInteractive',
  '-ExecutionPolicy',
  'Bypass',
  '-EncodedCommand',
  Buffer.from(script, 'utf16le').toString('base64')
];

export interface RawClick {
  button: 'left' | 'right';
  x: number;
  y: number;
}

/** Interpreta uma linha "click <botão> <x> <y>" do gravador; devolve null para qualquer outra coisa. */
export function parseClickLine(line: string): RawClick | null {
  const m = /^click (\d) (-?\d+) (-?\d+)\s*$/.exec(line);
  if (!m) return null;
  const x = Number(m[2]);
  const y = Number(m[3]);
  if (x < 0 || y < 0) return null;
  return { button: m[1] === '2' ? 'right' : 'left', x, y };
}

const isWindows = process.platform === 'win32';

/** Observa cliques do mouse em qualquer janela. `stop` encerra o processo. */
export function startClickWatcher(onClick: (click: RawClick) => void, onExit: (reason: string) => void): { stop: () => void } {
  if (!isWindows) throw new Error('A gravação de cliques só está disponível no Windows.');
  const child = spawn('powershell.exe', psArgs(WATCH_SCRIPT), { windowsHide: true });
  let buffer = '';
  let stopped = false;
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const click = parseClickLine(line);
      if (click) onClick(click);
    }
  });
  child.on('error', (err) => !stopped && onExit(err.message));
  child.on('exit', (code) => !stopped && onExit(`O observador de cliques terminou (código ${code}).`));
  return {
    stop: () => {
      stopped = true;
      child.kill();
    }
  };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Reproduz ações de roteiro (clique, texto, tecla, espera) no desktop. */
export class InputReplayer {
  private child: ChildProcessWithoutNullStreams | null = null;
  private waiting: ((line: string) => void) | null = null;
  private buffer = '';

  async start(): Promise<void> {
    if (!isWindows) throw new Error('A reexecução só está disponível no Windows.');
    const child = spawn('powershell.exe', psArgs(REPLAY_SCRIPT), { windowsHide: true });
    this.child = child;
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      this.buffer += chunk;
      const lines = this.buffer.split(/\r?\n/);
      this.buffer = lines.pop() ?? '';
      for (const line of lines) this.waiting?.(line);
    });
    child.on('exit', () => this.waiting?.('err O automatizador foi encerrado.'));
    const ready = await this.nextLine(15000);
    if (ready !== 'ready') throw new Error('Não consegui iniciar o automatizador de mouse/teclado.');
  }

  private nextLine(timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.waiting = null;
        reject(new Error('O automatizador não respondeu.'));
      }, timeoutMs);
      this.waiting = (line) => {
        clearTimeout(timer);
        this.waiting = null;
        resolve(line);
      };
    });
  }

  private async send(payload: object): Promise<void> {
    if (!this.child) throw new Error('Automatizador não iniciado.');
    const answer = this.nextLine(20000);
    this.child.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8');
    const line = await answer;
    if (line.startsWith('err')) throw new Error(line.slice(4) || 'Falha ao executar a ação.');
  }

  async perform(action: EvidenceAction): Promise<void> {
    switch (action.type) {
      case 'click':
        return this.send({ t: 'click', x: action.x ?? 0, y: action.y ?? 0, b: action.button ?? 'left' });
      case 'type':
        return this.send({ t: 'keys', keys: escapeSendKeys(action.text ?? '') });
      case 'key':
        return this.send({ t: 'keys', keys: EVIDENCE_KEYS[action.key ?? ''] ?? '' });
      default:
        return sleep(action.ms ?? 1000);
    }
  }

  close(): void {
    this.child?.stdin.end();
    this.child?.kill();
    this.child = null;
  }
}
