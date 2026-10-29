<#
.SYNOPSIS
  Levantamento SOMENTE LEITURA do ambiente da integracao WinThor -> WSH -> CH -> PDV.

.DESCRIPTION
  Roda na maquina que tem o ambiente e grava um arquivo de texto com: servicos Windows,
  processos Java e afins (com a linha de comando mascarada), portas em escuta, containers
  Docker e as pastas de log candidatas. Nao conecta em banco, nao chama API, nao le o
  conteudo de nenhum arquivo e nao altera nada.

  ATENCAO: o arquivo pode conter nomes de servidor, caminhos e portas da empresa. Revise
  antes de enviar. Senhas e tokens que aparecem em linha de comando sao mascarados, mas
  confira.

  O arquivo e ASCII proposital: o PowerShell 5.1 le .ps1 sem BOM como ANSI.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\collect-integration-env.ps1

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\collect-integration-env.ps1 -Pattern 'winthor|wsh|hub|commerce|karaf|postgres' -OutFile C:\temp\coleta.txt
#>
param(
  [string]$OutFile = (Join-Path (Get-Location) 'coleta-ambiente.txt'),
  [string]$Pattern = 'winthor|karaf|wsh|smart|hub|commerce|chub|pdv|postgres|oracle|rabbit|kafka|nginx|tomcat|jboss|wildfly|java'
)

$ErrorActionPreference = 'SilentlyContinue'
$lines = New-Object System.Collections.Generic.List[string]

function Add-Line([string]$text) { [void]$lines.Add($text) }
function Add-Section([string]$title) { Add-Line ''; Add-Line ('=== ' + $title + ' ==='); }

# Mascara segredos comuns em texto livre (linha de comando, URLs com usuario:senha)
function Hide-Secrets([string]$text) {
  if (-not $text) { return '' }
  $t = $text
  $t = [regex]::Replace($t, '(?i)(://)[^/\s:@]+:[^/\s@]+@', '$1***:***@')
  $t = [regex]::Replace($t, '(?i)\b(bearer|basic)\s+[A-Za-z0-9._~+/=\-]+', '$1 ***')
  $t = [regex]::Replace($t, '(?i)(-D[\w.\-]*(pass(word)?|pwd|secret|token|key)[\w.\-]*)=\S+', '$1=***')
  $t = [regex]::Replace($t, '(?i)(\s--?(pass(word)?|pwd|secret|token|api-?key)\s+)("[^"]*"|''[^'']*''|\S+)', '$1***')
  $t = [regex]::Replace($t, '(?i)((pass(word)?|pwd|secret|token|api-?key|authorization)\s*[=:]\s*)("[^"]*"|''[^'']*''|\S+)', '$1***')
  if ($t.Length -gt 700) { $t = $t.Substring(0, 700) + ' ...[cortado]' }
  return $t
}

# Do PathName de um servico, fica so o executavel (sem argumentos, que podem ter segredos)
function Get-ExeOnly([string]$pathName) {
  if (-not $pathName) { return '' }
  $m = [regex]::Match($pathName, '^\s*"?([^"]*?\.exe)', 'IgnoreCase')
  if ($m.Success) { return $m.Groups[1].Value }
  return '(nao identificado)'
}

Add-Line 'Levantamento do ambiente (somente leitura)'
Add-Line ('Data: ' + (Get-Date -Format 'yyyy-MM-dd HH:mm'))
Add-Line ('Sistema: ' + (Get-CimInstance Win32_OperatingSystem).Caption + ' / PowerShell ' + $PSVersionTable.PSVersion)
Add-Line ('Filtro: ' + $Pattern)

# --- Servicos Windows ---
Add-Section 'SERVICOS WINDOWS (nome | exibicao | estado | inicio | executavel)'
$serviceDirs = New-Object System.Collections.Generic.List[string]
$services = Get-CimInstance Win32_Service | Where-Object { ($_.Name + ' ' + $_.DisplayName + ' ' + $_.PathName) -match $Pattern }
foreach ($s in ($services | Sort-Object Name)) {
  $exe = Get-ExeOnly $s.PathName
  Add-Line ('{0} | {1} | {2} | {3} | {4}' -f $s.Name, $s.DisplayName, $s.State, $s.StartMode, $exe)
  if ($exe -and (Test-Path $exe)) { [void]$serviceDirs.Add((Split-Path $exe -Parent)) }
}
if (-not $services) { Add-Line '(nenhum servico casou com o filtro)' }

# --- Processos ---
Add-Section 'PROCESSOS (pid | nome | executavel | linha de comando mascarada)'
$processDirs = New-Object System.Collections.Generic.List[string]
$procs = Get-CimInstance Win32_Process | Where-Object { ($_.Name + ' ' + $_.ExecutablePath) -match $Pattern }
foreach ($p in ($procs | Sort-Object Name, ProcessId)) {
  Add-Line ('{0} | {1} | {2}' -f $p.ProcessId, $p.Name, $p.ExecutablePath)
  if ($p.CommandLine) { Add-Line ('    cmd: ' + (Hide-Secrets $p.CommandLine)) }
  if ($p.ExecutablePath -and (Test-Path $p.ExecutablePath)) { [void]$processDirs.Add((Split-Path $p.ExecutablePath -Parent)) }
}
if (-not $procs) { Add-Line '(nenhum processo casou com o filtro)' }

