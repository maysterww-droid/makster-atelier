$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$env:SUPABASE_URL = 'https://gkqntgfrbngspvrsqvmx.supabase.co'
$env:SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_EFtcR-56E5AdizaU-VC9EQ_nyVVUBGw'
$env:DEMO_ORGANIZATION_ID = '26000000-0000-4000-8000-000000000001'
$env:PORT = '8796'

function Normalize-Secret([string]$value) {
  if ($null -eq $value) { return '' }
  $v = $value.Trim().Trim('"').Trim("'")
  # Remove whitespace and common invisible characters that can appear after clipboard paste.
  $v = [Regex]::Replace($v, '[\s\u200B\u200C\u200D\uFEFF]', '')
  return $v
}

function Get-JwtRole([string]$jwt) {
  try {
    $parts = $jwt.Split('.')
    if ($parts.Length -ne 3) { return $null }
    $payload = $parts[1].Replace('-', '+').Replace('_', '/')
    switch ($payload.Length % 4) {
      2 { $payload += '==' }
      3 { $payload += '=' }
    }
    $json = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payload)) | ConvertFrom-Json
    return [string]$json.role
  } catch { return $null }
}

Write-Host ''
Write-Host 'MAKSTER AI 2.6 - STAGING ACCEPTANCE V3' -ForegroundColor Cyan
Write-Host 'Project: Makster-Staging / eu-central-1'
Write-Host 'The secret is used only inside this PowerShell process and is not written to disk.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Step 1: In Supabase, COPY the Secret key (sb_secret_...) to Windows clipboard.' -ForegroundColor White
Write-Host 'Step 2: Return to this window and press Enter. Do NOT paste anything here.' -ForegroundColor White
Write-Host 'The clipboard will be cleared immediately after reading the key.' -ForegroundColor Yellow
Write-Host ''

Read-Host 'First COPY the Secret key in Supabase. Then return here and press Enter'
try {
  $plain = Get-Clipboard -Raw
} catch {
  throw 'Could not read Windows clipboard. Copy the Secret key again and rerun this file.'
}
$plain = Normalize-Secret $plain
try { Set-Clipboard -Value '' } catch {}


if ([string]::IsNullOrWhiteSpace($plain)) {
  throw 'No key was entered.'
}
if ($plain.StartsWith('sb_publishable_')) {
  throw 'Wrong key: this is the Publishable key. Copy the Secret key instead.'
}
if ($plain.StartsWith('sb_secret_')) {
  Write-Host "Secret key format OK (sb_secret_, length $($plain.Length))." -ForegroundColor Green
} elseif ($plain.StartsWith('eyJ')) {
  $role = Get-JwtRole $plain
  if ($role -ne 'service_role') {
    throw "Wrong legacy JWT key. Expected role=service_role, got role=$role"
  }
  Write-Host "Legacy service_role key format OK (length $($plain.Length))." -ForegroundColor Green
} else {
  throw 'Unrecognized key format. Copy Secret key (sb_secret_...) or legacy service_role key from Makster-Staging API Keys.'
}

$env:SUPABASE_SECRET_KEY = $plain
$env:SUPABASE_SERVICE_ROLE_KEY = $plain
$plain = $null

function Run-Probe([string]$label) {
  Write-Host "[$label] Reading persisted business state..."
  & node .\STAGING_PROBE_2_6.mjs
  if ($LASTEXITCODE -ne 0) { throw "Business store probe failed: $label" }
}

function Start-And-Check-Core([string]$label) {
  Write-Host "[$label] Starting Core API..."
  $p = Start-Process -FilePath 'node' -ArgumentList 'dist\apps\core-api\src\server.js' -PassThru -WindowStyle Hidden
  try {
    $health = $null
    for ($i = 0; $i -lt 25; $i++) {
      Start-Sleep -Milliseconds 400
      try {
        $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8796/api/v1/health' -TimeoutSec 2
        break
      } catch {}
    }
    if ($null -eq $health) { throw "Core API did not become healthy: $label" }
    if ($health.version -ne '2.6.0') { throw "Unexpected Core version: $($health.version)" }
    if ($health.businessPersistence -ne 'supabase') { throw "Business persistence is not Supabase: $($health.businessPersistence)" }
    if ($health.repository -ne 'supabase') { throw "Project repository is not Supabase: $($health.repository)" }
    Write-Host "[$label] PASS: Core 2.6.0 / businessPersistence=supabase / repository=supabase" -ForegroundColor Green
  } finally {
    if ($p -and -not $p.HasExited) { Stop-Process -Id $p.Id -Force }
  }
}

try {
  Run-Probe 'PROCESS A'
  Start-And-Check-Core 'CORE START 1'
  Start-And-Check-Core 'CORE START 2'
  Run-Probe 'PROCESS B AFTER RESTARTS'
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host 'STAGING ACCEPTANCE: PASS' -ForegroundColor Green
  Write-Host '============================================================' -ForegroundColor Green
  Write-Host 'Contract / Change Order / Authorization survived independent process reads and Core restarts.'
} catch {
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor Red
  Write-Host 'STAGING ACCEPTANCE: FAIL' -ForegroundColor Red
  Write-Host '============================================================' -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Yellow
  Write-Host ''
  Write-Host 'Take a photo of THIS window and send it to ChatGPT.' -ForegroundColor Cyan
} finally {
  Remove-Item Env:SUPABASE_SECRET_KEY -ErrorAction SilentlyContinue
  Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
}
