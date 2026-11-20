import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { EVIDENCE_KEYS, escapeSendKeys, type EvidenceAction, type EvidenceWindowRef } from '../../../shared/evidenceTypes';

// Automação de mouse/teclado no Windows sem módulo nativo: um PowerShell com P/Invoke em user32.
// O gravador só lê o ESTADO DOS BOTÕES DO MOUSE (nunca o teclado), então nada digitado é capturado.

// Atenção: este texto é um template literal do JS; para o C# receber "\t" é preciso escrever "\\t".
const TYPES = `
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
public struct PT { public int X; public int Y; }
public struct RC { public int L; public int T; public int R; public int B; }
public delegate bool EnumProc(IntPtr h, IntPtr l);
public static class W {
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int k);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out PT p);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern void mouse_event(uint f, uint dx, uint dy, uint d, UIntPtr e);
  [DllImport("user32.dll")] public static extern IntPtr WindowFromPoint(PT p);
  [DllImport("user32.dll")] public static extern IntPtr GetAncestor(IntPtr h, uint f);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RC r);
  [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr h, out int pid);
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);

  public static string Title(IntPtr h) { StringBuilder sb = new StringBuilder(256); GetWindowText(h, sb, 256); return sb.ToString().Replace("\\t", " "); }
  public static string Proc(IntPtr h) {
    int pid; GetWindowThreadProcessId(h, out pid);
    try { return Process.GetProcessById(pid).ProcessName; } catch { return ""; }
  }
  // Janela de topo sob o ponto: "processo<TAB>titulo<TAB>esquerda<TAB>topo" ou vazio.
  public static string Describe(int x, int y) {
    PT p = new PT(); p.X = x; p.Y = y;
    IntPtr h = GetAncestor(WindowFromPoint(p), 2);
    if (h == IntPtr.Zero) return "";
    RC r; GetWindowRect(h, out r);
    return Proc(h) + "\\t" + Title(h) + "\\t" + r.L + "\\t" + r.T;
  }
  // Canto da janela visível do processo (prefere o mesmo título): "esquerda<TAB>topo" ou vazio.
  public static string Locate(string proc, string title) {
    IntPtr best = IntPtr.Zero; IntPtr any = IntPtr.Zero;
    EnumWindows(delegate(IntPtr h, IntPtr l) {
      if (!IsWindowVisible(h) || IsIconic(h)) return true;
      if (!string.Equals(Proc(h), proc, StringComparison.OrdinalIgnoreCase)) return true;
      if (Title(h).Length == 0) return true;
      if (any == IntPtr.Zero) any = h;
      if (best == IntPtr.Zero && Title(h) == title) best = h;
      return true;
    }, IntPtr.Zero);
    IntPtr w = best != IntPtr.Zero ? best : any;
    if (w == IntPtr.Zero) return "";
    RC r; GetWindowRect(w, out r);
    return r.L + "\\t" + r.T;
  }
}`;

const WATCH_SCRIPT = `
Add-Type -TypeDefinition @'${TYPES}
'@
[W]::SetProcessDPIAware() | Out-Null
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$was = @{ 1 = $false; 2 = $false }
while ($true) {
  foreach ($b in 1, 2) {
    $down = ([W]::GetAsyncKeyState($b) -band 0x8000) -ne 0
    if ($down -and -not $was[$b]) {
      $p = New-Object PT
      [W]::GetCursorPos([ref]$p) | Out-Null
      $o = @{ b = $b; x = $p.X; y = $p.Y }
      $d = [W]::Describe($p.X, $p.Y)
      if ($d) {
        $f = $d.Split([char]9)
        $o.p = $f[0]; $o.ti = $f[1]; $o.dx = $p.X - [int]$f[2]; $o.dy = $p.Y - [int]$f[3]
      }
      [Console]::Out.WriteLine('click ' + ($o | ConvertTo-Json -Compress))
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
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::Out.WriteLine('ready'); [Console]::Out.Flush()
while (($line = [Console]::In.ReadLine()) -ne $null) {
  try {
    $a = $line | ConvertFrom-Json
    if ($a.t -eq 'click') {
      $cx = [int]$a.x; $cy = [int]$a.y
      if ($a.p) {
        $loc = [W]::Locate([string]$a.p, [string]$a.ti)
        if (-not $loc) { throw ('Janela de ' + $a.p + ' nao encontrada (abra o programa e tente de novo).') }
        $o = $loc.Split([char]9)
        $cx = [int]$o[0] + [int]$a.dx
        $cy = [int]$o[1] + [int]$a.dy
      }
      [W]::SetCursorPos($cx, $cy) | Out-Null
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
  /** Pixels físicos da área de trabalho virtual; negativos em monitores à esquerda/acima do principal. */
  x: number;
  y: number;
  /** Janela sob o cursor, quando o Windows soube dizer qual era. */
  win?: EvidenceWindowRef;
}

/** Interpreta uma linha do gravador: `click {"b":1,"x":10,"y":20,"p":"chrome",...}` (ou o formato antigo `click 1 10 20`). */
export function parseClickLine(line: string): RawClick | null {
  const legacy = /^click (\d) (-?\d+) (-?\d+)\s*$/.exec(line);
  if (legacy) return { button: legacy[1] === '2' ? 'right' : 'left', x: Number(legacy[2]), y: Number(legacy[3]) };
  if (!line.startsWith('click {')) return null;
  try {
    const o = JSON.parse(line.slice(6)) as { b?: number; x?: number; y?: number; p?: string; ti?: string; dx?: number; dy?: number };
    if (typeof o.x !== 'number' || typeof o.y !== 'number') return null;
    const click: RawClick = { button: o.b === 2 ? 'right' : 'left', x: Math.round(o.x), y: Math.round(o.y) };
    if (o.p && typeof o.dx === 'number' && typeof o.dy === 'number') {
      click.win = { process: o.p, title: o.ti ?? '', dx: Math.round(o.dx), dy: Math.round(o.dy) };
    }
    return click;
  } catch {
    return null;
  }
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
        return this.send({
          t: 'click',
          x: action.x ?? 0,
          y: action.y ?? 0,
          b: action.button ?? 'left',
          ...(action.win ? { p: action.win.process, ti: action.win.title, dx: action.win.dx, dy: action.win.dy } : {})
        });
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