# --- Portas em escuta ---
Add-Section 'PORTAS EM ESCUTA (porta | endereco | processo)'
$names = @{}
Get-Process | ForEach-Object { $names[[int]$_.Id] = $_.ProcessName }
$listening = Get-NetTCPConnection -State Listen | Sort-Object LocalPort
foreach ($c in $listening) {
  $pname = $names[[int]$c.OwningProcess]
  Add-Line ('{0} | {1} | {2} (pid {3})' -f $c.LocalPort, $c.LocalAddress, $pname, $c.OwningProcess)
}
if (-not $listening) { Add-Line '(nao foi possivel listar as portas)' }

# --- Docker ---
Add-Section 'DOCKER (nome | imagem | portas)'
$docker = Get-Command docker -ErrorAction SilentlyContinue
if ($docker) {
  $out = & docker ps --format '{{.Names}} | {{.Image}} | {{.Ports}}' 2>&1
  if ($LASTEXITCODE -eq 0 -and $out) { $out | ForEach-Object { Add-Line $_ } } else { Add-Line '(docker instalado, mas sem containers ou sem daemon ativo)' }
} else {
  Add-Line '(docker nao encontrado)'
}

# --- Karaf ---
Add-Section 'KARAF'
Add-Line ('KARAF_HOME = ' + $env:KARAF_HOME)
$karafHomes = New-Object System.Collections.Generic.List[string]
if ($env:KARAF_HOME) { [void]$karafHomes.Add($env:KARAF_HOME) }
foreach ($p in $procs) {
  $m = [regex]::Match([string]$p.CommandLine, '-Dkaraf\.home=("[^"]+"|\S+)')
  if ($m.Success) { [void]$karafHomes.Add($m.Groups[1].Value.Trim('"')) }
}
foreach ($karafHome in ($karafHomes | Select-Object -Unique)) {
  Add-Line ('home: ' + $karafHome)
  Add-Line ('  bin\opentelemetry-javaagent.jar existe? ' + (Test-Path (Join-Path $karafHome 'bin\opentelemetry-javaagent.jar')))
  Add-Line ('  etc\ existe? ' + (Test-Path (Join-Path $karafHome 'etc')))
  [void]$processDirs.Add((Join-Path $karafHome 'data'))
}
if ($karafHomes.Count -eq 0) { Add-Line '(nenhum Karaf identificado por KARAF_HOME ou -Dkaraf.home)' }

# --- Pastas de log candidatas: so nomes, tamanhos e datas; o conteudo nao e lido ---
Add-Section 'PASTAS DE LOG CANDIDATAS (arquivo | KB | ultima escrita)'
$roots = @($serviceDirs + $processDirs) | Where-Object { $_ } | Select-Object -Unique
$logDirs = New-Object System.Collections.Generic.List[string]
foreach ($r in $roots) {
  foreach ($candidate in @($r, (Join-Path $r 'log'), (Join-Path $r 'logs'), (Join-Path $r 'data\log'), (Join-Path (Split-Path $r -Parent) 'logs'))) {
    if (Test-Path $candidate) { [void]$logDirs.Add($candidate) }
  }
}
foreach ($dir in ($logDirs | Select-Object -Unique)) {
  $files = Get-ChildItem -Path $dir -File -Include '*.log', '*.out', '*.txt' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 8
  if ($files) {
    Add-Line ('pasta: ' + $dir)
    foreach ($f in $files) { Add-Line ('  {0} | {1} | {2}' -f $f.Name, [math]::Round($f.Length / 1KB), $f.LastWriteTime.ToString('yyyy-MM-dd HH:mm')) }
  }
}
if ($logDirs.Count -eq 0) { Add-Line '(nenhuma pasta de log encontrada perto dos executaveis; procure manualmente)' }

# --- Variaveis de ambiente: so os NOMES ---
Add-Section 'VARIAVEIS DE AMBIENTE RELEVANTES (so os nomes)'
$envNames = Get-ChildItem Env: | Where-Object { $_.Name -match 'KARAF|JAVA|WSH|HUB|COMMERCE|PDV|ORACLE|PG|POSTGRES|WINTHOR' } | Select-Object -ExpandProperty Name
if ($envNames) { Add-Line ($envNames -join ', ') } else { Add-Line '(nenhuma)' }

$lines | Out-File -FilePath $OutFile -Encoding utf8
Write-Host ('Pronto: ' + $OutFile)
Write-Host 'Revise o arquivo antes de enviar: ele pode ter nomes de servidor, caminhos e portas da empresa.'
