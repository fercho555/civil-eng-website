@echo off
setlocal enabledelayedexpansion

REM Step 1: Login and capture JSON response
for /f "delims=" %%i in ('
  curl -s -X POST http://localhost:5000/auth/login -H "Content-Type: application/json" -d "{\"username\":\"temp_acc\",\"password\":\"temp4321\"}"
') do set "response=%%i"

echo Response: !response!

REM Step 2: Extract token from JSON response carefully with PowerShell, force output as raw string
for /f "delims=" %%a in ('
  powershell -NoProfile -Command ^
  "ConvertFrom-Json \"!response!\" | Select-Object -ExpandProperty token | Out-String"
') do (
  set "accessToken=%%a"
)

REM Step 3: Remove carriage return and line feed characters from token
setlocal enabledelayedexpansion
set "accessToken=!accessToken:$`r=!"
set "accessToken=!accessToken:$`n=!"
endlocal & set "accessToken=%accessToken%"

REM Step 4: Display token in hexadecimal for debugging (optional)
echo Token in hex:
for /f "tokens=1 delims=" %%b in ('echo !accessToken! ^| xxd -ps') do echo %%b

REM Step 5: Call protected API
echo Used token: !accessToken!
curl -v -s http://localhost:5000/api/user/profile -H "Authorization: Bearer !accessToken!"

pause
