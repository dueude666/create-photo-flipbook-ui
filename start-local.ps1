$ErrorActionPreference = 'Stop'
$websiteDir = Join-Path $PSScriptRoot 'website'
$port = 4174
$url = "http://127.0.0.1:$port/create-photo-flipbook-ui/zh/"
$runtimeDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'create-photo-flipbook-ui-runtime'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    Write-Output "Website already running: $url"
    & (Join-Path $PSScriptRoot 'start-library.ps1')
    exit 0
}
if (-not (Test-Path -LiteralPath (Join-Path $websiteDir 'dist/index.html'))) {
    throw 'Build missing. Run npm.cmd ci and npm.cmd run build -- --base /create-photo-flipbook-ui/ in website first.'
}
$nodePath = (Get-Command node.exe).Source
$vitePath = Join-Path $websiteDir 'node_modules/vite/bin/vite.js'
$server = Start-Process -FilePath $nodePath -ArgumentList @("`"$vitePath`"", 'preview', '--base', '/create-photo-flipbook-ui/', '--host', '127.0.0.1', '--port', "$port", '--strictPort') -WorkingDirectory $websiteDir -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir 'server.log') -RedirectStandardError (Join-Path $runtimeDir 'server-error.log') -PassThru
$server.Id | Set-Content -LiteralPath (Join-Path $runtimeDir 'server.pid')
Write-Output "Started PID $($server.Id): $url"
& (Join-Path $PSScriptRoot 'start-library.ps1')
