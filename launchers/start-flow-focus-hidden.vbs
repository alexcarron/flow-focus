Option Explicit

Dim objShell, objFSO, objExec, strPath, strHubPath, strPort, strUrl, strOutput, q

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = objFSO.GetParentFolderName(WScript.ScriptFullName)
strHubPath = objFSO.GetParentFolderName(objFSO.GetParentFolderName(strPath)) & "\hub"
strPort = "4200"
strUrl = "http://localhost:" & strPort & "/flow-focus"
q = Chr(34)

Set objExec = objShell.Exec("cmd /c netstat -ano | findstr " & q & ":" & strPort & " " & q & " | findstr LISTENING")
Do While objExec.Status = 0
    WScript.Sleep 50
Loop
strOutput = objExec.StdOut.ReadAll()

If Trim(strOutput) = "" Then
    objShell.CurrentDirectory = strHubPath
    objShell.Run "cmd /c npm start", 0, False
    WScript.Sleep 3000
End If

objShell.Run strUrl
