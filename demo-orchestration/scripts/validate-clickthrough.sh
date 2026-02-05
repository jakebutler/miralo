#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${MIRALO_REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
OUTPUT_DIR="${MIRALO_OUTPUT_DIR:-$ROOT_DIR/demo-orchestration/runtime/recordings}"

mkdir -p "$OUTPUT_DIR"

echo "Running deterministic clickthrough on /demo..."
MIRALO_REPO_ROOT="$ROOT_DIR" MIRALO_OUTPUT_DIR="$OUTPUT_DIR" node "$ROOT_DIR/demo-orchestration/scripts/record-clickthrough.mjs"
