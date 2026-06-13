Option Explicit

Dim objShell, objFSO, objExec, strPath, strPort, strUrl, strOutput, q

Set objShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")

strPath = objFSO.GetParentFolderName(objFSO.GetParentFolderName(WScript.ScriptFullName))
strPort = "5174"
strUrl = "http://localhost:" & strPort & "/flow-focus/"
q = Chr(34)

Set objExec = objShell.Exec("cmd /c netstat -ano | findstr " & q & ":" & strPort & " " & q & " | findstr LISTENING")
Do While objExec.Status = 0
    WScript.Sleep 50
Loop
strOutput = objExec.StdOut.ReadAll()

If Trim(strOutput) = "" Then
    objShell.CurrentDirectory = strPath
    If Not objFSO.FolderExists(strPath & "\node_modules") Then
        objShell.Run "cmd /c npm install", 1, True
    End If
    objShell.Run "cmd /c npm run dev", 0, False
    WScript.Sleep 5000
End If

objShell.Run strUrl
