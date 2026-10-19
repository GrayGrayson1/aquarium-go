#!/bin/zsh
# chunk 8 — check supabase/migrations against a throwaway local Postgres before it reaches the live project (no Docker
# needed, so no local Supabase): a cluster in a temporary folder on 127.0.0.1:54329, the stand-in (prelude.sql), every
# migration in order, then checks.sql as anon, two signed-in players and the owner. Needs a Postgres server binary
# (Homebrew: postgresql@16; set PG_BIN to its bin folder). Leaves nothing behind. Exit 1 when a case goes the wrong way.
set -u
HERE=${0:A:h}
ROOT=${HERE:h:h}
PG_BIN=${PG_BIN:-/opt/homebrew/opt/postgresql@16/bin}
PORT=${PG_PORT:-54329}
TMP=$(mktemp -d)
trap '"$PG_BIN/pg_ctl" -D "$TMP/db" -m immediate stop >/dev/null 2>&1; rm -rf "$TMP"' EXIT
"$PG_BIN/initdb" -D "$TMP/db" -U postgres --auth=trust >/dev/null || exit 2
"$PG_BIN/pg_ctl" -D "$TMP/db" -o "-c listen_addresses=127.0.0.1 -p $PORT -c unix_socket_directories=''" -l "$TMP/log" -w start >/dev/null || exit 2
q() { psql -h 127.0.0.1 -p $PORT -U postgres -d postgres "$@"; }
q -v ON_ERROR_STOP=1 -q -f "$HERE/prelude.sql" || exit 2
for m in "$ROOT"/supabase/migrations/*.sql; do
  q -v ON_ERROR_STOP=1 -q -f "$m" || { echo "FAIL  applying $m"; exit 1; }
done
q -f "$HERE/checks.sql" > "$TMP/out" 2>&1
python3 - "$TMP/out" <<'PY'
import re, sys
lines = open(sys.argv[1]).read().splitlines()
bad = 0
WORDS = {'ok': 'should succeed', 'err': 'should fail', 'denied': 'should be refused for want of a privilege'}
def close(want, name, errors):
    global bad
    failed = bool(errors)
    ok = (not failed) if want == 'ok' else failed and (want == 'err' or any('permission denied' in e for e in errors))
    if not ok: bad += 1
    print(f"{'PASS' if ok else 'FAIL'}  {name} ({WORDS[want]}){'' if ok or not errors else ': ' + errors[0][:120]}")
cur = None
errors = []
for l in lines:
    m = re.match(r'CASE (ok|err|denied|end) ?(\S*)', l)
    if m:
        if cur: close(*cur, errors)
        cur = None if m.group(1) == 'end' else (m.group(1), m.group(2))
        errors = []
    elif 'ERROR:' in l:
        errors.append(l.split('ERROR:', 1)[1].strip())
if cur: close(*cur, errors)
left = [l for l in lines if re.match(r'^\d+ \d+ \d+ \d+ \d+ clubs', l)]
if not left or not left[0].startswith('0 0 0 0 0 ') or not left[0].endswith(' audit 0'):
    bad += 1
    print('FAIL  leftovers:', left)
print(f"\n{'all cases as expected' if not bad else f'{bad} case(s) went the wrong way'}")
sys.exit(1 if bad else 0)
PY
