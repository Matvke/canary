#!/bin/sh
set -eu

API_BASE_URL="${API_BASE_URL:-${VITE_API_BASE_URL:-}}"
ESCAPED_API_BASE_URL=$(printf '%s' "$API_BASE_URL" | sed 's/\\/\\\\/g; s/"/\\"/g')

cat > /usr/share/nginx/html/env.js <<EOF
window.__CANARY_CONFIG__ = {
  API_BASE_URL: "$ESCAPED_API_BASE_URL"
};
EOF
