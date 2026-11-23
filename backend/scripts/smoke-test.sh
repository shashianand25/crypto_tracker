#!/usr/bin/env bash
# Smoke test: calls every endpoint in HANDOFF section 7 plus negative cases.
# Usage: scripts/smoke-test.sh [base-url]      (needs only bash and curl)
# It creates one harmless alert (a BTC price below $0.01 can never fire) and deletes it again.

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

# check "name" expected_status method path [json-body] [text the response must contain]
check() {
  local name="$1" want="$2" method="$3" path="$4" body="${5:-}" contains="${6:-}"
  local out code resp
  if [ -n "$body" ]; then
    out=$(curl -s -w $'\n%{http_code}' -X "$method" -H 'Content-Type: application/json' -d "$body" "$BASE$path")
  else
    out=$(curl -s -w $'\n%{http_code}' -X "$method" "$BASE$path")
  fi
  code="${out##*$'\n'}"
  resp="${out%$'\n'*}"
  LAST_BODY="$resp"
  if [ "$code" = "$want" ] && { [ -z "$contains" ] || [[ "$resp" == *"$contains"* ]]; }; then
    echo "PASS  $name ($code)"; PASS=$((PASS + 1))
  else
    echo "FAIL  $name: wanted $want${contains:+ containing '$contains'}, got $code"
    echo "      $resp" | cut -c1-200
    FAIL=$((FAIL + 1))
  fi
}

echo "Smoke test against $BASE"

# --- the six commands from HANDOFF section 7 ---
check "health"                 200 GET  /api/health "" '"status"'
check "assets"                 200 GET  /api/assets "" 'BTCUSDT'
check "latest prices"          200 GET  /api/prices/latest "" 'BTCUSDT'
check "latest price one coin"  200 GET  /api/prices/ETHUSDT/latest "" '"price"'
check "history 1m"             200 GET  "/api/prices/BTCUSDT/history?interval=1m" "" '"price"'
check "history 5m"             200 GET  "/api/prices/BTCUSDT/history?interval=5m"
check "history 1h"             200 GET  "/api/prices/BTCUSDT/history?interval=1h"
check "compare"                200 GET  "/api/compare?symbols=BTCUSDT,ETHUSDT" "" 'ETHUSDT'
check "replay"                 200 GET  /api/replay/BTCUSDT
check "alerts list"            200 GET  /api/alerts
check "triggered alerts"       200 GET  /api/alerts/triggered
check "anomalies"              200 GET  /api/anomalies
check "anomalies one symbol"   200 GET  "/api/anomalies?symbol=BTCUSDT"

# --- alert lifecycle ---
check "create alert"           201 POST /api/alerts '{"symbol":"BTCUSDT","metric":"price","condition":"below","threshold":0.01}' '"status":"ACTIVE"'
ID=$(printf '%s' "$LAST_BODY" | sed -n 's/.*"id":"\(alt_[0-9a-f]*\)".*/\1/p')
if [ -n "$ID" ]; then
  check "delete alert"         204 DELETE "/api/alerts/$ID"
  check "delete alert again"   404 DELETE "/api/alerts/$ID"
else
  echo "FAIL  could not read the new alert id"; FAIL=$((FAIL + 1))
fi

# --- negative cases ---
check "unknown symbol (latest)"   404 GET  /api/prices/XRPUSDT/latest
check "unknown symbol (history)"  404 GET  /api/prices/XRPUSDT/history
check "bad interval"              400 GET  "/api/prices/BTCUSDT/history?interval=2m"
check "bad from time"             400 GET  "/api/prices/BTCUSDT/history?from=notatime"
check "compare without symbols"   400 GET  /api/compare
check "compare unknown symbol"    404 GET  "/api/compare?symbols=BTCUSDT,XRPUSDT"
check "replay unknown symbol"     404 GET  /api/replay/XRPUSDT
check "replay range too large"    400 GET  "/api/replay/BTCUSDT?from=2026-01-01T00:00:00Z&to=2026-01-02T00:00:00Z"
check "anomalies unknown symbol"  404 GET  "/api/anomalies?symbol=XRPUSDT"
check "alert bad symbol"          400 POST /api/alerts '{"symbol":"XRPUSDT","metric":"price","condition":"above","threshold":1}'
check "alert bad metric"          400 POST /api/alerts '{"symbol":"BTCUSDT","metric":"rsi","condition":"above","threshold":1}'
check "alert bad condition"       400 POST /api/alerts '{"symbol":"BTCUSDT","metric":"price","condition":"up","threshold":1}'
check "alert threshold zero"      400 POST /api/alerts '{"symbol":"BTCUSDT","metric":"price","condition":"above","threshold":0}'
check "alert threshold text"      400 POST /api/alerts '{"symbol":"BTCUSDT","metric":"price","condition":"above","threshold":"abc"}'
check "alert broken JSON"         400 POST /api/alerts '{oops'
check "delete unknown alert"      404 DELETE /api/alerts/alt_00000000
check "unknown /api route"        404 GET  /api/nothing-here

echo
echo "Passed: $PASS   Failed: $FAIL"
[ "$FAIL" -eq 0 ]
