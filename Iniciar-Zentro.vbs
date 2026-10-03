Option Explicit
Dim shell, filesystem, root, node, result, message, errorFile, errorText
Set shell = CreateObject("WScript.Shell")
Set filesystem = CreateObject("Scripting.FileSystemObject")
root = filesystem.GetParentFolderName(WScript.ScriptFullName)
node = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
If Not filesystem.FileExists(node) Then
  MsgBox "No se encuentra Node.js. Instala Node.js 24 para iniciar Zentro.", vbExclamation, "Zentro"
  WScript.Quit 1
End If
shell.CurrentDirectory = root
result = shell.Run(Chr(34) & node & Chr(34) & " " & Chr(34) & root & "\scripts\desktop.mjs" & Chr(34), 0, True)
If result <> 0 Then
  message = "No se pudo iniciar Zentro."
  errorFile = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\Zentro\desktop-error.txt"
  If filesystem.FileExists(errorFile) Then
    Set errorText = CreateObject("ADODB.Stream")
    errorText.Type = 2
    errorText.Charset = "utf-8"
    errorText.Open
    errorText.LoadFromFile errorFile
    message = message & vbCrLf & errorText.ReadText
    errorText.Close
  End If
  MsgBox message, vbExclamation, "Zentro"
End If
