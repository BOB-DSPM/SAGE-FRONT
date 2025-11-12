// src/hooks/useLineage.js
import { useState, useCallback, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import {
  getPipelines,
  getLineage,
  getSchemaLineage,
  getLineageByDomain,
  getLineageSchema,
} from '../services/lineageApi';

// Lineage.js 에서 `import { useLineage } ...` 로 쓰고 있기 때문
export const useLineage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lineageData, setLineageData] = useState(null);

  const [pipelines, setPipelines] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);

  const [domainLineageData, setDomainLineageData] = useState(null);
  const [loadingDomainLineage, setLoadingDomainLineage] = useState(false);

  // 새로 추가: 스키마 관련 상태
  const [schemas, setSchemas] = useState([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [schemaLineageData, setSchemaLineageData] = useState(null);

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      if (!sessionService.hasSession()) {
        try {
          await sessionService.startSession();
        } catch (error) {
          console.error('Failed to start session:', error);
        }
      }
    };
    initSession();
  }, []);

  /* -------------------- 파이프라인 목록 -------------------- */

  const loadPipelines = useCallback(async (options = {}) => {
    setLoadingPipelines(true);
    setError(null);

    try {
      const data = await getPipelines({
        regions: options.regions || 'ap-northeast-2',
        includeLatestExec: options.includeLatestExec || false,
        name: options.name || null,
        domainName: options.domainName || null,
        domainId: options.domainId || null,
      });

      const pipelineList = [];
      if (data.regions && Array.isArray(data.regions)) {
        data.regions.forEach((regionData) => {
          if (regionData.pipelines && Array.isArray(regionData.pipelines)) {
            regionData.pipelines.forEach((pipe) => {
              pipelineList.push({
                name: pipe.name,
                arn: pipe.arn,
                region: regionData.region,
                lastModifiedTime: pipe.lastModifiedTime,
                tags: pipe.tags || {},
                matchedDomain: pipe.matchedDomain,
                latestExecution: pipe.latestExecution,
              });
            });
          }
        });
      }

      // 도메인 목록 구성
      const domainMap = new Map();
      pipelineList.forEach((pipe) => {
        if (pipe.matchedDomain) {
          domainMap.set(pipe.matchedDomain.domainId, {
            id: pipe.matchedDomain.domainId,
            name: pipe.matchedDomain.domainName || pipe.matchedDomain.domainId,
            region: pipe.region,
          });
        } else if (pipe.tags && pipe.tags['sagemaker:domain-arn']) {
          const match = pipe.tags['sagemaker:domain-arn'].match(/domain\/(d-[a-z0-9]+)/);
          if (match) {
            const domainId = match[1];
            const domainName = pipe.tags['DomainName'] || domainId;
            domainMap.set(domainId, {
              id: domainId,
              name: domainName,
              region: pipe.region,
            });
          }
        }
      });

      setPipelines(pipelineList);
      setDomains(Array.from(domainMap.values()));
      return pipelineList;
    } catch (err) {
      console.error('Failed to load pipelines:', err);
      setError(err.message);
      setPipelines([]);
      setDomains([]);
      return [];
    } finally {
      setLoadingPipelines(false);
    }
  }, []);

  /* -------------------- 파이프라인 기준 라인리지 -------------------- */

  const loadLineage = useCallback(
    async (pipelineName, region = 'ap-northeast-2', domain = null) => {
      if (!pipelineName || !pipelineName.trim()) {
        setError('파이프라인 이름을 입력하세요');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getLineage(pipelineName, region, true, domain);
        setLineageData(data);
        return data;
      } catch (err) {
        console.error('Failed to load lineage:', err);
        setError(err.message);
        setLineageData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* -------------------- 도메인 기준 라인리지 -------------------- */

  const loadLineageByDomain = useCallback(
    async (domain, region = 'ap-northeast-2') => {
      if (!domain || !domain.trim()) {
        setError('도메인 이름을 입력하세요');
        return null;
      }

      setLoadingDomainLineage(true);
      setError(null);

      try {
        const data = await getLineageByDomain(region, domain, true);
        setDomainLineageData(data);
        return data;
      } catch (err) {
        console.error('Failed to load domain lineage:', err);
        setError(err.message);
        setDomainLineageData(null);
        return null;
      } finally {
        setLoadingDomainLineage(false);
      }
    },
    []
  );

  /* -------------------- 스키마 목록 -------------------- */
  const loadSchemas = useCallback(
    async (pipelineName, region = 'ap-northeast-2') => {
      if (!pipelineName) return;

      setLoadingSchemas(true);
      setError(null);

      try {
        const data = await getLineageSchema({
          pipeline: pipelineName,
          region,
          include_featurestore: true,
          include_sql: true,
          scan_if_missing: true,
        });

        // tableId -> columns 매핑
        const columnsByTableId = {};
        (data.columns || []).forEach((col) => {
          if (!columnsByTableId[col.tableId]) {
            columnsByTableId[col.tableId] = [];
          }
          columnsByTableId[col.tableId].push(col);
        });

        // 드롭다운용 데이터셋 리스트
        const schemaItems = (data.tables || []).map((t) => ({
          name: t.name,
          tableId: t.id,
          columns: columnsByTableId[t.id] || [],
          table: t,
        }));

        setSchemas(schemaItems);
        // 전체 schema raw는 따로 보관 → 데이터셋 선택 시 필터링에 사용
        setSchemaLineageData(data);

        return data;
      } catch (err) {
        console.error('loadSchemas error', err);
        setSchemas([]);
        setSchemaLineageData(null);
        setError(err.message);
        return null;
      } finally {
        setLoadingSchemas(false);
      }
    },
    []
  );

  /* -------------------- 스키마 기준 라인리지 -------------------- */
  const loadSchemaLineage = useCallback(
    async (schemaName, pipelineName, region = 'ap-northeast-2') => {
      if (!schemaName || !schemaName.trim()) {
        setError('스키마 이름을 입력하세요');
        return null;
      }
      if (!pipelineName) {
        setError('파이프라인이 선택되지 않았습니다');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        // 파이프라인 전체 스키마 라인리지
        const full = await getSchemaLineage(pipelineName, region);

        // 선택한 데이터셋(테이블)만 필터링
        const tables = (full.tables || []).filter(
          (t) => t.name === schemaName
        );
        const tableIds = new Set(tables.map((t) => t.id));
        const columns = (full.columns || []).filter(
          (c) => tableIds.has(c.tableId || c.table_id || c.table)
        );

        const filtered = {
          full,
          tables,
          columns,
        };

        setSchemaLineageData(filtered);
        return filtered;
      } catch (err) {
        console.error('Failed to load schema lineage:', err);
        setError(err.message);
        setSchemaLineageData(null);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* -------------------- 빌드 스키마 그래프 -------------------- */

  // // buildSchemaGraph 함수 수정
  // const buildSchemaGraph = useCallback(
  //   (schemaLineageData, lineageData) => {
  //     if (
  //       !schemaLineageData ||
  //       !schemaLineageData.tables ||
  //       schemaLineageData.tables.length === 0 ||
  //       !lineageData
  //     ) {
  //       return { nodes: [], edges: [] };
  //     }

  //     // 1) 데이터 관점 그래프를 기반으로 (레이아웃 재사용)
  //     const { nodes: baseNodes, edges: baseEdges } = buildDataGraph(lineageData);
  //     if (!baseNodes.length) return { nodes: [], edges: [] };

  //     // 2) 선택된 테이블 (드롭다운에서 고른 데이터셋)
  //     const table = schemaLineageData.tables[0];
  //     const tableName = (table.name || '').toLowerCase();

  //     const linkUris = [
  //       ...(table.links || []),
  //       ...(schemaLineageData.columns || [])
  //         .filter((c) => (c.tableId || c.table_id || c.table) === table.id)
  //         .flatMap((c) => c.links || []),
  //     ]
  //       .map(String)
  //       .filter(Boolean);

  //     const explicitLinks = new Set(linkUris);

  //     // URI 매칭 (train / validation / evaluation 모두 커버)
  //     const isUriMatch = (uriRaw) => {
  //       if (!uriRaw) return false;
  //       const uri = String(uriRaw);
  //       const lower = uri.toLowerCase();

  //       // 1) schema에서 내려온 링크 기준
  //       if (explicitLinks.size) {
  //         for (const link of explicitLinks) {
  //           if (!link) continue;
  //           if (uri === link) return true;
  //           if (uri.startsWith(link)) return true;
  //         }
  //       }

  //       if (!tableName) return false;

  //       const name = tableName;

  //       // /.../train/, /.../train.csv, /.../train_0.csv ...
  //       if (lower.includes(`/${name}/`)) return true;
  //       if (lower.endsWith(`/${name}`)) return true;
  //       if (lower.endsWith(`/${name}.csv`)) return true;
  //       if (lower.endsWith(`/${name}.parquet`)) return true;
  //       if (lower.includes(`/${name}_`)) return true;
  //       if (lower.includes(`_${name}.`)) return true;

  //       // evaluation 같이 폴더/파일명에 풀 네임이 안 들어가는 케이스 보정
  //       if (name === 'evaluation') {
  //         if (lower.includes('/eval/')) return true;
  //         if (lower.endsWith('/eval')) return true;
  //         if (lower.includes('_eval')) return true;
  //       }

  //       return false;
  //     };

  //     // dataArtifact 노드만 대상으로 seed 찾기
  //     const dataNodes = baseNodes.filter(
  //       (n) =>
  //         n.data?.type === 'dataArtifact' ||
  //         n.type === 'dataArtifact'
  //     );

  //     const seedIds = new Set(
  //       dataNodes
  //         .filter((n) => isUriMatch(n.data?.uri || n.uri))
  //         .map((n) => n.id)
  //     );

  //     // seed를 못 찾으면 그냥 기본 그래프 리턴 (이게 UX상 안전)
  //     if (!seedIds.size) {
  //       return { nodes: baseNodes, edges: baseEdges };
  //     }

  //     // 3) seed에서 연결된 서브그래프(앞/뒤 전부) BFS로 확장
  //     const adj = new Map();
  //     baseEdges.forEach((e) => {
  //       if (!e.source || !e.target) return;
  //       if (!adj.has(e.source)) adj.set(e.source, []);
  //       if (!adj.has(e.target)) adj.set(e.target, []);
  //       adj.get(e.source).push({ next: e.target, edgeId: e.id });
  //       adj.get(e.target).push({ next: e.source, edgeId: e.id });
  //     });

  //     const activeNodeIds = new Set(seedIds);
  //     const activeEdgeIds = new Set();
  //     const queue = [...seedIds];

  //     while (queue.length) {
  //       const cur = queue.shift();
  //       const nexts = adj.get(cur) || [];
  //       for (const { next, edgeId } of nexts) {
  //         activeEdgeIds.add(edgeId);
  //         if (!activeNodeIds.has(next)) {
  //           activeNodeIds.add(next);
  //           queue.push(next);
  //         }
  //       }
  //     }

  //     // 4) 스타일 적용 (비해당 노드는 연하지만 보이도록)
  //     const DIMMED_OPACITY = 0.3; // 기존보다 살짝 진하게

  //     const nodes = baseNodes.map((n) => {
  //       const active = activeNodeIds.has(n.id);
  //       return {
  //         ...n,
  //         style: {
  //           ...(n.style || {}),
  //           opacity: active ? 1 : DIMMED_OPACITY,
  //         },
  //         data: {
  //           ...(n.data || {}),
  //           isDimmed: !active,
  //         },
  //       };
  //     });

  //     const edges = baseEdges.map((e) => {
  //       const active = activeEdgeIds.has(e.id);
  //       return {
  //         ...e,
  //         style: {
  //           ...(e.style || {}),
  //           opacity: active ? 1 : DIMMED_OPACITY,
  //         },
  //         animated: active && e.animated,
  //       };
  //     });

  //     return { nodes, edges };
  //   },
  //   [buildDataGraph]
  // );

  /* -------------------- 스타일 유틸리티 함수 -------------------- */

  const getDataNodeStyle = (nodeType, isSelected, isConnected, isDimmed) => {
    const baseStyle = {
      border: '4px solid #e2e8f0',
      borderRadius: '8px',
      padding: '8px',
      fontSize: '20px',
      width: 'auto',
      minWidth: '200px',
    };

    if (isDimmed) {
      return {
        ...baseStyle,
        opacity: 0.3,
      };
    }

    switch (nodeType) {
      case 'schemaTable':
        return {
          ...baseStyle,
          backgroundColor: isSelected ? '#bfdbfe' : '#eff6ff',
          borderColor: isSelected ? '#3b82f6' : isConnected ? '#60a5fa' : '#e2e8f0',
        };
      case 'dataLink':
        return {
          ...baseStyle,
          backgroundColor: isSelected ? '#bbf7d0' : '#f0fdf4',
          borderColor: isSelected ? '#22c55e' : isConnected ? '#4ade80' : '#e2e8f0',
        };
      default:
        return baseStyle;
    }
  };

  /* -------------------- 반환 -------------------- */

  return {
    lineageData,
    loading,
    error,
    loadLineage,
    pipelines,
    domains,
    loadingPipelines,
    loadPipelines,
    domainLineageData,
    loadingDomainLineage,
    loadLineageByDomain,
    schemas,
    loadingSchemas,
    schemaLineageData,
    loadSchemas,
    loadSchemaLineage,
  };
};

export default useLineage;