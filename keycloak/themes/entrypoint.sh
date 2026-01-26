#!/bin/bash
set -e

echo "==================================="
echo "sE2EEnd Keycloak Initialization"
echo "==================================="

chmod +x /opt/keycloak/themes/generate-theme.sh 2>/dev/null || true

bash /opt/keycloak/themes/generate-theme.sh

echo "Building Keycloak for MySQL..."
/opt/keycloak/bin/kc.sh build

echo "Starting Keycloak..."
exec /opt/keycloak/bin/kc.sh start --optimized --import-realm