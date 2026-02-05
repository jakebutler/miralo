#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUTPUT_DIR="$ROOT_DIR/miralo/runtime/recordings"

mkdir -p "$OUTPUT_DIR"

echo "Running deterministic clickthrough on /demo..."
node "$ROOT_DIR/miralo/scripts/record-clickthrough.mjs"
