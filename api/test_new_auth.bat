@echo off
setlocal EnableDelayedExpansion

REM Step 1: Login and capture response
for /f "delims=" %%i in ('curl -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"temp_acc\",\"password\":\"temp4321\"}"') do (
  set response=%%i
)

echo Response: !response!

REM Step 2: Extract token using PowerShell with double quotes escaped correctly
for /f "usebackq delims=" %%a in (`powershell -Command "ConvertFrom-Json '!response!' | Select-Object -ExpandProperty token"`) do (
  set accessToken=%%a
)

REM Step 3: Remove quotes if any
set accessToken=!accessToken:"=!

echo Token extracted: !accessToken!

REM Step 4: Call API with the token
curl -s http://localhost:5000/api/user/profile -H "Authorization: Bearer !accessToken!"

pause
