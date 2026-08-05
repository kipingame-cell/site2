@echo off
rem deploy.bat — одна команда: залить весь репозиторий на сайт
rem использование:  deploy.bat "что изменил"
set MSG=%*
if "%MSG%"=="" set MSG=update
git add -A
git diff --cached --quiet && (echo Нет изменений — нечего заливать. ^& exit /b 0)
git commit -m "%MSG%"
git push origin main
echo Залито. Сайт обновится сам за ~1 минуту: https://kipingame-cell.github.io/site2/
