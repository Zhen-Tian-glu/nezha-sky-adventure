param(
    [ValidateSet('web-mobile','wechatgame')] [string]$Platform = 'web-mobile',
    [string]$CreatorPath = 'C:\ProgramData\cocos\editors\Creator\3.8.8\CocosCreator.exe'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$configPath = Join-Path $projectRoot "config/build-$Platform.json"
if (!(Test-Path -LiteralPath $CreatorPath)) { throw "Creator not found: $CreatorPath" }
$buildArgument = '"configPath=' + $configPath + '"'
$process = Start-Process -FilePath $CreatorPath -ArgumentList @('--project', ('"' + $projectRoot + '"'), '--build', $buildArgument) -WindowStyle Hidden -PassThru -Wait
# Creator documents exit code 36 as build success.
if ($process.ExitCode -ne 36) { throw "Build failed, Creator exit code: $($process.ExitCode)" }
Write-Output "Build succeeded: $projectRoot\build\$Platform"
