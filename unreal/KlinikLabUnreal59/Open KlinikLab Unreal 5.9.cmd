@echo off
setlocal
set "UE=C:\Program Files\Epic Games\UE_5.9\Engine\Binaries\Win64\UnrealEditor.exe"
start "" "%UE%" "%~dp0KlinikLabUnreal59.uproject"
