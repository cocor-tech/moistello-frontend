#!/usr/bin/env bash
set -euo pipefail

: "${BASE_URL:?Set BASE_URL to the dedicated test environment}"
: "${SUBMIT_PATH:=/api/load-test/transactions}"
: "${STATUS_PATH:=/api/load-test/transactions/{id}}"

k6 run \
  -e BASE_URL="$BASE_URL" \
  -e SUBMIT_PATH="$SUBMIT_PATH" \
  -e STATUS_PATH="$STATUS_PATH" \
  -e DURATION="${DURATION:-2m}" \
  -e CONFIRMATION_TIMEOUT_MS="${CONFIRMATION_TIMEOUT_MS:-30000}" \
  -e POLL_INTERVAL_MS="${POLL_INTERVAL_MS:-500}" \
  tests/load/concurrent-transactions.js
