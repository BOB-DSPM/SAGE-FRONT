// src/services/aegisApi.js
const AEGIS_API_BASE = 'http://211.44.183.248:8400';
const COLLECTOR_API_BASE = 'http://211.44.183.248:8000';

export const aegisApi = {
  // 데이터 수집만 트리거 (파일 저장)
  async runCollector() {
    try {
      const requestBody = {
        collector_api: COLLECTOR_API_BASE,
        only_detected: true
      };

      console.log('Sending collector request:', requestBody);

      const response = await fetch(`${AEGIS_API_BASE}/api/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`수집 실패: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('runCollector 에러:', error);
      throw error;
    }
  },

  // 기존 triggerCollect
  async triggerCollect(onlyDetected = true) {
    try {
      const requestBody = {
        collector_api: COLLECTOR_API_BASE,
        only_detected: onlyDetected
      };

      console.log('Sending collect request:', requestBody);

      const response = await fetch(`${AEGIS_API_BASE}/api/collect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`수집 실패: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('triggerCollect 에러:', error);
      throw error;
    }
  },

  // 결과 목록 조회
  async getFrontList(params = {}) {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const url = `${AEGIS_API_BASE}/api/result/front-list${searchParams.toString() ? '?' + searchParams : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getFrontList 에러:', error);
      throw error;
    }
  },

  // 특정 소스의 결과 조회
  async getFrontSource(source, params = {}) {
    try {
      const searchParams = new URLSearchParams();
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      const url = `${AEGIS_API_BASE}/api/result/front-source/${source}${searchParams.toString() ? '?' + searchParams : ''}`;
      
      console.log('getFrontSource URL:', url);
      
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getFrontSource 에러:', error);
      throw error;
    }
  },

  // 단일 결과 상세 조회
  async getFrontItem(rid) {
    try {
      const response = await fetch(`${AEGIS_API_BASE}/api/result/front/${rid}`);

      if (!response.ok) {
        throw new Error(`상세 조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getFrontItem 에러:', error);
      throw error;
    }
  },

  // 카테고리별 통계
  async getCategoryCounts() {
    try {
      const response = await fetch(`${AEGIS_API_BASE}/api/result/category-counts`);

      if (!response.ok) {
        throw new Error(`통계 조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getCategoryCounts 에러:', error);
      throw error;
    }
  },

  // 전체 통계
  async getFrontStats() {
    try {
      const response = await fetch(`${AEGIS_API_BASE}/api/result/front-stats`);

      if (!response.ok) {
        throw new Error(`통계 조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getFrontStats 에러:', error);
      throw error;
    }
  },

  // 소스 요약 정보 조회
  async getSourceSummary() {
    try {
      const response = await fetch(`${AEGIS_API_BASE}/api/result/source-summary`);

      if (!response.ok) {
        throw new Error(`소스 요약 조회 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('getSourceSummary 에러:', error);
      throw error;
    }
  },

  // 데이터 리로드
  async reloadFront() {
    try {
      const response = await fetch(`${AEGIS_API_BASE}/api/result/reload`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`리로드 실패: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('reloadFront 에러:', error);
      throw error;
    }
  }

};