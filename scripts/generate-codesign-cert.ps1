<#
  Gera certificado self-signed pra assinatura do instalador (NSIS/portable).
  Rodar de novo apenas quando o certificado expirar (validade: 5 anos) ou for revogado.

  Saida:
    certs/dev-manager-codesign.pfx  -> privado, NAO versionar (gitignored). Usado pelo build.
    certs/dev-manager-public.cer    -> publico, distribuir pro time (importar como Trusted Root).
    .env.codesign                   -> CSC_LINK + CSC_KEY_PASSWORD lidos por scripts/build-electron.cjs.
#>

$ErrorActionPreference = 'Stop'

$certsDir = Join-Path $PSScriptRoot '..\certs'
if (-not (Test-Path $certsDir)) {
  New-Item -ItemType Directory -Path $certsDir | Out-Null
}

$subject = "CN=Dev Manager Internal Code Signing, O=Dev Manager, C=BR"
$cert = New-SelfSignedCertificate -Type CodeSigningCert -Subject $subject `
  -CertStoreLocation Cert:\CurrentUser\My `
  -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 `
  -KeyUsage DigitalSignature -NotAfter (Get-Date).AddYears(5) `
  -HashAlgorithm SHA256

$thumbprint = $cert.Thumbprint

$bytes = New-Object byte[] 24
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$pw = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''
$securePw = ConvertTo-SecureString -String $pw -Force -AsPlainText

$pfxPath = Join-Path $certsDir 'dev-manager-codesign.pfx'
$cerPath = Join-Path $certsDir 'dev-manager-public.cer'

Export-PfxCertificate -Cert "Cert:\CurrentUser\My\$thumbprint" -FilePath $pfxPath -Password $securePw | Out-Null
Export-Certificate -Cert "Cert:\CurrentUser\My\$thumbprint" -FilePath $cerPath | Out-Null

Remove-Item "Cert:\CurrentUser\My\$thumbprint" -Confirm:$false

$envPath = Join-Path $PSScriptRoot '..\.env.codesign'
@"
CSC_LINK=./certs/dev-manager-codesign.pfx
CSC_KEY_PASSWORD=$pw
"@ | Out-File -FilePath $envPath -Encoding utf8 -NoNewline

Write-Output "Certificado gerado. Thumbprint: $thumbprint"
Write-Output "Distribua certs/dev-manager-public.cer para o time (import como Trusted Root)."
