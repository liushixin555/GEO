$ErrorActionPreference = 'SilentlyContinue'

$nodePatterns = @(
  'dist[\\/]apis[\\/]server\.js',
  'apis[\\/]server\.ts',
  'vite.*vite\.config\.ts',
  'with-local-env\.cjs.*(apis[\\/]server\.ts|vite\s+--config\s+vite\.config\.ts)'
)

$cmdPatterns = @(
  'cmd(\.exe)?\s+/k.*npm(\.cmd)?\s+run\s+dev:(api|page)',
  'title\s+(Backend|Frontend)\s+&&\s+npm(\.cmd)?\s+run\s+dev:(api|page)'
)

Get-CimInstance Win32_Process |
  Where-Object {
    if ($_.Name -notin @('node.exe', 'cmd.exe')) { return $false }
    $commandLine = $_.CommandLine
    if (-not $commandLine) { return $false }
    $patterns = if ($_.Name -eq 'cmd.exe') { $cmdPatterns } else { $nodePatterns }
    foreach ($pattern in $patterns) {
      if ($commandLine -match $pattern) { return $true }
    }
    return $false
  } |
  ForEach-Object {
    Stop-Process -Id $_.ProcessId -Force
  }
