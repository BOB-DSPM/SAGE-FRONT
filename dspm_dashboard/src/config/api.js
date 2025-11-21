// src/services/apiBase.js 같은 곳
import { getEnv } from './runtimeEnv';

// 런타임/빌드 환경변수로 우선 설정하고, 없으면 브라우저 호스트 → 최종 fallback IP
const DEFAULT_HOST =
  (typeof window !== 'undefined' && window.location?.hostname) || '3.37.174.51';
const HOST = getEnv('REACT_APP_API_HOST') || DEFAULT_HOST;

const http = (port, suffix = '') => `http://${HOST}:${port}${suffix}`;

// ─ 개별 서비스 BASE URL ─
export const OSS_API_BASE = http(8800, '/oss');

export const LINEAGE_API_BASE = http(8300);

export const AUDIT_API_BASE = http(8103);

export const AEGIS_API_BASE = http(9000);

export const COLLECTOR_API_BASE = http(8000);

export const COMPLIANCE_API_BASE = http(8003);

export const INVENTORY_API_BASE = http(8000);
