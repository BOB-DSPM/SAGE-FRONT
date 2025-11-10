// ==============================
// src/services/ossApi.js
// ==============================
const API_BASE =
  process.env.REACT_APP_OSS_BASE || "http://43.202.228.52:8800/oss";

const DEFAULT_DIR = () =>
  localStorage.getItem("oss.directory") ||
  process.env.REACT_APP_OSS_WORKDIR ||
  "/workspace";

async function _fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
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

export async function simulateUse(code, payload) {
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}

export async function runTool(code, payload) {
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/run`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}

// ──────────────────────────────────────────────────────────────
// 새로 추가: 최근 실행 결과 조회 (없으면 null 반환)
// ──────────────────────────────────────────────────────────────
export async function getLatestRun(code) {
  const url = `${API_BASE}/api/oss/${encodeURIComponent(code)}/runs/latest`;
  const res = await fetch(url, { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) {
    let text = "";
    try {
      text = await res.text();
    } catch {}
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

// ──────────────────────────────────────────────────────────────
// 새로 추가: 실시간 실행 스트림
// onChunk(chunk)로 수신 조각을 전달 (텍스트)
// ──────────────────────────────────────────────────────────────
export async function streamRun(code, payload, onChunk) {
  const withDir = ensureDirectory(payload || {});
  const res = await fetch(
    `${API_BASE}/api/oss/${encodeURIComponent(code)}/run/stream`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(withDir),
    }
  );
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value ? decoder.decode(value, { stream: true }) : "";
    if (chunk && onChunk) onChunk(chunk);
  }
}
