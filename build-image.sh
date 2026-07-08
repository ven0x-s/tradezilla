#!/usr/bin/env bash
# Produce an importable Docker image tar for the UGREEN NAS.
# Run this on any machine that has Docker installed (your PC/Mac).
set -e
cd "$(dirname "$0")"
IMAGE=pugzilla:latest
OUT=pugzilla-image.tar
echo "Building $IMAGE ..."
docker build -t "$IMAGE" .
echo "Saving to $OUT ..."
docker save "$IMAGE" -o "$OUT"
echo "Done. Import $OUT on your NAS (Container Manager -> Images -> Import)."
