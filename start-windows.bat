@echo off
cd /d "%~dp0"
if not exist client\dist ( echo Building app for first run... && call npm run setup )
echo Starting Tradezilla journal on http://localhost:3001
start "" http://localhost:3001
node server/index.js
