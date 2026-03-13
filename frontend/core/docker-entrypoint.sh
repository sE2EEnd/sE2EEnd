#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js << EOF
window.__config = {
  keycloakUrl: "${KEYCLOAK_URL:-http://localhost:8090}",
  keycloakRealm: "${KEYCLOAK_REALM:-se2eend}",
  keycloakClientId: "${KEYCLOAK_CLIENT_ID:-se2eend-frontend}"
};
EOF

exec nginx -g "daemon off;"
