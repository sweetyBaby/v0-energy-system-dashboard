#!/usr/bin/env bash

set -Eeuo pipefail

print_help() {
  cat <<'EOF'
Usage:
  bash deploy-company-server.sh

Optional environment variables:
  PROJECT_DIR=./
  CONFIG_FILE=./deploy-energy-dashboard.env
  IMAGE_TAR=energy-dashboard.tar
  IMAGE_NAME=energy-dashboard:latest
  CONTAINER_NAME=energy-dashboard
  HOST_PORT=3000
  CONTAINER_PORT=3000
  API_BASE_URL=http://10.10.10.17:8080
  NGINX_CONTAINER=2bff3a122fdd
  NO_NGINX_RELOAD=0
  DOCKER_BIN=docker

Examples:
  bash deploy-company-server.sh
  NGINX_CONTAINER=2bff3a122fdd bash deploy-company-server.sh
  CONFIG_FILE=./deploy-energy-dashboard.env bash deploy-company-server.sh
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  print_help
  exit 0
fi

PROJECT_DIR="${PROJECT_DIR:-./}"
CONFIG_FILE="${CONFIG_FILE:-$PROJECT_DIR/deploy-energy-dashboard.env}"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$CONFIG_FILE"
fi

IMAGE_TAR="${IMAGE_TAR:-energy-dashboard.tar}"
IMAGE_NAME="${IMAGE_NAME:-energy-dashboard:latest}"
CONTAINER_NAME="${CONTAINER_NAME:-energy-dashboard}"
HOST_PORT="${HOST_PORT:-3000}"
CONTAINER_PORT="${CONTAINER_PORT:-3000}"
API_BASE_URL="${API_BASE_URL:-http://10.10.10.17:8080}"
NGINX_CONTAINER="${NGINX_CONTAINER:-}"
NO_NGINX_RELOAD="${NO_NGINX_RELOAD:-0}"
DOCKER_BIN="${DOCKER_BIN:-docker}"
LOCK_FILE="${LOCK_FILE:-$PROJECT_DIR/deploy-energy-dashboard.lock}"
WAIT_FOR_TAR_STABLE="${WAIT_FOR_TAR_STABLE:-1}"
TAR_STABLE_CHECK_INTERVAL="${TAR_STABLE_CHECK_INTERVAL:-2}"
TAR_STABLE_CHECK_COUNT="${TAR_STABLE_CHECK_COUNT:-2}"

if [[ "$(id -u)" -eq 0 ]]; then
  SUDO_BIN=""
else
  SUDO_BIN="sudo"
fi

log() {
  printf '[%s] %s\n' "$(date '+%F %T')" "$*"
}

wait_for_tar_stable() {
  local target_file="$1"
  local stable_count=0
  local previous_size=""
  local current_size=""

  while true; do
    if [[ ! -f "$target_file" ]]; then
      echo "image tar not found: $target_file" >&2
      exit 1
    fi

    current_size="$(wc -c < "$target_file")"

    if [[ "$current_size" == "$previous_size" && "$current_size" -gt 0 ]]; then
      stable_count=$((stable_count + 1))
    else
      stable_count=0
    fi

    if [[ "$stable_count" -ge "$TAR_STABLE_CHECK_COUNT" ]]; then
      log "Tar file size is stable: $current_size bytes"
      return
    fi

    previous_size="$current_size"
    sleep "$TAR_STABLE_CHECK_INTERVAL"
  done
}

run_docker() {
  if [[ -n "$SUDO_BIN" ]]; then
    "$SUDO_BIN" "$DOCKER_BIN" "$@"
  else
    "$DOCKER_BIN" "$@"
  fi
}

detect_nginx_container() {
  local matches
  mapfile -t matches < <(run_docker ps --format '{{.ID}} {{.Names}} {{.Image}}' | grep -i 'nginx' || true)

  if [[ "${#matches[@]}" -eq 1 ]]; then
    printf '%s' "${matches[0]%% *}"
  fi
}

if ! command -v "$DOCKER_BIN" >/dev/null 2>&1; then
  echo "docker command not found: $DOCKER_BIN" >&2
  exit 1
fi

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "project directory does not exist: $PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "Another deployment is already running. Skip this execution."
  exit 0
fi

if [[ ! -f "$IMAGE_TAR" ]]; then
  echo "image tar not found: $PROJECT_DIR/$IMAGE_TAR" >&2
  exit 1
fi

if [[ "$WAIT_FOR_TAR_STABLE" == "1" ]]; then
  log "Waiting for tar upload to finish"
  wait_for_tar_stable "$IMAGE_TAR"
fi

log "Loading image from $PROJECT_DIR/$IMAGE_TAR"
run_docker load -i "$IMAGE_TAR"

if run_docker ps -a --format '{{.Names}}' | grep -Fxq "$CONTAINER_NAME"; then
  log "Stopping old container: $CONTAINER_NAME"
  run_docker stop "$CONTAINER_NAME" >/dev/null || true

  log "Removing old container: $CONTAINER_NAME"
  run_docker rm "$CONTAINER_NAME" >/dev/null || true
fi

log "Starting container: $CONTAINER_NAME"
run_docker run -d \
  --name "$CONTAINER_NAME" \
  -p "${HOST_PORT}:${CONTAINER_PORT}" \
  -e "API_BASE_URL=${API_BASE_URL}" \
  --restart unless-stopped \
  "$IMAGE_NAME" >/dev/null

log "Container is running"
run_docker ps --filter "name=^/${CONTAINER_NAME}$" --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'

log "API_BASE_URL inside container"
run_docker inspect "$CONTAINER_NAME" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep '^API_BASE_URL=' || true

log "Recent container logs"
run_docker logs --tail 30 "$CONTAINER_NAME" || true

if [[ "$NO_NGINX_RELOAD" == "1" ]]; then
  log "Skipping nginx reload because NO_NGINX_RELOAD=1"
  exit 0
fi

if [[ -z "$NGINX_CONTAINER" ]]; then
  NGINX_CONTAINER="$(detect_nginx_container)"
fi

if [[ -z "$NGINX_CONTAINER" ]]; then
  log "No nginx container detected automatically. Skip reload. Set NGINX_CONTAINER to enable reload."
  exit 0
fi

log "Checking nginx config in container: $NGINX_CONTAINER"
run_docker exec "$NGINX_CONTAINER" nginx -t

log "Reloading nginx in container: $NGINX_CONTAINER"
run_docker exec "$NGINX_CONTAINER" nginx -s reload

log "Deployment completed"
