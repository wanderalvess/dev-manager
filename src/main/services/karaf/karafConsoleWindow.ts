import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AppSettings } from '../../../shared/types';
import { isWslKaraf } from '../../utils/karafWslUtils';
import { isDockerKaraf } from '../../utils/karafDockerUtils';
import { killProcessTree } from '../../utils/process';
import type { ChunkHandler } from './karafContext';

/**
 * Console do Karaf por JANELA REAL (Windows): abre `start "WinThorDebug" winthor.bat debug` e um helper
 * se anexa ao console dessa janela (AttachConsole) para ler o buffer já renderizado e injetar as teclas
 * (WriteConsoleInput). Não passa por SSH nem por pipe de stdin: o Karaf enxerga um TTY de verdade, o
 * comando responde na hora e o texto vem sem sequências ANSI soltas.
 */

const WINDOW_TITLE = 'WinThorDebug';
/** Quanto esperar o java.exe novo aparecer depois de abrir a janela (o Karaf carrega a JVM em poucos segundos). */
const ATTACH_TIMEOUT_MS = 45000;

export type KarafWindowLaunch = {
  exeFile: string;
  scriptDir: string;
  env: NodeJS.ProcessEnv;
  karafPath: string;
};

/** Janela real só vale para Karaf nativo no Windows; WSL e container seguem pelo caminho antigo. */
export function useKarafWindowMode(settings: AppSettings, platform: NodeJS.Platform = process.platform): boolean {
  if (platform !== 'win32') return false;
  if (isWslKaraf(settings) || isDockerKaraf(settings)) return false;
  return settings.karafEmbeddedMode !== 'pipe';
}

// ---------------------------------------------------------------------------------------------
// Helper PowerShell + C#. Protocolo por linhas (stdin → helper):
//   ARM <b64 needle>   observa um java.exe NOVO do Karaf (needle = pasta do Karaf) e se anexa a ele
//   ATTACH <pid>       anexa a um java.exe que já estava rodando
//   SEND <b64 texto>   digita o texto e Enter
//   CTRLC              Ctrl+C
//   QUIT
// helper → stdout:  O <b64 linha> | S <b64 info> | E <b64 erro> | N <pids> | X (console acabou)
// Só C# 5 (Add-Type do Windows PowerShell 5.1) e só ASCII no fonte.
// ---------------------------------------------------------------------------------------------
const HELPER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
Add-Type -ReferencedAssemblies System.Management -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Management;
using System.Runtime.InteropServices;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

