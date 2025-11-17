// src/services/complianceApi.js
// 감사 API 클라이언트 (세션 ID를 항상 안전하게 쿼리스트링에 부착)
import { AUDIT_API_BASE } from '../config/api';

// 감사 API 클라이언트 (세션 ID를 항상 안전하게 쿼리스트링에 부착)
const BASE = AUDIT_API_BASE;

function withSession(url, sessionId) {
  const u = new URL(url);
  if (sessionId) {
    // UUID 같은 단순 문자열만 들어감
    u.searchParams.set("session_id", String(sessionId));
  }
  return u.toString();
}

export const complianceApi = {
  // 세션 존재 여부 확인 (GET /audit/session/{session_id})
  async checkSession(sessionId) {
    const url = `${AUDIT_API_BASE}/audit/session/${encodeURIComponent(sessionId)}`;
    console.log("세션 존재 확인 URL:", url);
    try {
      const res = await fetch(url, { method: "GET", headers: { "Content-Type": "application/json" } });
      console.log("📡 세션 확인 응답:", res.status, res.statusText);
      if (!res.ok) {
        if (res.status === 404) return { exists: false };
        throw new Error(`Failed to check session: ${res.status}`);
      }
      const data = await res.json();
      console.log("✅ 세션 확인 결과:", data);
      return data;
    } catch (e) {
      console.error("세션 확인 실패:", e);
      return { exists: false };
    }
  },

  // 프레임워크 전체 감사 (배치) - 캐시된 결과 반환 가능
  async auditAll(framework, sessionId) {
    const u = new URL(`${AUDIT_API_BASE}/audit/${framework}/_all`);
    u.searchParams.set("stream", "false");
    if (sessionId) u.searchParams.set("session_id", sessionId);

    console.log("전체 감사 (배치) URL:", u.toString());
    const res = await fetch(u.toString(), { method: "POST", headers: { "Content-Type": "application/json" } });
    console.log("📡 전체 감사 응답:", res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.error("전체 감사 실패:", text);
      throw new Error(`Audit failed: ${res.status} - ${text}`);
    }
    return res.json();
  },

  // 프레임워크 전체 감사 (스트리밍, NDJSON)
  async auditAllStreaming(framework, sessionId, onProgress) {
    const u = new URL(`${AUDIT_API_BASE}/audit/${framework}/_all`);
    u.searchParams.set("stream", "true");
    if (sessionId) u.searchParams.set("session_id", sessionId);

    console.log("전체 감사 스트리밍 URL:", u.toString());
    const res = await fetch(u.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/x-ndjson",
      },
    });
    console.log("📡 전체 감사 응답:", res.status, res.statusText);
    if (!res.ok) {
      const text = await res.text();
      console.error("전체 감사 실패:", text);
      throw new Error(`Audit failed: ${res.status} - ${text}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let leftover = "";
    let lineCount = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = leftover + decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      leftover = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        lineCount++;
        try {
          const evt = JSON.parse(line);
          onProgress?.(evt);
        } catch (e) {
          console.error("JSON 파싱 실패:", line, e);
        }
      }
    }

    if (leftover.trim()) {
      lineCount++;
      try {
        const evt = JSON.parse(leftover);
        onProgress?.(evt);
      } catch (e) {
        console.error("leftover 파싱 실패:", leftover, e);
      }
    }

    console.log("스트리밍 완료. 총 라인 수:", lineCount);
  },

  // 특정 요구사항 감사 - 캐시된 결과 반환 가능
  async auditRequirement(framework, requirementId, sessionId) {
    const base = `${AUDIT_API_BASE}/audit/audit/${framework}/${requirementId}`;
    const url = withSession(base, sessionId);
    console.log("개별 감사 URL:", url);

    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });
    console.log("📡 개별 감사 응답:", res.status, res.statusText);

    if (!res.ok) {
      const text = await res.text();
      console.error("개별 감사 실패:", text);
      throw new Error(`Audit failed: ${res.status} - ${text}`);
    }
    return res.json();
  },
};
