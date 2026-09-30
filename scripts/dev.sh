#!/usr/bin/env bash
# Starts everything needed to run the web and mobile apps locally:
#
#   Docker     wrangler builds and runs apps/processor (yt-dlp + ffmpeg) as a container
#   api        wrangler dev on :8787 (local D1, migrations applied first; R2 is the real bucket)
#   web        next dev on :3000
#   mobile     expo start on :8081, in the foreground so its QR code and hotkeys work
#
# Usage: scripts/dev.sh [--no-web] [--no-mobile] [--localhost]
#   --localhost  point the mobile app at localhost (simulator/emulator) instead of this Mac's LAN IP
#
# Ctrl+C stops everything.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WEB=1
MOBILE=1
LOCALHOST=0
for arg in "$@"; do
  case "$arg" in
    --no-web) WEB=0 ;;
    --no-mobile) MOBILE=0 ;;
    --localhost) LOCALHOST=1 ;;
    -h | --help) sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $arg (try --help)" >&2; exit 1 ;;
  esac
done

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[33m! %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# --- prerequisites ---------------------------------------------------------

command -v node >/dev/null || die "node not found (need >= 24)"
[ "$(node -p 'process.versions.node.split(".")[0]')" -ge 24 ] || die "node >= 24 required, found $(node -v)"
command -v pnpm >/dev/null || die "pnpm not found (corepack enable, or npm i -g pnpm)"
command -v docker >/dev/null || die "docker not found (install Docker Desktop)"

port_free() { ! lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1; }
check_port() { port_free "$1" || die "port $1 ($2) is already in use: $(lsof -nP -iTCP:"$1" -sTCP:LISTEN | awk 'NR==2{print $1" pid "$2}')"; }
check_port 8787 api
[ "$WEB" = 1 ] && check_port 3000 web
[ "$MOBILE" = 1 ] && check_port 8081 expo

# --- Docker ----------------------------------------------------------------

if ! docker info >/dev/null 2>&1; then
  if [ "$(uname)" = Darwin ] && [ -d /Applications/Docker.app ]; then
    bold "Starting Docker Desktop…"
    open -a Docker
    for _ in $(seq 1 90); do docker info >/dev/null 2>&1 && break; sleep 2; done
    docker info >/dev/null 2>&1 || die "Docker didn't come up after 3 minutes"
  else
    die "Docker isn't running; start it and re-run"
  fi
fi
bold "✓ Docker is running"

# --- dependencies and config -----------------------------------------------

if [ ! -f node_modules/.modules.yaml ] || [ pnpm-lock.yaml -nt node_modules/.modules.yaml ]; then
  bold "Installing dependencies…"
  pnpm install
fi

if [ ! -f apps/api/.dev.vars ]; then
  cp apps/api/.dev.vars.example apps/api/.dev.vars
  warn "created apps/api/.dev.vars from the example; fill in the secrets (sign-in, LLM and uploads won't work until you do)"
fi

bold "Applying local D1 migrations…"
pnpm --filter api db:migrate:local </dev/null >/dev/null || die "D1 migrations failed (run: pnpm --filter api db:migrate:local)"
bold "✓ Database is up to date"

# --- run -------------------------------------------------------------------

# Each background service gets its own process group (job control), so Ctrl+C in the Expo UI
# only reaches Expo and cleanup can stop the whole tree of each service.
set -m
PIDS=()

cleanup() {
  trap - EXIT INT TERM
  echo
  bold "Stopping services…"
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && kill -TERM -- "-$pid" 2>/dev/null || true; done
  for pid in "${PIDS[@]:-}"; do [ -n "$pid" ] && wait "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM

# Runs a command in the background with its output prefixed by a coloured label.
start() {
  local name="$1" color="$2"
  shift 2
  (FORCE_COLOR=1 "$@" 2>&1 | awk -v p="$(printf '\033[%sm[%s]\033[0m ' "$color" "$name")" '{ print p $0; fflush() }') &
  PIDS+=($!)
}

# First run builds the processor image, which takes a few minutes.
start api 36 pnpm --filter api dev
[ "$WEB" = 1 ] && start web 35 pnpm --filter web dev

bold "Waiting for the API on :8787…"
for _ in $(seq 1 300); do
  curl -s -o /dev/null http://localhost:8787 && break
  kill -0 "${PIDS[0]}" 2>/dev/null || die "the API exited during startup (see [api] output above)"
  sleep 1
done
port_free 8787 && warn "API still isn't up after 5 minutes; carrying on" || bold "✓ API on http://localhost:8787"
[ "$WEB" = 1 ] && bold "✓ Web on http://localhost:3000"

if [ "$MOBILE" = 1 ]; then
  if [ "$LOCALHOST" = 1 ]; then
    HOST=localhost
  else
    HOST="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo localhost)"
  fi
  # Process env wins over apps/mobile/.env, so a changed LAN IP doesn't need a file edit.
  export EXPO_PUBLIC_API_URL="http://$HOST:8787"
  export EXPO_PUBLIC_WEB_URL="http://$HOST:3000"
  bold "Starting Expo (mobile → $EXPO_PUBLIC_API_URL)…"
  (cd apps/mobile && pnpm exec expo start) || true
else
  bold "Running. Ctrl+C to stop."
  wait
fi
