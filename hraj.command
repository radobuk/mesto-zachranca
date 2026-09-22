#!/bin/bash
# Dvojklikom v Finderi spustí hru v prehliadači.
cd "$(dirname "$0")" || exit 1

PORT=8123
while lsof -i :$PORT >/dev/null 2>&1; do PORT=$((PORT + 1)); done

python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT INT TERM

sleep 1
URL="http://localhost:$PORT/index.html"

# najprv Chrome (najspoľahlivejší), inak predvolený prehliadač
if [ -d "/Applications/Google Chrome.app" ]; then
  open -a "Google Chrome" "$URL"
else
  open "$URL"
fi

echo ""
echo "  🕷  SPIDER-MAN: ZÁCHRANCA MESTA"
echo "  ------------------------------------"
echo "  Hra beží na: $URL"
echo ""
echo "  Toto okno NECHAJ OTVORENÉ, kým hráš."
echo "  Ukončíš ho klávesou Ctrl+C alebo zatvorením okna."
echo ""
wait $SRV
