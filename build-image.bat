@echo off
cd /d "%~dp0"
echo Building pugzilla:latest ...
docker build -t pugzilla:latest . || goto :err
echo Saving to pugzilla-image.tar ...
docker save pugzilla:latest -o pugzilla-image.tar || goto :err
echo Done. Import pugzilla-image.tar on your NAS.
goto :eof
:err
echo Build failed. Is Docker running?
