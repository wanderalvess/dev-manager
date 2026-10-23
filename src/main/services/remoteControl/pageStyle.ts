/** CSS da página do celular: mesma identidade dark/cockpit do app, pensada para o polegar. */
export const PAGE_CSS = `
:root{--bg:#0b0f17;--card:#121a27;--border:#223049;--fg:#e6edf6;--muted:#8a9bb4;--primary:#38bdf8;--ok:#34d399;--warn:#fbbf24;--bad:#f87171}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif}
body{padding:0 12px 88px;max-width:640px;margin:0 auto}
header{position:sticky;top:0;z-index:5;background:var(--bg);padding:12px 0 8px;display:flex;align-items:center;justify-content:space-between;gap:8px}
h1{font-size:16px;margin:0;letter-spacing:.02em}
h2{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted);margin:18px 0 8px}
.chip{font-size:12px;padding:3px 10px;border-radius:99px;border:1px solid var(--border);color:var(--muted);white-space:nowrap}
.chip.busy{color:var(--warn);border-color:var(--warn)}.chip.ok{color:var(--ok);border-color:var(--ok)}.chip.bad{color:var(--bad);border-color:var(--bad)}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px}
.row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border)}
.row:last-child{border-bottom:0}
.row .name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .sub{display:block;font-size:12px;color:var(--muted);overflow:hidden;text-overflow:ellipsis}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;background:var(--muted);margin-right:8px}
.dot.on{background:var(--ok)}.dot.off{background:var(--bad)}
.btns{display:flex;flex-wrap:wrap;gap:8px}
button{font:inherit;color:var(--fg);background:#1a2638;border:1px solid var(--border);border-radius:10px;padding:11px 14px;min-height:44px}
button.primary{background:var(--primary);color:#04202e;border-color:var(--primary);font-weight:600}
button.danger{border-color:var(--bad);color:var(--bad)}
button.small{padding:7px 10px;min-height:36px;font-size:13px}
button:disabled{opacity:.45}
button:active:not(:disabled){transform:scale(.97)}
pre{margin:0;max-height:55vh;overflow:auto;font:12px/1.35 ui-monospace,Consolas,monospace;white-space:pre-wrap;word-break:break-all;color:#cfe3f7}
nav{position:fixed;left:0;right:0;bottom:0;background:var(--card);border-top:1px solid var(--border);display:flex;justify-content:center;padding-bottom:env(safe-area-inset-bottom)}
nav .inner{display:flex;width:100%;max-width:640px}
nav button{flex:1;border:0;border-radius:0;background:none;color:var(--muted);min-height:56px;font-size:13px}
nav button.active{color:var(--primary)}
.empty{color:var(--muted);text-align:center;padding:16px 0}
.toast{position:fixed;left:12px;right:12px;bottom:72px;z-index:20;background:#1a2638;border:1px solid var(--border);border-radius:10px;padding:12px;text-align:center}
.veil{position:fixed;inset:0;z-index:30;background:rgba(0,0,0,.65);display:flex;align-items:flex-end;justify-content:center}
.sheet{background:var(--card);border:1px solid var(--border);border-radius:16px 16px 0 0;padding:16px;width:100%;max-width:640px}
.sheet p{margin:0 0 14px}
.sheet .btns button{flex:1}
`;
