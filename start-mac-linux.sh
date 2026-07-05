#!/usr/bin/env bash
cd "$(dirname "$0")"
if [ ! -d client/dist ]; then echo "Building app for first run..."; npm run setup; fi
echo "Starting Tradezilla journal on http://localhost:3001"
node server/index.js
