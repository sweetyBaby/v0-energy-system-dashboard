#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/ems/project}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="energy-dashboard-deploy.service"
PATH_NAME="energy-dashboard-deploy.path"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Please run this script as root or with sudo." >&2
  exit 1
fi

if [[ ! -d "$PROJECT_DIR" ]]; then
  echo "project directory does not exist: $PROJECT_DIR" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/deploy-company-server.sh" ]]; then
  echo "deploy script not found: $PROJECT_DIR/deploy-company-server.sh" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/systemd/$SERVICE_NAME" ]]; then
  echo "service unit not found: $PROJECT_DIR/systemd/$SERVICE_NAME" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_DIR/systemd/$PATH_NAME" ]]; then
  echo "path unit not found: $PROJECT_DIR/systemd/$PATH_NAME" >&2
  exit 1
fi

install -m 644 "$PROJECT_DIR/systemd/$SERVICE_NAME" "$SYSTEMD_DIR/$SERVICE_NAME"
install -m 644 "$PROJECT_DIR/systemd/$PATH_NAME" "$SYSTEMD_DIR/$PATH_NAME"

systemctl daemon-reload
systemctl enable --now "$PATH_NAME"

echo "Installed and started $PATH_NAME"
echo "Check status with:"
echo "  systemctl status $PATH_NAME"
echo "  systemctl status $SERVICE_NAME"
