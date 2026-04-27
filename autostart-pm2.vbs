Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c cd /d ""C:\Users\leski\Desktop\kody wszstkise\discord-bot"" && pm2 resurrect", 0, False
Set WshShell = Nothing
