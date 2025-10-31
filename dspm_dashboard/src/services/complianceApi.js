// src/services/complianceApi.js
const AUDIT_API_BASE = 'http://211.44.183.248:8103';

export const complianceApi = {
  // 세션 존재 여부 확인 (GET /audit/session/{session_id})
  async checkSession(sessionId) {
    const url = `${AUDIT_API_BASE}/audit/session/${sessionId}`;
    console.log('세션 존재 확인 URL:', url);
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      console.log('📡 세션 확인 응답:', response.status, response.statusText);

      if (!response.ok) {
        if (response.status === 404) {
          console.log('세션 없음 (404)');
          return { exists: false };
        }
        throw new Error(`Failed to check session: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ 세션 확인 결과:', data);
      return data;
    } catch (error) {
      console.error('세션 확인 실패:', error);
      return { exists: false };
    }
  },

  // 프레임워크 전체 감사 (배치) - 캐시된 결과 반환 가능
  async auditAll(framework, sessionId) {
    const url = new URL(`${AUDIT_API_BASE}/audit/${framework}/_all`);
    url.searchParams.append('stream', 'false');
    if (sessionId) {
      url.searchParams.append('session_id', sessionId);
    }

    console.log('전체 감사 (배치) URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('📡 전체 감사 응답:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('전체 감사 실패:', errorText);
      throw new Error(`Audit failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('전체 감사 결과:', data);
    return data;
  },

  // 프레임워크 전체 감사 (스트리밍)
  async auditAllStreaming(framework, sessionId, onProgress) {
    const url = new URL(`${AUDIT_API_BASE}/audit/${framework}/_all`);
    url.searchParams.append('stream', 'true');
    if (sessionId) {
      url.searchParams.append('session_id', sessionId);
    }

    console.log('전체 감사 스트리밍 URL:', url.toString());
    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/x-ndjson'
        },
      });

      console.log('📡 전체 감사 응답:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('전체 감사 실패:', errorText);
        throw new Error(`Audit failed: ${response.status} - ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let leftover = '';
      let lineCount = 0;

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) {
            console.log('스트리밍 완료. 총 라인 수:', lineCount);
            break;
          }

          const chunk = leftover + decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          leftover = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            lineCount++;
            try {
              const evt = JSON.parse(line);
              if (onProgress) {
                onProgress(evt);
              }
            } catch (error) {
              console.error('JSON 파싱 실패:', line, error);
            }
          }
        }

        // 남은 데이터 처리
        if (leftover.trim()) {
          lineCount++;
          try {
            const evt = JSON.parse(leftover);
            if (onProgress) {
              onProgress(evt);
            }
          } catch (error) {
            console.error('leftover 파싱 실패:', leftover, error);
          }
        }
      } catch (readerError) {
        console.error('스트리밍 읽기 중 에러:', readerError);
        console.log('처리된 라인 수:', lineCount);
      }
    } catch (fetchError) {
      console.error('Fetch 에러:', fetchError);
      throw fetchError;
    }
  },

  // 특정 요구사항 감사 - 캐시된 결과 반환 가능
  async auditRequirement(framework, requirementId, sessionId) {
    const url = new URL(`${AUDIT_API_BASE}/audit/audit/${framework}/${requirementId}`);
    if (sessionId) {
      url.searchParams.append('session_id', sessionId);
    }

    console.log('개별 감사 URL:', url.toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    console.log('📡 개별 감사 응답:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('개별 감사 실패:', errorText);
      throw new Error(`Audit failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('개별 감사 결과:', data);
    return data;
  },
};