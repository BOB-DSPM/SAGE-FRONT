// src/services/lineageApi.js
const LINEAGE_API_BASE = 'http://43.200.30.132:8300';

export const lineageApi = {
  // SageMaker 파이프라인 목록 조회 (새 API)
  async getPipelines(options = {}) {
    const {
      regions = 'ap-northeast-2',
      includeLatestExec = false,
      name = null,
      domainName = null,
      domainId = null,
    } = options;

    let url = `${LINEAGE_API_BASE}/sagemaker/pipelines?regions=${regions}&includeLatestExec=${includeLatestExec}`;
    
    if (name) url += `&name=${encodeURIComponent(name)}`;
    if (domainName) url += `&domainName=${encodeURIComponent(domainName)}`;
    if (domainId) url += `&domainId=${encodeURIComponent(domainId)}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch pipelines: ${response.status}`);
    }

    return await response.json();
  },

  // 특정 파이프라인 Lineage
  async getLineage(pipeline, region = 'ap-northeast-2', includeLatestExec = true, domain = null) {
    let url = `${LINEAGE_API_BASE}/lineage?pipeline=${encodeURIComponent(pipeline)}&region=${region}&includeLatestExec=${includeLatestExec}`;

    if (domain) url += `&domain=${encodeURIComponent(domain)}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lineage: ${response.status}`);
    }

    return await response.json();
  },

  // 새로운 API: 도메인으로 라인리지 조회
  async getLineageByDomain(region = 'ap-northeast-2', domain, includeLatestExec = false) {
    const url = `${LINEAGE_API_BASE}/lineage/by-domain?region=${region}&domain=${encodeURIComponent(domain)}&includeLatestExec=${includeLatestExec}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lineage by domain: ${response.status}`);
    }

    return await response.json();
  },
};