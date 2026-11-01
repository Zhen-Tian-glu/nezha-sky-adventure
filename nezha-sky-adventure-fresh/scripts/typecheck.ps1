param([string]$TypeScriptPath = 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\lib\tsc.js')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $projectRoot 'temp/tsconfig.cocos.json'))) { throw 'Open/import the project in Creator first.' }
& node $TypeScriptPath --project (Join-Path $projectRoot 'tsconfig.json') --noEmit
if ($LASTEXITCODE -ne 0) { throw 'TypeScript check failed.' }
