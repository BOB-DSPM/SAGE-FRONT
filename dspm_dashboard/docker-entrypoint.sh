#!/bin/sh
set -e

json_escape() {
  printf '%s' "$1" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g'
}

write_env_file() {
  {
    printf 'window._env_ = {\n'
    printf '  REACT_APP_API_HOST: "%s",\n' "$(json_escape "${REACT_APP_API_HOST:-localhost}")"
    printf '  REACT_APP_OSS_BASE: "%s",\n' "$(json_escape "${REACT_APP_OSS_BASE:-}")"
    printf '  REACT_APP_LINEAGE_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_LINEAGE_API_BASE:-}")"
    printf '  REACT_APP_AUDIT_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_AUDIT_API_BASE:-}")"
    printf '  REACT_APP_AEGIS_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_AEGIS_API_BASE:-}")"
    printf '  REACT_APP_COLLECTOR_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_COLLECTOR_API_BASE:-}")"
    printf '  REACT_APP_COMPLIANCE_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_COMPLIANCE_API_BASE:-}")"
    printf '  REACT_APP_INVENTORY_API_BASE: "%s",\n' "$(json_escape "${REACT_APP_INVENTORY_API_BASE:-}")"
    printf '  REACT_APP_OSS_WORKDIR: "%s",\n' "$(json_escape "${REACT_APP_OSS_WORKDIR:-/workspace}")"
    printf '};\n'
  } > /usr/share/nginx/html/env-config.js
}

write_env_file

exec "$@"
