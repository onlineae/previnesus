@echo off
echo ========================================================
echo   PrevineSUS - Gerador e Empacotador de APK Android
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Sincronizando assets com o projeto Android Capacitor...
call npx cap sync android

echo.
echo [2/3] Verificando ambiente Android...
if exist "android\gradlew.bat" (
    echo [OK] Projeto nativo Android localizado em .\android
) else (
    echo [ERRO] Projeto Android nao encontrado. Execute 'npx cap add android'.
    pause
    exit /b 1
)

echo.
echo [3/3] Deseja abrir no Android Studio para gerar o APK assinado ou depurado?
echo (Se o Android Studio estiver instalado, ele sera aberto agora)
echo.
call npx cap open android

echo.
echo Se preferir compilar via linha de comando com JDK instalado:
echo   cd android
echo   .\gradlew.bat assembleDebug
echo   O arquivo APK sera gerado em: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
