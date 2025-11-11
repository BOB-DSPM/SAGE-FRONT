// src/services/sessionService.js
// 세션 ID 생성/보관 유틸 (프론트 전용, 서버 세션과 독립)
class SessionService {
  constructor() {
    this.sessionId = null;
    // 새로고침해도 유지
    const saved = window.localStorage.getItem("session.id");
    if (saved) this.sessionId = saved;
  }

  _newId() {
    try {
      // 브라우저 표준 UUID
      return crypto.randomUUID();
    } catch {
      // 폴백
      return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
  }

  async startSession(profile = null) {
    // 서버 세션 API 없이 프론트에서 UUID를 생성하여 전달
    this.sessionId = this._newId();
    window.localStorage.setItem("session.id", this.sessionId);
    console.log("[session] started:", this.sessionId, profile ? `(profile=${profile})` : "");
    return this.sessionId;
  }

  async endSession() {
    this.sessionId = null;
    window.localStorage.removeItem("session.id");
    console.log("[session] ended");
  }

  getId() {
    return this.sessionId;
  }

  getSessionHeaders(additionalHeaders = {}) {
    return {
      "Content-Type": "application/json",
      ...additionalHeaders,
    };
  }

  hasSession() {
    return !!this.sessionId;
  }
}

export const sessionService = new SessionService();
