; OpenFolio NSIS Installer Hooks
; Aggancio automatico dell'icona documento (.openfolio) durante l'installazione in Windows

!macro NSIS_HOOK_POSTINSTALL
  ; Individua il percorso di document.ico ($INSTDIR o $INSTDIR\resources)
  StrCpy $0 "$INSTDIR\document.ico"
  IfFileExists "$0" has_doc_icon 0
  StrCpy $0 "$INSTDIR\resources\document.ico"
  IfFileExists "$0" has_doc_icon 0
  StrCpy $0 "$INSTDIR\icons\document.ico"
  IfFileExists "$0" has_doc_icon 0
  ; Fallback all'icona principale dell'applicazione se document.ico non fosse trovato
  StrCpy $0 "$INSTDIR\OpenFolio.exe"

has_doc_icon:
  ; Registra DefaultIcon per ProgID e classi file in HKCU (Current User) e HKCR (Classes Root)
  WriteRegStr HKCU "Software\Classes\OpenFolio Document\DefaultIcon" "" '"$0",0'
  WriteRegStr HKCU "Software\Classes\.openfolio\DefaultIcon" "" '"$0",0'
  WriteRegStr HKCR "OpenFolio Document\DefaultIcon" "" '"$0",0'
  WriteRegStr HKCR ".openfolio\DefaultIcon" "" '"$0",0'

  ; Registra associazione con comando open se non impostata
  WriteRegStr HKCU "Software\Classes\OpenFolio Document\shell\open\command" "" '"$INSTDIR\OpenFolio.exe" "%1"'
  WriteRegStr HKCR "OpenFolio Document\shell\open\command" "" '"$INSTDIR\OpenFolio.exe" "%1"'

  ; Retrocompatibilita per file legacy .scriptforge
  WriteRegStr HKCU "Software\Classes\ScriptForge Legacy Document\DefaultIcon" "" '"$0",0'
  WriteRegStr HKCR "ScriptForge Legacy Document\DefaultIcon" "" '"$0",0'

  ; Salva la lingua scelta durante l'installazione (1040 = Italiano, altrimenti English)
  StrCpy $2 "en"
  StrCmp $LANGUAGE "1040" 0 +2
  StrCpy $2 "it"
  FileOpen $1 "$INSTDIR\lang.txt" w
  FileWrite $1 "$2"
  FileClose $1

  ; Notifica Windows Explorer per ricaricare istantaneamente la cache delle icone
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Pulizia completa delle chiavi di registro alla disinstallazione
  Delete "$INSTDIR\lang.txt"
  DeleteRegKey HKCU "Software\Classes\OpenFolio Document"
  DeleteRegKey HKCU "Software\Classes\.openfolio"
  DeleteRegKey HKCR "OpenFolio Document"
  DeleteRegKey HKCR ".openfolio"
  DeleteRegKey HKCU "Software\Classes\ScriptForge Legacy Document"
  DeleteRegKey HKCR "ScriptForge Legacy Document"
  System::Call 'shell32.dll::SHChangeNotify(i 0x08000000, i 0, i 0, i 0)'
!macroend
