$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'skills\create-photo-flipbook-ui\assets\html'
$port = 4175
if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
    Write-Output "书柜已经运行：http://127.0.0.1:$port/"
    exit 0
}
$python = (Get-Command python.exe).Source
Start-Process -FilePath $python -ArgumentList @('-m', 'http.server', "$port", '--bind', '127.0.0.1') -WorkingDirectory $root -WindowStyle Hidden
Write-Output "书柜已启动：http://127.0.0.1:$port/"
