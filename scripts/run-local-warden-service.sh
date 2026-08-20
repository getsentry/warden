#!/usr/bin/env bash
# Bootstrap a local Warden Service: Postgres, migrate, tenant, ingest token, HTTP server.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT=8787
HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_CONTAINER=warden-pg
POSTGRES_IMAGE=postgres:16
POSTGRES_DB=warden
POSTGRES_USER=postgres
POSTGRES_PASSWORD=warden
POSTGRES_HOST=127.0.0.1
TENANT_SLUG=local
TENANT_NAME=Local
TOKEN_NAME=ingest
ENV_FILE="$ROOT/apps/warden-service/.env.local"
SKIP_BUILD=0
SKIP_DOCKER=0
NO_START=0
RESET_POSTGRES=0
ROTATE_TOKEN=0
DATABASE_URL_OVERRIDE=""

usage() {
  cat <<'EOF'
Usage: scripts/run-local-warden-service.sh [options]

Starts local Postgres (Docker), migrates, creates a tenant and ingest token,
then runs the self-hosted Warden Service.

Options:
  --port <n>                  HTTP port (default: 8787)
  --host <addr>               HTTP bind address (default: 127.0.0.1)
  --postgres-port <n>         Host port mapped to Postgres 5432 (default: 5432)
  --postgres-host <host>      Postgres host (default: 127.0.0.1)
  --postgres-container <name> Docker container name (default: warden-pg)
  --postgres-image <image>    Docker image (default: postgres:16)
  --postgres-db <name>        Database name (default: warden)
  --postgres-user <user>      Database user (default: postgres)
  --postgres-password <pw>    Database password (default: warden)
  --database-url <url>        Use this DATABASE_URL instead of building one
  --tenant-slug <slug>        Tenant slug (default: local)
  --tenant-name <name>        Tenant name (default: Local)
  --token-name <name>         Ingest token name (default: ingest)
  --env-file <path>           Where to persist local env (default: apps/warden-service/.env.local)
  --skip-docker               Do not start Docker; require a reachable Postgres
  --skip-build                Skip pnpm build (use existing dist/)
  --reset-postgres            Remove and recreate the Docker container
  --rotate-token              Always create a new ingest token
  --no-start                  Bootstrap only; do not start the HTTP server
  -h, --help                  Show this help

The CLI does not load .env files. This script exports what it needs, and
writes the same values to --env-file (gitignored) for later shells:

  set -a && source apps/warden-service/.env.local && set +a
EOF
}

log() {
  printf '%s\n' "$*" >&2
}

die() {
  log "error: $*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

is_number() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

port_in_use() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="${2:?--port requires a value}"
      shift 2
      ;;
    --host)
      HOST="${2:?--host requires a value}"
      shift 2
      ;;
    --postgres-port)
      POSTGRES_PORT="${2:?--postgres-port requires a value}"
      shift 2
      ;;
    --postgres-host)
      POSTGRES_HOST="${2:?--postgres-host requires a value}"
      shift 2
      ;;
    --postgres-container)
      POSTGRES_CONTAINER="${2:?--postgres-container requires a value}"
      shift 2
      ;;
    --postgres-image)
      POSTGRES_IMAGE="${2:?--postgres-image requires a value}"
      shift 2
      ;;
    --postgres-db)
      POSTGRES_DB="${2:?--postgres-db requires a value}"
      shift 2
      ;;
    --postgres-user)
      POSTGRES_USER="${2:?--postgres-user requires a value}"
      shift 2
      ;;
    --postgres-password)
      POSTGRES_PASSWORD="${2:?--postgres-password requires a value}"
      shift 2
      ;;
    --database-url)
      DATABASE_URL_OVERRIDE="${2:?--database-url requires a value}"
      shift 2
      ;;
    --tenant-slug)
      TENANT_SLUG="${2:?--tenant-slug requires a value}"
      shift 2
      ;;
    --tenant-name)
      TENANT_NAME="${2:?--tenant-name requires a value}"
      shift 2
      ;;
    --token-name)
      TOKEN_NAME="${2:?--token-name requires a value}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:?--env-file requires a value}"
      shift 2
      ;;
    --skip-docker)
      SKIP_DOCKER=1
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --reset-postgres)
      RESET_POSTGRES=1
      shift
      ;;
    --rotate-token)
      ROTATE_TOKEN=1
      shift
      ;;
    --no-start)
      NO_START=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die "unknown option: $1"
      ;;
  esac
