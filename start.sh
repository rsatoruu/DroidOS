#!/usr/bin/env bash
# Quick start script for DroidOS
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/bin/droidos.mjs" start "$@"
