#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js << EOF
window.__config = {
  keycloakUrl: "${KEYCLOAK_URL:-http://localhost:8090}",
  keycloakRealm: "${KEYCLOAK_REALM:-se2eend}",
  keycloakClientId: "${KEYCLOAK_CLIENT_ID:-se2eend-frontend}"
};
EOF

BACKEND_URL="${BACKEND_URL:-http://backend:8081}" \
  envsubst '${BACKEND_URL}' \
  < /etc/nginx/conf.d/default.conf.template \
  > /etc/nginx/conf.d/default.conf

exec nginx -g "daemon off;"
