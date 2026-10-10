$ErrorActionPreference = 'Stop'
$zentroRoot = Split-Path -Parent $PSScriptRoot
$zentroDesktop = [Environment]::GetFolderPath('Desktop')
$zentroLocal = Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'Zentro'
New-Item -ItemType Directory -Path $zentroLocal -Force | Out-Null

# Embed the Android PNG at its actual size. A versioned path avoids Windows' old icon cache.
$zentroPngPath = Join-Path $zentroRoot 'Zentro.Front\public\brand\icon-192.png'
$zentroPng = [IO.File]::ReadAllBytes($zentroPngPath)
$zentroHash = (Get-FileHash -LiteralPath $zentroPngPath -Algorithm SHA256).Hash.Substring(0, 12).ToLowerInvariant()
$zentroIcon = Join-Path $zentroLocal ('zentro-' + $zentroHash + '.ico')
$zentroStream = [IO.File]::Create($zentroIcon)
$zentroWriter = [IO.BinaryWriter]::new($zentroStream)
try {
    $zentroWriter.Write([uint16]0)
    $zentroWriter.Write([uint16]1)
    $zentroWriter.Write([uint16]1)
    $zentroWriter.Write([byte]192)
    $zentroWriter.Write([byte]192)
    $zentroWriter.Write([byte]0)
    $zentroWriter.Write([byte]0)
    $zentroWriter.Write([uint16]1)
    $zentroWriter.Write([uint16]32)
    $zentroWriter.Write([uint32]$zentroPng.Length)
    $zentroWriter.Write([uint32]22)
    $zentroWriter.Write($zentroPng)
} finally {
    $zentroWriter.Dispose()
}

$zentroShell = New-Object -ComObject WScript.Shell
$zentroShortcut = $zentroShell.CreateShortcut((Join-Path $zentroDesktop 'Zentro.lnk'))
$zentroShortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
$zentroShortcut.Arguments = '"' + (Join-Path $zentroRoot 'Iniciar-Zentro.vbs') + '"'
$zentroShortcut.WorkingDirectory = $zentroRoot
$zentroShortcut.IconLocation = $zentroIcon + ',0'
$zentroShortcut.Description = 'Abre Zentro en Firefox. Cerrar su ventana apaga el front y la API.'
$zentroShortcut.Save()
Write-Output ('Acceso creado: ' + (Join-Path $zentroDesktop 'Zentro.lnk'))
