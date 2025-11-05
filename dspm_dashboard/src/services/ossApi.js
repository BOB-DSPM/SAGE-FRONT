const API_BASE = process.env.REACT_APP_OSS_BASE || "http://43.202.228.52:8800/oss";
const DEFAULT_DIR = () =>
  localStorage.getItem("oss.directory") || process.env.REACT_APP_OSS_WORKDIR || "/workspace";

async function _fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let text = "";
    try { text = await res.text(); } catch {}
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

export async function runTool(code, payload) {
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/run`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}

export async function simulateUse(code, payload) {
  const withDir = ensureDirectory(payload || {});
  return _fetchJSON(`${API_BASE}/api/oss/${encodeURIComponent(code)}/use`, {
    method: "POST",
    body: JSON.stringify(withDir),
  });
}