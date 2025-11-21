// src/services/apiBase.js 같은 곳
// 요청이 계속 localhost로 나가는 문제를 막기 위해 호스트를 고정한다.
const HOST = '3.37.174.51';
const http = (port, suffix = '') => `http://${HOST}:${port}${suffix}`;

// ─ 개별 서비스 BASE URL ─
export const OSS_API_BASE = http(8800, '/oss');

export const LINEAGE_API_BASE = http(8300);

export const AUDIT_API_BASE = http(8103);

export const AEGIS_API_BASE = http(9000);

export const COLLECTOR_API_BASE = http(8000);

export const COMPLIANCE_API_BASE = http(8003);

export const INVENTORY_API_BASE = http(8000);