done

is_number "$PORT" || die "--port must be an integer"
is_number "$POSTGRES_PORT" || die "--postgres-port must be an integer"

require_cmd pnpm
require_cmd openssl

if [[ -n "$DATABASE_URL_OVERRIDE" ]]; then
  DATABASE_URL="$DATABASE_URL_OVERRIDE"
else
  DATABASE_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"
fi

load_existing_env() {
  local key="$1"
  local file="$2"
  [[ -f "$file" ]] || return 0
  local line
  line="$(grep -E "^${key}=" "$file" | tail -1 || true)"
  [[ -n "$line" ]] || return 0
  printf '%s\n' "${line#*=}"
}

EXISTING_SESSION_SECRET="$(load_existing_env WARDEN_SERVICE_SESSION_SECRET "$ENV_FILE")"
EXISTING_CRON_SECRET="$(load_existing_env CRON_SECRET "$ENV_FILE")"
EXISTING_TOKEN="$(load_existing_env WARDEN_SERVICE_TOKEN "$ENV_FILE")"

if [[ ${#EXISTING_SESSION_SECRET} -ge 32 ]]; then
  WARDEN_SERVICE_SESSION_SECRET="$EXISTING_SESSION_SECRET"
else
  WARDEN_SERVICE_SESSION_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
fi
if [[ ${#EXISTING_CRON_SECRET} -ge 16 ]]; then
  CRON_SECRET="$EXISTING_CRON_SECRET"
else
  CRON_SECRET="$(openssl rand -base64 24 | tr -d '\n')"
fi

container_exists() {
  docker inspect "$POSTGRES_CONTAINER" >/dev/null 2>&1
}

container_running() {
  [[ "$(docker inspect -f '{{.State.Running}}' "$POSTGRES_CONTAINER" 2>/dev/null || true)" == "true" ]]
}

wait_for_port() {
  local host="$1" port="$2" label="$3"
  local attempts=0
  while ! (echo >/dev/tcp/"$host"/"$port") >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    [[ "$attempts" -lt 60 ]] || die "${label} is not reachable at ${host}:${port}"
    sleep 0.5
  done
}

wait_for_postgres() {
  if [[ "$SKIP_DOCKER" -eq 0 ]]; then
    local attempts=0
    until docker exec "$POSTGRES_CONTAINER" pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
      attempts=$((attempts + 1))
      [[ "$attempts" -lt 60 ]] || die "Postgres did not become ready in ${POSTGRES_CONTAINER}"
      sleep 0.5
    done
    return
  fi
  if [[ -n "$DATABASE_URL_OVERRIDE" ]]; then
    log "Using provided DATABASE_URL; not waiting on ${POSTGRES_HOST}:${POSTGRES_PORT}"
    return
  fi
  wait_for_port "$POSTGRES_HOST" "$POSTGRES_PORT" Postgres
}

ensure_postgres() {
  if [[ "$SKIP_DOCKER" -eq 1 ]]; then
    log "Skipping Docker; using ${DATABASE_URL}"
    wait_for_postgres
    return
  fi
  require_cmd docker
  docker info >/dev/null 2>&1 || die "Docker is not running"
  if [[ "$RESET_POSTGRES" -eq 1 ]] && container_exists; then
    log "Removing Postgres container ${POSTGRES_CONTAINER}"
    docker rm -f "$POSTGRES_CONTAINER" >/dev/null
  fi
  if container_running; then
    log "Reusing running Postgres container ${POSTGRES_CONTAINER}"
  elif container_exists; then
    log "Starting existing Postgres container ${POSTGRES_CONTAINER}"
    docker start "$POSTGRES_CONTAINER" >/dev/null
  else
    log "Starting Postgres ${POSTGRES_IMAGE} on host port ${POSTGRES_PORT}"
    docker run -d \
      --name "$POSTGRES_CONTAINER" \
      -p "${POSTGRES_PORT}:5432" \
      -e "POSTGRES_DB=${POSTGRES_DB}" \
      -e "POSTGRES_USER=${POSTGRES_USER}" \
      -e "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}" \
      "$POSTGRES_IMAGE" >/dev/null
  fi
  wait_for_postgres
}

cli() {
  pnpm --filter @sentry/warden-service cli "$@"
}

ensure_postgres

export DATABASE_URL
export WARDEN_SERVICE_DATABASE_DRIVER=postgres
export WARDEN_SERVICE_SESSION_SECRET
export CRON_SECRET
export DISABLE_AUTH=true
export PORT
export HOST

if [[ "$SKIP_BUILD" -eq 1 ]]; then
  log "Skipping build"
else
  log "Building @sentry/warden-service workspace packages"
  pnpm --filter @sentry/warden-service... build
fi

log "Migrating database"
cli db migrate
cli db status >/dev/null

log "Ensuring tenant ${TENANT_SLUG}"
TENANT_OUTPUT="$(cli tenant create --slug "$TENANT_SLUG" --name "$TENANT_NAME")"
WARDEN_SERVICE_TENANT_ID="$(printf '%s\n' "$TENANT_OUTPUT" | tail -1 | tr -d '[:space:]')"
[[ "$WARDEN_SERVICE_TENANT_ID" =~ ^[0-9a-fA-F-]{36}$ ]] || die "tenant create did not return a UUID:\n${TENANT_OUTPUT}"
export WARDEN_SERVICE_TENANT_ID

if [[ "$ROTATE_TOKEN" -eq 0 && "$EXISTING_TOKEN" == wds_* ]]; then
  WARDEN_SERVICE_TOKEN="$EXISTING_TOKEN"
  log "Reusing ingest token from ${ENV_FILE}"
else
  log "Creating ingest+read token ${TOKEN_NAME}"
  TOKEN_OUTPUT="$(cli token create --tenant "$WARDEN_SERVICE_TENANT_ID" --name "$TOKEN_NAME" --role ingest --role read)"
  WARDEN_SERVICE_TOKEN="$(printf '%s\n' "$TOKEN_OUTPUT" | tail -1 | tr -d '[:space:]')"
  [[ "$WARDEN_SERVICE_TOKEN" == wds_* ]] || die "token create did not return a token:\n${TOKEN_OUTPUT}"
fi
export WARDEN_SERVICE_TOKEN
export WARDEN_SERVICE_URL="http://${HOST}:${PORT}"

mkdir -p "$(dirname "$ENV_FILE")"
cat > "$ENV_FILE" <<EOF
DATABASE_URL=${DATABASE_URL}
WARDEN_SERVICE_DATABASE_DRIVER=postgres
WARDEN_SERVICE_SESSION_SECRET=${WARDEN_SERVICE_SESSION_SECRET}
CRON_SECRET=${CRON_SECRET}
DISABLE_AUTH=true
WARDEN_SERVICE_TENANT_ID=${WARDEN_SERVICE_TENANT_ID}
PORT=${PORT}
HOST=${HOST}
WARDEN_SERVICE_URL=${WARDEN_SERVICE_URL}
WARDEN_SERVICE_TOKEN=${WARDEN_SERVICE_TOKEN}
EOF

log ""
log "Local Warden Service is ready."
log "  URL:    ${WARDEN_SERVICE_URL}"
log "  Tenant: ${WARDEN_SERVICE_TENANT_ID}"
log "  Env:    ${ENV_FILE}"
log "  Token:  ${WARDEN_SERVICE_TOKEN}"
log ""
log "In another shell:"
log "  set -a && source ${ENV_FILE} && set +a"
log "  curl -s \"\$WARDEN_SERVICE_URL/ready\""
log ""

if [[ "$NO_START" -eq 1 ]]; then
  log "Skipping server start (--no-start)."
  exit 0
fi

if port_in_use "$PORT"; then
  die "port ${PORT} is already in use. Pass --port to pick a free one (localhost:3000 is a WebSocket relay on this machine)."
fi

log "Starting self-hosted server on ${HOST}:${PORT}"
exec pnpm exec tsx apps/warden-service/examples/self-hosted/server.ts
