// src/services/lineageApi.js
const BASE_URL =
  process.env.REACT_APP_LINEAGE_API_BASE || "http://43.202.228.52:8300";

async function httpGet(path, params = {}) {
  const url = new URL(BASE_URL + path);

  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${path} ${res.status}: ${text}`);
  }
  return res.json();
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
  return httpGet('/lineage/domain', {
    region,
    domain,
    includeLatestExec,
    view: 'both',
  });
}

/** 특정 스키마 기준 라인리지 조회 */
export async function getSchemaLineage(schemaName, region = "ap-northeast-2") {
  return httpGet("/lineage/schema", {
    schema: schemaName,
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
  const params = new URLSearchParams({
    pipeline,
    region,
    include_featurestore: String(include_featurestore),
    include_sql: String(include_sql),
    scan_if_missing: String(scan_if_missing),
  });

  const res = await fetch(`${BASE_URL}/schema?${params.toString()}`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch schema lineage: ${res.status}`);
  }

  return res.json();
}