public static class KC {
  [StructLayout(LayoutKind.Sequential)] public struct COORD { public short X; public short Y; }
  [StructLayout(LayoutKind.Sequential)] public struct SMALL_RECT { public short Left; public short Top; public short Right; public short Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct CSBI { public COORD dwSize; public COORD dwCursorPosition; public ushort wAttributes; public SMALL_RECT srWindow; public COORD dwMaximumWindowSize; }
  [StructLayout(LayoutKind.Explicit)] public struct KEY_EVENT {
    [FieldOffset(0)] public int bKeyDown; [FieldOffset(4)] public ushort wRepeatCount; [FieldOffset(6)] public ushort wVirtualKeyCode;
    [FieldOffset(8)] public ushort wVirtualScanCode; [FieldOffset(10)] public ushort UnicodeChar; [FieldOffset(12)] public uint dwControlKeyState; }
  [StructLayout(LayoutKind.Explicit)] public struct INPUT_RECORD { [FieldOffset(0)] public ushort EventType; [FieldOffset(4)] public KEY_EVENT KeyEvent; }

  [DllImport("kernel32.dll", SetLastError = true)] static extern bool FreeConsole();
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool AttachConsole(uint pid);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr sec, uint disp, uint flags, IntPtr tmpl);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(IntPtr h);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetConsoleScreenBufferInfo(IntPtr h, out CSBI info);
  [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)] static extern bool ReadConsoleOutputCharacterW(IntPtr h, char[] buf, uint len, COORD at, out uint read);
  [DllImport("kernel32.dll", SetLastError = true)] static extern bool WriteConsoleInputW(IntPtr h, INPUT_RECORD[] buf, uint len, out uint written);

  static Stream stdout;
  static readonly Queue<string> queue = new Queue<string>();
  static IntPtr hIn = IntPtr.Zero, hOut = IntPtr.Zero;
  static int targetPid = 0;
  static bool attached = false;
  static int lastRow = -1;
  static readonly List<string> emitted = new List<string>();
  static string needle = null;
  static HashSet<int> known = new HashSet<int>();
  static DateTime armedAt;
  static bool arming = false;
  static int armTimeoutMs = 45000;
  static readonly Regex promptRe = new Regex(@"^karaf@\S*>", RegexOptions.Compiled);

  static void Emit(string tag, string payload) {
    byte[] b = Encoding.UTF8.GetBytes(tag + " " + Convert.ToBase64String(Encoding.UTF8.GetBytes(payload ?? "")) + "\n");
    stdout.Write(b, 0, b.Length); stdout.Flush();
  }
  static void EmitRaw(string line) { byte[] b = Encoding.UTF8.GetBytes(line + "\n"); stdout.Write(b, 0, b.Length); stdout.Flush(); }

  static List<KeyValuePair<int, string>> KarafJavas() {
    List<KeyValuePair<int, string>> list = new List<KeyValuePair<int, string>>();
    try {
      using (ManagementObjectSearcher s = new ManagementObjectSearcher("SELECT ProcessId, CommandLine FROM Win32_Process WHERE Name = 'java.exe'"))
      using (ManagementObjectCollection c = s.Get()) {
        foreach (ManagementObject o in c) {
          string cl = (o["CommandLine"] as string) ?? "";
          if (cl.IndexOf("org.apache.karaf.main.Main", StringComparison.OrdinalIgnoreCase) < 0) continue;
          if (!string.IsNullOrEmpty(needle) && cl.IndexOf(needle, StringComparison.OrdinalIgnoreCase) < 0) continue;
          list.Add(new KeyValuePair<int, string>(Convert.ToInt32(o["ProcessId"]), cl));
        }
      }
    } catch (Exception) { }
    return list;
  }

  static bool Attach(int pid, bool quiet) {
    if (hIn != IntPtr.Zero) { CloseHandle(hIn); hIn = IntPtr.Zero; }
    if (hOut != IntPtr.Zero) { CloseHandle(hOut); hOut = IntPtr.Zero; }
    FreeConsole();
    // Logo depois de abrir a janela o java.exe ainda pode nao ter console pronto: em "quiet" o proximo ciclo tenta de novo.
    if (!AttachConsole((uint)pid)) { if (!quiet) Emit("E", "AttachConsole falhou (erro " + Marshal.GetLastWin32Error() + "): o java.exe " + pid + " nao tem janela de console."); return false; }
    hIn = CreateFile("CONIN$", 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
    hOut = CreateFile("CONOUT$", 0xC0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
    if (hIn == new IntPtr(-1) || hOut == new IntPtr(-1)) { if (!quiet) Emit("E", "Nao consegui abrir o buffer do console (erro " + Marshal.GetLastWin32Error() + ")."); return false; }
    targetPid = pid; attached = true; lastRow = -1; emitted.Clear(); arming = false;
    Emit("S", "attached " + pid);
    return true;
  }

  static void Key(List<INPUT_RECORD> l, char ch, ushort vk, uint ctrl) {
    for (int down = 1; down >= 0; down--) {
      INPUT_RECORD r = new INPUT_RECORD(); r.EventType = 1;
      r.KeyEvent.bKeyDown = down; r.KeyEvent.wRepeatCount = 1; r.KeyEvent.wVirtualKeyCode = vk;
      r.KeyEvent.wVirtualScanCode = 0; r.KeyEvent.UnicodeChar = ch; r.KeyEvent.dwControlKeyState = ctrl;
      l.Add(r);
    }
  }
  static void Write(List<INPUT_RECORD> l) { uint w; WriteConsoleInputW(hIn, l.ToArray(), (uint)l.Count, out w); }

  static void SendText(string text) {
    List<INPUT_RECORD> l = new List<INPUT_RECORD>();
    foreach (char ch in text) { if (ch == '\r' || ch == '\n') continue; Key(l, ch, 0, 0); }
    Key(l, '\r', 0x0D, 0);
    Write(l);
  }
  static void CtrlC() { List<INPUT_RECORD> l = new List<INPUT_RECORD>(); Key(l, (char)3, 0x43, 0x8); Write(l); }

  static string ReadRow(int y, int width, out bool full) {
    char[] buf = new char[width]; uint n;
    COORD at = new COORD(); at.X = 0; at.Y = (short)y;
    full = false;
    if (!ReadConsoleOutputCharacterW(hOut, buf, (uint)width, at, out n) || n == 0) return "";
    string raw = new string(buf, 0, (int)n);
    if (n >= width && raw[raw.Length - 1] != ' ' && raw[raw.Length - 1] != '\0') full = true;
    return raw.TrimEnd(' ', '\0');
  }

  static void EmitLine(string t) {
    if (t.Trim().Length == 0 || promptRe.IsMatch(t)) return;
    emitted.Add(t); if (emitted.Count > 12) emitted.RemoveAt(0);
    Emit("O", t);
  }

  // Linhas longas do log quebram na largura do buffer: junta as linhas que terminam preenchidas.
  static List<string> Join(int from, int to, int width, out int pendingStart) {
    List<string> lines = new List<string>(); StringBuilder cur = new StringBuilder(); int start = -1; pendingStart = -1;
    for (int y = from; y < to; y++) {
      bool full; string t = ReadRow(y, width, out full);
      if (cur.Length == 0) start = y;
      cur.Append(t);
      if (full) { pendingStart = start; continue; }
      pendingStart = -1; lines.Add(cur.ToString()); cur.Length = 0;
    }
    return lines;
  }

  static bool Poll() {
    try { Process.GetProcessById(targetPid); } catch (ArgumentException) { return false; }
    CSBI info;
    if (!GetConsoleScreenBufferInfo(hOut, out info)) return false;
    int width = info.dwSize.X, bufH = info.dwSize.Y, curY = info.dwCursorPosition.Y;
    if (lastRow < 0) lastRow = Math.Max(0, curY - 600);
    if (curY >= bufH - 1) {
      // Buffer cheio: o texto rola e o cursor fica parado na ultima linha. Le a janela final e corta o que ja foi enviado.
      int from = Math.Max(0, curY - 300); int ps;
      List<string> win = Join(from, curY, width, out ps);
      List<string> nb = new List<string>(); foreach (string s in win) if (s.Trim().Length > 0) nb.Add(s);
      int m = Math.Min(3, emitted.Count); int cut = -1;
      if (m > 0) for (int i = nb.Count - 1; i >= m - 1; i--) {
        bool ok = true; for (int k = 0; k < m; k++) if (nb[i - k] != emitted[emitted.Count - 1 - k]) { ok = false; break; }
        if (ok) { cut = i; break; }
      }
      for (int i = cut + 1; i < nb.Count; i++) EmitLine(nb[i]);
      return true;
    }
    if (curY < lastRow) lastRow = curY;
    if (curY > lastRow) {
      int ps; List<string> lines = Join(lastRow, curY, info.dwSize.X, out ps);
      foreach (string l in lines) EmitLine(l);
      lastRow = ps >= 0 ? ps : curY;
    }
    return true;
  }

  static string Dequeue() { lock (queue) { return queue.Count > 0 ? queue.Dequeue() : null; } }

  public static void Run() {
    stdout = Console.OpenStandardOutput();
    Stream stdin = Console.OpenStandardInput();
    Thread reader = new Thread(delegate () {
      StreamReader r = new StreamReader(stdin, new UTF8Encoding(false)); string l;
      while ((l = r.ReadLine()) != null) lock (queue) queue.Enqueue(l);
      lock (queue) queue.Enqueue("QUIT");
    });
    reader.IsBackground = true; reader.Start();
    EmitRaw("R");
    DateTime lastScan = DateTime.MinValue;
    while (true) {
      string cmd;
      while ((cmd = Dequeue()) != null) {
        string[] p = cmd.Split(new char[] { ' ' }, 2);
        string arg = p.Length > 1 ? p[1] : "";
        if (p[0] == "QUIT") return;
        if (p[0] == "ARM") {
          needle = arg.Length > 0 ? Encoding.UTF8.GetString(Convert.FromBase64String(arg)) : null;
          known = new HashSet<int>(); foreach (KeyValuePair<int, string> kv in KarafJavas()) known.Add(kv.Key);
          arming = true; armedAt = DateTime.UtcNow; EmitRaw("A");
        } else if (p[0] == "ATTACH") {
          Attach(int.Parse(arg), false);
        } else if (p[0] == "EXISTING") {
          List<string> ids = new List<string>(); foreach (int id in known) ids.Add(id.ToString());
          EmitRaw("N " + string.Join(",", ids.ToArray()));
        } else if (attached && p[0] == "SEND") {
          SendText(Encoding.UTF8.GetString(Convert.FromBase64String(arg)));
        } else if (attached && p[0] == "CTRLC") {
          CtrlC();
        }
      }
      if (arming && (DateTime.UtcNow - lastScan).TotalMilliseconds > 700) {
        lastScan = DateTime.UtcNow;
        foreach (KeyValuePair<int, string> kv in KarafJavas()) {
          if (known.Contains(kv.Key)) continue;
          if (Attach(kv.Key, true)) break;
        }
        if (arming && (DateTime.UtcNow - armedAt).TotalMilliseconds > armTimeoutMs) {
          arming = false;
          List<string> ids = new List<string>(); foreach (int id in known) ids.Add(id.ToString());
          EmitRaw("N " + string.Join(",", ids.ToArray()));
        }
      }
      if (attached && !Poll()) { EmitRaw("X"); return; }
      Thread.Sleep(60);
    }
  }
}
'@
[KC]::Run()
`;

// ---------------------------------------------------------------------------------------------

type Session = {
  helper: ChildProcess;
  onLog: ChunkHandler;
  attached: boolean;
  javaPid: number | null;
  stopping: boolean;
};

let session: Session | null = null;

export function isKarafWindowRunning(): boolean {
  return session !== null && session.attached && !session.stopping;
}

/** A janela foi pedida e o helper está vivo (mesmo que o java.exe ainda esteja subindo). */
export function hasKarafWindowSession(): boolean {
  return session !== null && !session.stopping;
}

export function getKarafWindowPid(): number | null {
  return session?.javaPid ?? null;
}

function decode(b64: string): string {
  return Buffer.from(b64, 'base64').toString('utf8');
}

function writeHelperScript(): string {
  const file = path.join(os.tmpdir(), `dev-manager-karaf-console-${process.pid}.ps1`);
  // BOM: o Windows PowerShell 5.1 lê .ps1 sem BOM como ANSI
  fs.writeFileSync(file, String.fromCharCode(0xfeff) + HELPER_SCRIPT, 'utf8');
  return file;
}

function handleHelperLine(s: Session, line: string, launch: KarafWindowLaunch, openWindow: () => void): void {
  if (line === 'R') {
    s.helper.stdin?.write(`ARM ${Buffer.from(launch.karafPath || '', 'utf8').toString('base64')}\n`);
    return;
  }
  if (line === 'A') {
    openWindow();
    return;
  }
  if (line === 'X') {
    s.onLog('\r\n[AVISO] A janela do Karaf foi fechada ou o Karaf encerrou.\r\n');
    return;
  }
  if (line.startsWith('N')) {
    // Nenhum java.exe novo apareceu: se já havia um Karaf rodando em outra janela, usa o console dele.
    const existing = line.slice(1).trim().split(',').filter(Boolean);
    if (existing.length > 0) {
      s.onLog(`[INFO] Já havia um Karaf em execução (PID ${existing[0]}); conectando ao console dele.\r\n`);
      s.helper.stdin?.write(`ATTACH ${existing[0]}\n`);
    } else {
      s.onLog(
        `[ERRO] A janela abriu, mas o java.exe do Karaf não apareceu em ${ATTACH_TIMEOUT_MS / 1000}s. Veja a janela "${WINDOW_TITLE}" (erro do winthor.bat/JAVA_HOME?).\r\n`
      );
    }
    return;
  }
  const space = line.indexOf(' ');
  const tag = space < 0 ? line : line.slice(0, space);
  const payload = space < 0 ? '' : decode(line.slice(space + 1));
  if (tag === 'O') s.onLog(`${payload}\r\n`);
  else if (tag === 'E') s.onLog(`[ERRO] ${payload}\r\n`);
  else if (tag === 'S' && payload.startsWith('attached ')) {
    s.attached = true;
    s.javaPid = Number(payload.slice('attached '.length)) || null;
    s.onLog(`[OK] Console do Karaf conectado à janela "${WINDOW_TITLE}" (PID ${s.javaPid}).\r\n`);
  }
}

/** Abre a janela do Karaf (mesmo `start` de antes) e conecta o helper ao console dela. */
export function startKarafWindow(launch: KarafWindowLaunch, onLog: ChunkHandler): ChildProcess | null {
  if (session) return session.helper;
  let scriptFile: string;
  try {
    scriptFile = writeHelperScript();
  } catch (err: any) {
    onLog(`[ERRO] Não foi possível preparar o helper do console: ${err?.message || err}\r\n`);
    return null;
  }

  const helper = spawn(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptFile],
    { windowsHide: true, env: launch.env, stdio: ['pipe', 'pipe', 'pipe'] }
  );
  const s: Session = { helper, onLog, attached: false, javaPid: null, stopping: false };
  session = s;

  let opened = false;
  const openWindow = () => {
    if (opened) return;
    opened = true;
    const cmdExe = launch.env.ComSpec || process.env.ComSpec || 'cmd.exe';
    const script = path.basename(launch.exeFile);
    // Igual ao que se fazia à mão: start "WinThorDebug" /d <pasta> winthor.bat debug
    const line = `start "${WINDOW_TITLE}" /d "${launch.scriptDir}" "${script}" debug`;
    try {
      const win = spawn(cmdExe, ['/d', '/s', '/c', `"${line}"`], {
        cwd: launch.scriptDir,
        env: launch.env,
        windowsVerbatimArguments: true,
        windowsHide: true,
        detached: true,
        stdio: 'ignore'
      });
      win.on('error', (err) => onLog(`[ERRO] Falha ao abrir a janela do Karaf: ${err.message}\r\n`));
      win.unref();
      onLog(`[OK] Abrindo a janela "${WINDOW_TITLE}" (${script} debug)...\r\n`);
    } catch (err: any) {
      onLog(`[ERRO FATAL] Não foi possível abrir a janela do Karaf: ${err?.message || err}\r\n`);
    }
  };

  let buffer = '';
  helper.stdout?.on('data', (data: Buffer) => {
    buffer += data.toString('utf8');
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).replace(/\r$/, '');
      buffer = buffer.slice(nl + 1);
      if (line) handleHelperLine(s, line, launch, openWindow);
    }
  });
  let stderr = '';
  helper.stderr?.on('data', (d: Buffer) => {
    stderr += d.toString('utf8');
  });
  helper.on('error', (err) => onLog(`[ERRO] Helper do console falhou: ${err.message}\r\n`));
  helper.on('close', (code) => {
    if (session === s) session = null;
    try {
      fs.unlinkSync(scriptFile);
    } catch {
      /* já removido */
    }
    if (!s.stopping) {
      const detail = !s.attached && stderr.trim() ? `\r\n${stderr.trim()}` : '';
      onLog(`\r\n[AVISO] Sessão do console do Karaf encerrada (código ${code}).${detail}\r\n`);
    }
  });
  return helper;
}

export function sendKarafWindowInput(text: string): boolean {
  if (!session?.attached || !session.helper.stdin?.writable) return false;
  // eslint-disable-next-line no-control-regex -- o texto vira teclas digitadas: nada de controle (Ctrl+C tem comando próprio)
  const clean = text.replace(/[\x00-\x1F]/g, '');
  session.helper.stdin.write(`SEND ${Buffer.from(clean, 'utf8').toString('base64')}\n`);
  return true;
}

export function interruptKarafWindow(): boolean {
  if (!session?.attached || !session.helper.stdin?.writable) return false;
  session.helper.stdin.write('CTRLC\n');
  return true;
}

/** Fecha o helper e derruba o Karaf da janela (a janela fecha sozinha quando o script termina). */
export async function stopKarafWindow(): Promise<boolean> {
  const s = session;
  if (!s) return true;
  s.stopping = true;
  session = null;
  try {
    s.helper.stdin?.write('QUIT\n');
  } catch {
    /* helper já morreu */
  }
  setTimeout(() => {
    if (s.helper.exitCode === null) s.helper.kill();
  }, 1500).unref();
  if (s.javaPid) {
    try {
      killProcessTree(s.javaPid);
    } catch {
      /* o java.exe já saiu */
    }
  }
  return true;
}
