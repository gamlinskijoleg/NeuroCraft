@echo off
echo Building Android APK locally...
echo.

pushd %~dp0

if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo Running gradlew assembleRelease...
cd android
call gradlew.bat assembleRelease

if %errorlevel% equ 0 (
    echo.
    echo Build successful!
    echo APK location: front-end\android\app\build\outputs\apk\release\app-release.apk
) else (
    echo.
    echo Build failed. Check error messages above.
    exit /b 1
)

popd
