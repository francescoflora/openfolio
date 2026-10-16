# OpenFolio - Registrazione Associazione File e Icona Documento in Windows
# Questo script registra le estensioni .ofp (default) e .openfolio (legacy) in Windows Explorer con l'icona personalizzata del documento.

param (
    [string]$IconPath = "$PSScriptRoot\..\src-tauri\icons\document.ico",
    [string]$ExePath = "$PSScriptRoot\..\src-tauri\target\debug\openfolio.exe"
)

$IconFullPath = [System.IO.Path]::GetFullPath($IconPath)
$ExeFullPath = [System.IO.Path]::GetFullPath($ExePath)

Write-Host "Registrazione associazione file .ofp e .openfolio in corso..." -ForegroundColor Cyan
Write-Host "Icona documento: $IconFullPath" -ForegroundColor Gray

# 1. Registra l'estensione predefinita .ofp (OpenFolio Project)
New-Item -Path "HKCU:\Software\Classes\.ofp" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\.ofp" -Name "(Default)" -Value "OpenFolio.Project"
Set-ItemProperty -Path "HKCU:\Software\Classes\.ofp" -Name "Content Type" -Value "application/x-openfolio"

# 2. Registra l'estensione legacy .openfolio per retrocompatibilità
New-Item -Path "HKCU:\Software\Classes\.openfolio" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\.openfolio" -Name "(Default)" -Value "OpenFolio.Project"
Set-ItemProperty -Path "HKCU:\Software\Classes\.openfolio" -Name "Content Type" -Value "application/x-openfolio"

# 3. Registra il ProgID OpenFolio.Project
New-Item -Path "HKCU:\Software\Classes\OpenFolio.Project" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Classes\OpenFolio.Project" -Name "(Default)" -Value "Progetto OpenFolio (OpenFolio Project)"

# 4. Associa l'icona dedicata del documento
if (Test-Path $IconFullPath) {
    New-Item -Path "HKCU:\Software\Classes\OpenFolio.Project\DefaultIcon" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Classes\OpenFolio.Project\DefaultIcon" -Name "(Default)" -Value "`"$IconFullPath`",0"
    New-Item -Path "HKCU:\Software\Classes\.ofp\DefaultIcon" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Classes\.ofp\DefaultIcon" -Name "(Default)" -Value "`"$IconFullPath`",0"
    New-Item -Path "HKCU:\Software\Classes\.openfolio\DefaultIcon" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Classes\.openfolio\DefaultIcon" -Name "(Default)" -Value "`"$IconFullPath`",0"
    Write-Host "Icona documento registrata con successo!" -ForegroundColor Green
} else {
    Write-Warning "File icona non trovato in $IconFullPath"
}

# 5. Associa il comando di apertura (se l'eseguibile esiste)
if (Test-Path $ExeFullPath) {
    New-Item -Path "HKCU:\Software\Classes\OpenFolio.Project\shell\open\command" -Force | Out-Null
    Set-ItemProperty -Path "HKCU:\Software\Classes\OpenFolio.Project\shell\open\command" -Name "(Default)" -Value "`"$ExeFullPath`" `"%1`""
    Write-Host "Comando di apertura associato a $ExeFullPath" -ForegroundColor Green
}

# 5. Forza l'aggiornamento della cache icone di Windows Explorer
$code = @"
using System;
using System.Runtime.InteropServices;
public class Shell {
    [DllImport("shell32.dll")]
    public static extern void SHChangeNotify(int wEventId, uint uFlags, IntPtr dwItem1, IntPtr dwItem2);
}
"@
Add-Type -TypeDefinition $code -ErrorAction SilentlyContinue
[Shell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)

Write-Host "Completato! I file .openfolio in Windows Explorer mostrano ora l'icona dedicata." -ForegroundColor Cyan
