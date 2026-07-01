$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$code = Join-Path $root ".tools\vscode\Code.exe"

if (!(Test-Path -LiteralPath $code)) {
  throw "VS Code executable was not found at $code"
}

Start-Process -FilePath $code -ArgumentList "`"$root`""
