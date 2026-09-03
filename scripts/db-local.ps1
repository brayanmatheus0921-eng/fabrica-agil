param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("start", "status", "stop")]
  [string]$Action
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$dataPath = Join-Path $projectRoot "dev-postgres-data"
$logPath = Join-Path $projectRoot "dev-postgres.log"
$pgBin = "C:\Program Files\PostgreSQL\17\bin"
$pgCtl = Join-Path $pgBin "pg_ctl.exe"
$pgIsReady = Join-Path $pgBin "pg_isready.exe"

if (-not (Test-Path -LiteralPath $pgCtl)) {
  throw "PostgreSQL 17 não encontrado em $pgBin"
}

if (-not (Test-Path -LiteralPath (Join-Path $dataPath "PG_VERSION"))) {
  throw "Cluster local não inicializado em $dataPath"
}

switch ($Action) {
  "start" {
    & $pgCtl -D $dataPath status *> $null

    if ($LASTEXITCODE -ne 0) {
      & $pgCtl -D $dataPath -l $logPath -o '"-p 5433 -h 127.0.0.1"' start
      if ($LASTEXITCODE -ne 0) {
        throw "Não foi possível iniciar o PostgreSQL local"
      }
    }

    & $pgIsReady -h 127.0.0.1 -p 5433 -U fabrica_dev
  }
  "status" {
    & $pgCtl -D $dataPath status
    & $pgIsReady -h 127.0.0.1 -p 5433 -U fabrica_dev
  }
  "stop" {
    & $pgCtl -D $dataPath status *> $null

    if ($LASTEXITCODE -eq 0) {
      & $pgCtl -D $dataPath stop -m fast
    } else {
      Write-Output "PostgreSQL local já está parado"
    }
  }
}
