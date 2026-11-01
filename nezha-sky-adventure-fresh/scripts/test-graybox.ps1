param([string]$TypeScriptPath = 'C:\ProgramData\cocos\editors\Creator\3.8.8\resources\app.asar.unpacked\node_modules\typescript\lib\tsc.js')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot
try {
    & node $TypeScriptPath assets/scripts/gameplay/FlightModel.ts assets/scripts/gameplay/ObstacleMotion.ts assets/scripts/gameplay/ArtAnimation.ts assets/scripts/gameplay/RichObstacleMotion.ts assets/scripts/gameplay/SceneMotion.ts assets/scripts/config/ArtManifest.ts --outDir temp/model-tests --target ES2020 --module commonjs --strict --skipLibCheck
    if ($LASTEXITCODE -ne 0) { throw 'Model compilation failed.' }
    & node --test scripts/test-flight-model.cjs scripts/test-obstacle-system.cjs scripts/test-obstacle-motion.cjs scripts/test-production-art.cjs scripts/test-scene-motion.cjs
    if ($LASTEXITCODE -ne 0) { throw 'Flight model tests failed.' }
} finally { Pop-Location }

