#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env.security-test"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env.security-test — run tests/helpers/start-security-mysql.sh first"
  exit 2
fi
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
exec "$@"
