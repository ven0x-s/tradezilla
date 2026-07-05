#!/bin/sh
# One-shot setup: fetches the GHCR compose file and starts Tradezilla.
# Safe to re-run - it only creates missing folders and never touches
# existing trade/screenshot data.
set -e

TARGET_DIR="${1:-$HOME/tradezilla}"
COMPOSE_URL="https://raw.githubusercontent.com/ven0x-s/tradezilla/main/docker-compose.ghcr.yml"

mkdir -p "$TARGET_DIR/data/trades" "$TARGET_DIR/data/uploads"
cd "$TARGET_DIR"

curl -fsSL -o docker-compose.ghcr.yml "$COMPOSE_URL"

docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d

echo "Tradezilla is running on port 9088. Open http://<nas-ip>:9088 in your browser."
