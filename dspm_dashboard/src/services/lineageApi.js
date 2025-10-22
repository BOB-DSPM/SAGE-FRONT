// src/services/lineageApi.js
const LINEAGE_API_BASE = 'http://211.44.183.248:8300';

export const lineageApi = {
  // SageMaker Catalog (기존 API)
  async getCatalog(regions = 'ap-northeast-2') {
    const url = `${LINEAGE_API_BASE}/sagemaker/catalog?regions=${regions}`;
    
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch catalog: ${response.status}`);
    }

    return await response.json();
  },

  // 특정 파이프라인 Lineage
  async getLineage(pipeline, region = 'ap-northeast-2', includeLatestExec = true) {
    const url = `${LINEAGE_API_BASE}/lineage?pipeline=${pipeline}&includeLatestExec=${includeLatestExec}&region=${region}`;

    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch lineage: ${response.status}`);
    }

    return await response.json();
  },
};