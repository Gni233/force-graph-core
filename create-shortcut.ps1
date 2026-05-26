$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:USERPROFILE\Desktop\ForceGraph.lnk")
$Shortcut.TargetPath = "D:\cc\workspace\force-graph-core\启动ForceGraph.bat"
$Shortcut.WorkingDirectory = "D:\cc\workspace\force-graph-core"
$Shortcut.Save()
Write-Host "Shortcut created"
