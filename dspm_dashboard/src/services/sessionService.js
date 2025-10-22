// src/services/sessionService.js
class SessionService {
  constructor() {
    this.sessionId = null;
  }

  async startSession(profile = null) {
    // 세션 API가 없으므로 임시 세션 ID 생성
    this.sessionId = `session-${Date.now()}`;
    console.log('Mock session started:', this.sessionId);
    return this.sessionId;
  }

  async endSession() {
    this.sessionId = null;
  }

  getSessionHeaders(additionalHeaders = {}) {
    return {
      'Content-Type': 'application/json',
      ...additionalHeaders,
    };
  }

  hasSession() {
    return !!this.sessionId;
  }
}

export const sessionService = new SessionService();