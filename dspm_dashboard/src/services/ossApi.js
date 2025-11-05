// src/services/ossApi.js
const API_BASE = process.env.REACT_APP_OSS_BASE || "http://43.202.228.52:8800/oss"; // 예: "/oss" 프록시 or 절대주소
const DEFAULT_DIR = () =>
  localStorage.getItem("oss.directory") || process.env.REACT_APP_OSS_WORKDIR || "/workspace";

async function _fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    // 가능한 경우 서버 detail 메시지를 뽑아줌
    let text = "";
    try {
      text = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

function ensureDirectory(payload = {}) {
  if (!payload.directory || String(payload.directory).trim().length === 0) {
    return { ...payload, directory: DEFAULT_DIR() };
  }
  return payload;
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
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/run`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}

// 시뮬레이터 (명령만 생성)
export async function simulateUse(code, payload) {
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}
