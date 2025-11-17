// src/services/lineageApi.js
import { LINEAGE_API_BASE } from '../config/api';

const BASE_URL = LINEAGE_API_BASE;
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
  if (!pipeline) {
    throw new Error('pipeline is required');
  }
  
  const params = {
    pipeline,
    region,
    include_featurestore: String(include_featurestore),
    include_sql: String(include_sql),
    scan_if_missing: String(scan_if_missing),
  };

  const data = await httpGet('/schema', params);

  // tables와 columns를 join 해서 각 table에 columns 붙여줌
  const tableMap = new Map(
    (data.tables || []).map((t) => [
      t.id,
      {
        ...t,
        columns: [],
      },
    ])
  );

  (data.columns || []).forEach((col) => {
    // 백엔드 스키마에 따라 tableId 혹은 table 사용 가능성 모두 처리
    const tableId = col.tableId || col.table_id || col.table;
    const tbl = tableMap.get(tableId);
    if (tbl) {
      tbl.columns.push(col);
    }
  });

  return {
    ...data,
    tables: Array.from(tableMap.values()),
  };
}