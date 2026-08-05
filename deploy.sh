#!/bin/sh
# deploy.sh — одна команда: залить весь репозиторий на сайт
# использование:  ./deploy.sh "что изменил"
set -e
MSG="${1:-update}"
git add -A
if git diff --cached --quiet; then
  echo "Нет изменений — нечего заливать."
  exit 0
fi
git commit -m "$MSG"
git push origin main
echo "Залито. Сайт обновится сам за ~1 минуту: https://kipingame-cell.github.io/site2/"
