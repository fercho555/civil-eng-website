@echo off
setlocal enabledelayedexpansion

set BASE_URL=http://localhost:5000
set USERNAME=test_user123
set PASSWORD=TestPass456
set NEWPASSWORD=NewPass789

:: Helper to check HTTP status from curl response headers
:: Extracts HTTP code number from headers saved in a temp file
set TMP_HEADERS=tmp_headers.txt

:: Signup step - skip if user exists
echo === Signup ===
curl -s -w "%%{http_code}" -X POST %BASE_URL%/auth/signup -H "Content-Type: application/json" -d "{\"username\":\"%USERNAME%\",\"password\":\"%PASSWORD%\"}" -o signup_response.json -D %TMP_HEADERS%
for /f "tokens=2" %%a in ('findstr /ri "^HTTP/" %TMP_HEADERS%') do set HTTP_CODE=%%a
set /p SIGNUP_MSG=<signup_response.json

echo HTTP Code: %HTTP_CODE%
echo Response: !SIGNUP_MSG!
echo.

if %HTTP_CODE% equ 409 (
  echo User already exists, skipping signup.
) else if %HTTP_CODE% neq 201 (
  echo Signup failed or unexpected response. Aborting.
  goto end
) else (
  echo User created successfully.
)

:: Login step - get tokens
echo === Login ===
curl -s -w "%%{http_code}" -X POST %BASE_URL%/auth/login -H "Content-Type: application/json" -d "{\"username\":\"%USERNAME%\",\"password\":\"%PASSWORD%\"}" -o login_response.json -D %TMP_HEADERS%
for /f "tokens=2" %%a in ('findstr /ri "^HTTP/" %TMP_HEADERS%') do set HTTP_CODE=%%a
echo HTTP Code: %HTTP_CODE%
type login_response.json
echo.

if %HTTP_CODE% neq 200 (
  echo Login failed with status %HTTP_CODE%. Aborting.
  goto end
)

for /f "usebackq tokens=*" %%a in (`powershell -Command "((Get-Content -Raw 'login_response.json' | ConvertFrom-Json).accessToken).ToString()"`) do set ACCESS_TOKEN=%%a
for /f "usebackq tokens=*" %%a in (`powershell -Command "((Get-Content -Raw 'login_response.json' | ConvertFrom-Json).refreshToken).ToString()"`) do set REFRESH_TOKEN=%%a

echo Access Token extracted length: !ACCESS_TOKEN:~0,10!...
echo Refresh Token extracted length: !REFRESH_TOKEN:~0,10!...
echo.

if "!ACCESS_TOKEN!"=="" (
  echo ERROR: Access token is empty. Aborting.
  goto end
)
if "!REFRESH_TOKEN!"=="" (
  echo ERROR: Refresh token is empty. Aborting.
  goto end
)

:: Refresh token - get new tokens
echo === Refresh Token ===
curl -s -w "%%{http_code}" -X POST %BASE_URL%/auth/refresh-token -H "Content-Type: application/json" -d "{\"token\":\"!REFRESH_TOKEN!\"}" -o refresh_response.json -D %TMP_HEADERS%
for /f "tokens=2" %%a in ('findstr /ri "^HTTP/" %TMP_HEADERS%') do set HTTP_CODE=%%a
echo HTTP Code: %HTTP_CODE%
type refresh_response.json
echo.

if %HTTP_CODE% neq 200 (
  echo Refresh token failed with status %HTTP_CODE%. Aborting.
  goto end
)

for /f "usebackq tokens=*" %%a in (`powershell -Command "((Get-Content -Raw 'refresh_response.json' | ConvertFrom-Json).accessToken).ToString()"`) do set ACCESS_TOKEN=%%a
for /f "usebackq tokens=*" %%a in (`powershell -Command "((Get-Content -Raw 'refresh_response.json' | ConvertFrom-Json).refreshToken).ToString()"`) do set REFRESH_TOKEN=%%a

echo New Access Token extracted length: !ACCESS_TOKEN:~0,10!...
echo New Refresh Token extracted length: !REFRESH_TOKEN:~0,10!...
echo.

if "!ACCESS_TOKEN!"=="" (
  echo ERROR: New access token is empty. Aborting.
  goto end
)
if "!REFRESH_TOKEN!"=="" (
  echo ERROR: New refresh token is empty. Aborting.
  goto end
)

:: Change Password using bearer access token
echo === Change Password ===
echo Sending Authorization header with access token: !ACCESS_TOKEN:~0,10!...
curl -s -w "%%{http_code}" -X PUT %BASE_URL%/auth/change-password -H "Authorization: Bearer !ACCESS_TOKEN!" -H "Content-Type: application/json" -d "{\"currentPassword\":\"%PASSWORD%\",\"newPassword\":\"%NEWPASSWORD%\"}" -o change_password_response.json -D %TMP_HEADERS%
for /f "tokens=2" %%a in ('findstr /ri "^HTTP/" %TMP_HEADERS%') do set HTTP_CODE=%%a
echo HTTP Code: %HTTP_CODE%
type change_password_response.json
echo.

if %HTTP_CODE% neq 200 (
  echo Change password failed with status %HTTP_CODE%. Aborting.
  goto end
)

:: Logout with refresh token
echo === Logout ===
echo Sending refresh token: !REFRESH_TOKEN:~0,10!...
curl -s -w "%%{http_code}" -X POST %BASE_URL%/auth/logout -H "Content-Type: application/json" -d "{\"token\":\"!REFRESH_TOKEN!\"}" -o logout_response.json -D %TMP_HEADERS%
for /f "tokens=2" %%a in ('findstr /ri "^HTTP/" %TMP_HEADERS%') do set HTTP_CODE=%%a
echo HTTP Code: %HTTP_CODE%
type logout_response.json
echo.

if %HTTP_CODE% neq 204 if %HTTP_CODE% neq 200 (
  echo Logout failed with status %HTTP_CODE%. Aborting.
  goto end
)

:end
del signup_response.json 2>nul
del login_response.json 2>nul
del refresh_response.json 2>nul
del change_password_response.json 2>nul
del logout_response.json 2>nul
del %TMP_HEADERS% 2>nul

pause
