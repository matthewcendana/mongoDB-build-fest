#!/usr/bin/env bash
# Prove the two persistence demo beats against a running Never Cold API.
# Usage: BASE_URL=http://localhost:8000 ./scripts/demo_beats.sh

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8000}"
RESUME_PHONE="${RESUME_PHONE:-+15551000001}"
ADAPT_PHONE="${ADAPT_PHONE:-+15551000002}"

extract() {
  local expr="$1"
  python3 -c "import json,sys; d=json.load(sys.stdin); print($expr)"
}

echo "== health =="
curl -sf "$BASE_URL/health" | python3 -m json.tool

echo
echo "== BEAT 1: kill mid-form, call back, resume ($RESUME_PHONE) =="
echo "-- first call init"
INIT1=$(curl -sf -X POST "$BASE_URL/webhooks/elevenlabs/init" \
  -H "Content-Type: application/json" \
  -d "{\"caller_id\":\"$RESUME_PHONE\",\"call_sid\":\"CA_resume_1\"}")
echo "$INIT1" | extract "d['conversation_config_override']['agent']['first_message']"

echo "-- confirm clause 0, then drop"
curl -sf -X POST "$BASE_URL/tools/record_comprehension" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$RESUME_PHONE\",\"clause_id\":0,\"summary\":\"It is a yearly wellness check to build my prevention plan, not to treat a new illness today.\",\"call_sid\":\"CA_resume_1\"}" \
  | python3 -m json.tool

echo "-- checkpoint after drop"
RESUME_ENC=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$RESUME_PHONE")
STATE=$(curl -sf "$BASE_URL/debug/state/$RESUME_ENC")
echo "$STATE" | extract "'current_clause=' + str(d['values'].get('current_clause')) + ' title=' + d['current_clause_title']"

echo "-- second call init (should welcome back)"
INIT1B=$(curl -sf -X POST "$BASE_URL/webhooks/elevenlabs/init" \
  -H "Content-Type: application/json" \
  -d "{\"caller_id\":\"$RESUME_PHONE\",\"call_sid\":\"CA_resume_2\"}")
echo "$INIT1B" | extract "d['conversation_config_override']['agent']['first_message']"
echo "$INIT1B" | extract "'resume_clause=' + d['dynamic_variables']['resume_clause']"

echo
echo "== BEAT 2: same person, second call adapts ($ADAPT_PHONE) =="
curl -sf -X POST "$BASE_URL/tools/upsert_field" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$ADAPT_PHONE\",\"field\":\"name\",\"value\":\"Maria Lopez\"}" >/dev/null
curl -sf -X POST "$BASE_URL/tools/upsert_field" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$ADAPT_PHONE\",\"field\":\"email\",\"value\":\"maria@example.com\"}" >/dev/null

for clause in 0 1 2 3; do
  curl -sf -X POST "$BASE_URL/tools/record_comprehension" \
    -H "Content-Type: application/json" \
    -d "{\"phone\":\"$ADAPT_PHONE\",\"clause_id\":$clause,\"summary\":\"I understood clause $clause.\"}" >/dev/null
done

curl -sf -X POST "$BASE_URL/tools/record_consent" \
  -H "Content-Type: application/json" \
  -d "{\"phone\":\"$ADAPT_PHONE\"}" | python3 -m json.tool

echo "-- returning-caller init (should skip name/email and mention last time)"
INIT2=$(curl -sf -X POST "$BASE_URL/webhooks/elevenlabs/init" \
  -H "Content-Type: application/json" \
  -d "{\"caller_id\":\"$ADAPT_PHONE\",\"call_sid\":\"CA_adapt_2\"}")
echo "$INIT2" | extract "d['conversation_config_override']['agent']['first_message']"
echo "$INIT2" | extract "'name=' + d['dynamic_variables']['caller_name'] + ' email=' + d['dynamic_variables']['caller_email']"
echo "$INIT2" | extract "'last_session_note=' + d['dynamic_variables']['last_session_note']"

echo
echo "== audit trail =="
curl -sf "$BASE_URL/dashboard/sessions?limit=10" | python3 -m json.tool

echo
echo "Demo beats complete."
