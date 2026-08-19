#!/bin/bash
set -euo pipefail

# Starts a disposable localhost-only MySQL for synthetic security tests.
# Does not print credentials. Writes them to an untracked env file.

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/.env.security-test"
CONTAINER="tcte-security-test-mysql"
DB_NAME="tcte_security_test"
HOST_PORT="3307"

if ! command -v docker >/dev/null 2>&1; then
  echo "SAFE TEST DATABASE COULD NOT BE CREATED — docker is not installed"
  exit 2
fi

if ! docker info >/dev/null 2>&1; then
  echo "SAFE TEST DATABASE COULD NOT BE CREATED — docker daemon is not running"
  exit 2
fi

if [[ ! -f "$ENV_FILE" ]]; then
  USER_NAME="tcte_sec_test"
  PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
  ROOT_PASSWORD="$(python3 -c 'import secrets; print(secrets.token_urlsafe(24))')"
  JWT_ACCESS="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  JWT_REFRESH="$(python3 -c 'import secrets; print(secrets.token_urlsafe(48))')"
  PAYHERE_SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  REPORT_KEY="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  FIXTURE_PASSWORD="$(python3 -c 'import secrets; print("Test-" + secrets.token_urlsafe(16))')"
  cat > "$ENV_FILE" <<EOF
DATABASE_URL="mysql://${USER_NAME}:${PASSWORD}@127.0.0.1:${HOST_PORT}/${DB_NAME}"
JWT_ACCESS_SECRET="${JWT_ACCESS}"
JWT_REFRESH_SECRET="${JWT_REFRESH}"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
PAYHERE_MERCHANT_ID="tcte-test-merchant"
PAYHERE_MERCHANT_SECRET="${PAYHERE_SECRET}"
PAYHERE_RETURN_URL="http://127.0.0.1:3063/book/result"
PAYHERE_CANCEL_URL="http://127.0.0.1:3063/book/result"
PAYHERE_NOTIFY_URL="http://127.0.0.1:3063/api/public/payhere/notify"
PAYHERE_CHECKOUT_URL="https://sandbox.payhere.lk/pay/checkout"
BOOKINGS_REPORT_API_KEY="${REPORT_KEY}"
TRUST_PROXY="false"
ALLOW_SEED="false"
SECURITY_TEST_PASSWORD="${FIXTURE_PASSWORD}"
SECURITY_TEST_BASE_URL="http://127.0.0.1:3063"
MYSQL_ROOT_PASSWORD="${ROOT_PASSWORD}"
MYSQL_USER="${USER_NAME}"
MYSQL_PASSWORD="${PASSWORD}"
EOF
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  docker start "$CONTAINER" >/dev/null
else
  docker run -d --name "$CONTAINER" \
    -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
    -e MYSQL_DATABASE="$DB_NAME" \
    -e MYSQL_USER="$MYSQL_USER" \
    -e MYSQL_PASSWORD="$MYSQL_PASSWORD" \
    -p "127.0.0.1:${HOST_PORT}:3306" \
    mysql:8.0 \
    --character-set-server=utf8mb4 \
    --collation-server=utf8mb4_unicode_ci >/dev/null
fi

echo "Waiting for disposable MySQL..."
for _ in $(seq 1 40); do
  if docker exec "$CONTAINER" mysqladmin ping -h 127.0.0.1 --silent >/dev/null 2>&1; then
    echo "Disposable MySQL is ready (database ${DB_NAME}, localhost-only)"
    exit 0
  fi
  sleep 2
done

echo "SAFE TEST DATABASE COULD NOT BE CREATED — MySQL did not become ready"
exit 2
