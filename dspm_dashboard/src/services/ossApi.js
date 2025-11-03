// src/services/ossApi.js
const API_BASE = process.env.REACT_APP_OSS_BASE || "http://211.44.183.248:8800/oss"; 
// 프록시를 쓰는 경우: "/oss" 로 설정

async function _fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });

  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const body = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  if (!ct.includes("application/json")) {
    // 프록시/경로 문제로 HTML(SPA index.html 등)이 올 때를 방지
    throw new Error(
      `Expected JSON but got '${ct}'. Check REACT_APP_OSS_BASE / proxy. Snippet: ${body.slice(
        0,
        120
      )}`
    );
  }
  try {
    return JSON.parse(body);
  } catch (e) {
    throw new Error(`Invalid JSON: ${String(e)}. Body head: ${body.slice(0, 120)}`);
  }
}

export async function listCatalog(q) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : "";
  return _fetchJSON(`${API_BASE}/api/oss${qs}`);
}

export async function getDetail(code) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}`);
}

export async function simulateUse(code, payload) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export async function runTool(code, payload) {
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/run`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}