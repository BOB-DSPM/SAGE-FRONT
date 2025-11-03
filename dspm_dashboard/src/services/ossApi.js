// src/services/ossApi.js
const API_BASE = process.env.REACT_APP_OSS_BASE || "http://211.44.183.248:8800/oss"; // 예: "/oss" 프록시 or 절대주소

async function _fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function listCatalog(q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return _fetchJSON(`${API_BASE}/api/oss${qs}`);
}

export async function getDetail(code) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}`);
}

// ✅ 실행 엔드포인트: build+execute
export async function runTool(code, payload) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/run`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

// (선택) 이전 시뮬레이터도 유지하고 싶으면 남겨둠
export async function simulateUse(code, payload) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}
