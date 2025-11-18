// ============================================================================
// file: src/services/ossApi.js
// (fetch 유틸 모음; download_url 자동 보강 포함 + 사소한 안정화)
// ============================================================================
import { OSS_API_BASE } from '../config/api';

const API_BASE = OSS_API_BASE || "http://3.37.174.51:8800/oss";

const DEFAULT_DIR = () =>
  localStorage.getItem('oss.directory') ||
  process.env.REACT_APP_OSS_WORKDIR ||
  '/workspace'; // 기존 값 유지하면 여기에

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

// --- download_url 생성기 (백엔드가 못 넣어줬을 때 폴백) ---
function buildDownloadUrl(runDir, path) {
  if (!runDir || !path) return null;
  const u = new URL(`${API_BASE}/api/oss/files`);
  // 백엔드가 'runs/' 접두사가 없는 run_dir도 허용하므로 그대로 전달
  u.searchParams.set("run_dir", runDir);
  u.searchParams.set("path", path);
  return u.toString();
}

// 응답 객체에 files[*].download_url 보강
function withDownloadUrls(resp) {
  if (!resp || !Array.isArray(resp.files)) return resp;
  return {
    ...resp,
    files: resp.files.map((f) => ({
      ...f,
      download_url: f.download_url || buildDownloadUrl(resp.run_dir, f.path),
    })),
  };
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
  const resp = await _fetchJSON(
    `${API_BASE}/api/oss/${encodeURIComponent(code)}/run`,
    {
      method: "POST",
      body: JSON.stringify(withDir),
    }
  );
  return withDownloadUrls(resp); // ⬅ 다운로드 링크 보강
}

// 최근 실행 결과
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
  const data = await res.json();
  return withDownloadUrls(data); // ⬅ 다운로드 링크 보강
}

// 실시간 실행 스트림
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

export { buildDownloadUrl, withDownloadUrls };