#!/usr/bin/env bash
# Runs every migration twice (must be re-runnable) on a plain Postgres with a
# Supabase stand-in, then the security/sync scenarios in supabase/tests.
# Usage: DATABASE_URL=postgres://postgres@localhost:5432/postgres scripts/test-db.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL=(psql "${DATABASE_URL:?set DATABASE_URL}" -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -c "drop database if exists twogether_test" -c "create database twogether_test"
DB="${DATABASE_URL%/*}/twogether_test"
run() { psql "$DB" -q -v ON_ERROR_STOP=1 -f "$1"; }
run supabase/tests/00_supabase_stub.sql
# 0010 needs pg_net/pg_cron, which the stub provides as plain schemas.
sed '/create extension if not exists pg_\(net\|cron\);/d' supabase/migrations/0010_push_triggers.sql > /tmp/0010.sql
for round in 1 2; do
  run supabase/migrations/all_in_one.sql
  run /tmp/0010.sql
done
out=$(psql "$DB" -q -v ON_ERROR_STOP=1 -f supabase/tests/10_scenarios.sql 2>&1) || { echo "$out"; exit 1; }
echo "$out" | grep -oE "PASS[^(]*" | sed 's/^/  ✓ /'
if echo "$out" | grep -q FAIL; then echo "$out"; exit 1; fi
echo "database ok"
