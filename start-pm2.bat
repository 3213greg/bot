@echo off
cd /d "%~dp0"
pm2 start bot.js --name discord-bot
pm2 save
echo Bot uruchomiony przez PM2!
pause
