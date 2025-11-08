// src/services/lineageApi.js
const BASE_URL =
  process.env.REACT_APP_LINEAGE_API_BASE || "http://43.202.228.52:8300";

async function httpGet(path, params = {}) {
  const url = new URL(BASE_URL + path);

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });

  console.log(`[API] GET ${url.toString()}`);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} ${res.status}: ${text}`);
  }

  const data = await res.json();
  console.log(`[API] Response from ${path}:`, data);
  return data;
}

/** 도메인 기준 라인리지 */
export async function getLineageByDomain(
  region,
  domain,
  includeLatestExec = true
) {
  if (!region || !domain) {
    throw new Error('region, domain is required');
  }

  // 백엔드 실제 엔드포인트에 맞게 path만 조정하면 됨
  return httpGet('/lineage/by-domain', {
    region,
    domain,
    includeLatestExec,
    view: 'both',
  });
}

/** 특정 스키마 기준 라인리지 조회 */
export async function getSchemaLineage(pipelineName, region = "ap-northeast-2") {
  if (!pipelineName) throw new Error("pipeline is required");
  return httpGet("/lineage/schema", {
    pipeline: pipelineName,
    region,
  });
}

// SageMaker 파이프라인 목록
export async function getPipelines(params = {}) {
  return httpGet("/sagemaker/pipelines", params);
}

// 기본 라인리지 (그래프)
export async function getLineage(
  pipeline,
  region,
  includeLatestExec = false,
  domain
) {
  if (!pipeline || !region) throw new Error("pipeline, region is required");

  return httpGet("/lineage", {
    pipeline,
    region,
    view: "both",
    includeLatestExec,
    domain,
  });
}

// 스키마 라인리지
export async function getLineageSchema({
  pipeline,
  region = 'ap-northeast-2',
  include_featurestore = true,
  include_sql = true,
  scan_if_missing = false,
}) {
  const params = {
    pipeline,
    region,
    include_featurestore: String(include_featurestore),
    include_sql: String(include_sql),
    scan_if_missing: String(scan_if_missing),
  };

  try {
    // /schema 엔드포인트 호출 (별칭)
    const data = await httpGet('/schema', params);
    
    console.log('[lineageApi] Schema data received:', {
      tables: data.tables?.length || 0,
      columns: data.columns?.length || 0,
      warnings: data.warnings
    });
    
    // 테이블별로 컬럼 매핑
    const tablesWithColumns = (data.tables || []).map(table => {
      const tableColumns = (data.columns || []).filter(
        col => col.tableId === table.id
      );
      
      return {
        ...table,
        columns: tableColumns,
      };
    });
    
    console.log('[lineageApi] Tables with columns:', 
      tablesWithColumns.map(t => `${t.name}(${t.columns.length} cols)`)
    );
    
    return {
      tables: tablesWithColumns,
      columns: data.columns || [],
      featureGroups: data.featureGroups || [],
      features: data.features || [],
      warnings: data.warnings || [],
      links: data.tables?.reduce((acc, table) => [...acc, ...(table.links || [])], []) || []
    };
    
  } catch (error) {
    console.error('[lineageApi] Failed to load schema:', error);
    throw error;
  }
}