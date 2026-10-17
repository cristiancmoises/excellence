param([string]$InstallDir = "$env:LOCALAPPDATA\Excellence\app")
$ErrorActionPreference = 'Stop'
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node -or (& node -p 'process.versions.node.split(".")[0]') -ne '24') {
    throw 'Install Node.js 24 LTS: winget install OpenJS.NodeJS.LTS. Then run this installer again.'
}
$source = $PSScriptRoot
if (-not (Test-Path "$source\dist\index.html")) { throw 'Build not found. Run npm ci and npm run build.' }
New-Item -ItemType Directory -Force -Path "$InstallDir\server", "$InstallDir\src", "$InstallDir\scripts" | Out-Null
if (([IO.Path]::GetFullPath($InstallDir)).TrimEnd('\') -ne ([IO.Path]::GetFullPath($source)).TrimEnd('\')) {
    Copy-Item "$source\dist" $InstallDir -Recurse -Force
    Copy-Item "$source\server\*.mjs" "$InstallDir\server" -Force
    Copy-Item "$source\src\shared.mjs", "$source\src\error-messages.mjs" "$InstallDir\src" -Force
    Copy-Item "$source\scripts\launch.mjs", "$source\scripts\backup.mjs" "$InstallDir\scripts" -Force
    Copy-Item "$source\docs" $InstallDir -Recurse -Force
    Copy-Item "$source\LICENSE", "$source\THIRD_PARTY_NOTICES.txt" $InstallDir -Force
}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Excellence.lnk")
$shortcut.TargetPath = $node.Source
$shortcut.Arguments = '"' + $InstallDir + '\scripts\launch.mjs"'
$shortcut.WorkingDirectory = $InstallDir
$shortcut.Save()
Write-Host 'Excellence installed. Open it from the Start menu. The initial token appears in the terminal.'
