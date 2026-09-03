$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$healthUrl = "http://127.0.0.1:3000/api/health/database"
$appUrl = "http://127.0.0.1:3000/dashboard"
$stdoutPath = Join-Path $env:TEMP "fabrica-agil-next.stdout.log"
$stderrPath = Join-Path $env:TEMP "fabrica-agil-next.stderr.log"

Set-Location -LiteralPath $projectRoot

& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $projectRoot "scripts\db-local.ps1") start
if ($LASTEXITCODE -ne 0) {
  throw "O PostgreSQL local não iniciou. Consulte dev-postgres.log."
}

& pnpm.cmd db:deploy
if ($LASTEXITCODE -ne 0) {
  throw "As migrações do banco não foram aplicadas."
}

& pnpm.cmd db:seed
if ($LASTEXITCODE -ne 0) {
  throw "O seed do banco não foi concluído."
}

$running = netstat -ano | Select-String "127.0.0.1:3000.*LISTENING"
if (-not $running) {
  Start-Process -FilePath "pnpm.cmd" -ArgumentList "dev" -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $stdoutPath -RedirectStandardError $stderrPath | Out-Null
}

$ready = $false
for ($attempt = 0; $attempt -lt 45; $attempt++) {
  Start-Sleep -Seconds 1
  try {
    $health = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 2
    if ($health.status -eq "ok") {
      $ready = $true
      break
    }
  } catch {
    # O Next.js pode levar alguns segundos para compilar a primeira rota.
  }
}

if (-not $ready) {
  throw "A aplicação não respondeu em 45 segundos. Consulte $stderrPath."
}

Start-Process $appUrl
Write-Output "Fábrica Ágil disponível em $appUrl"
