@echo off
title Subir PrevineSUS para a Vercel
echo ========================================================
echo        Subir PrevineSUS para a Nuvem Vercel
echo ========================================================
echo.
echo Este script vai publicar o aplicativo diretamente na sua conta da Vercel.
echo.

set "PATH=C:\Users\Peels\AppData\Local\Programs\nodejs;%PATH%"

cd /d "%~dp0"

echo [1/2] Conectando com a Vercel...
echo Se for a primeira vez, o terminal vai pedir para voce confirmar o login no navegador.
echo Nas perguntas que aparecerem, basta apertar ENTER para aceitar os valores padrao.
echo.

call npx --yes vercel --prod

echo.
echo ========================================================
echo  Publicacao concluida! O link oficial esta exibido acima!
echo ========================================================
echo.
pause
