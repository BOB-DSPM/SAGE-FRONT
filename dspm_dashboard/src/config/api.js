// src/config/api.js

const HOST = process.env.REACT_APP_API_HOST;

const http = (port, suffix = '') => `http://${HOST}:${port}${suffix}`;

// ─ 개별 서비스 BASE URL ─
export const OSS_API_BASE = process.env.REACT_APP_OSS_BASE || http(8800, '/oss');
export const LINEAGE_API_BASE =
  process.env.REACT_APP_LINEAGE_API_BASE || http(8300);

export const AUDIT_API_BASE =
  process.env.REACT_APP_AUDIT_API_BASE || http(8103);

export const AEGIS_API_BASE =
  process.env.REACT_APP_AEGIS_API_BASE || http(9000);

export const COLLECTOR_API_BASE =
  process.env.REACT_APP_COLLECTOR_API_BASE || http(8000);

export const COMPLIANCE_API_BASE =
  process.env.REACT_APP_COMPLIANCE_API_BASE || http(8003);

// 인벤토리(all-resources) 같은 애들
export const INVENTORY_API_BASE =
  process.env.REACT_APP_INVENTORY_API_BASE || http(8000);
