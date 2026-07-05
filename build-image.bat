@echo off
cd /d "%~dp0"
echo Building tradezilla:latest ...
docker build -t tradezilla:latest . || goto :err
echo Saving to tradezilla-image.tar ...
docker save tradezilla:latest -o tradezilla-image.tar || goto :err
echo Done. Import tradezilla-image.tar on your NAS.
goto :eof
:err
echo Build failed. Is Docker running?
