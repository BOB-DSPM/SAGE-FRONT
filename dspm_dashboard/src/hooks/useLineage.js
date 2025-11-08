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
      try {
        const data = await getLineageSchema({
          pipeline: pipelineName,
          region,
          include_featurestore: true,
          include_sql: true,
          scan_if_missing: false,
        });

        console.log('Schema data loaded:', data);

        // 핵심 수정: columns를 tableId 기준으로 그룹화하여 각 테이블에 연결
        const tablesWithColumns = (data.tables || []).map(table => {
          const tableColumns = (data.columns || []).filter(
            col => col.tableId === table.id
          );
          
          return {
            ...table,
            columns: tableColumns,
          };
        });

        console.log('Tables with columns:', tablesWithColumns);

        setSchemaLineageData(data);
        setSchemas(tablesWithColumns);
        
        return data;
      } catch (err) {
        console.error('loadSchemas error', err);
        setSchemas([]);
        return null;
      } finally {
        setLoadingSchemas(false);
      }
    },
    [] // 의존성 배열에서 loadSchemaLineage 제거
  );

  /* -------------------- 스키마 기준 라인리지 -------------------- */
  const loadSchemaLineage = useCallback(
    async (pipelineName, schemaName, region = 'ap-northeast-2') => {
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
        const data = await getSchemaLineage(pipelineName, region);

        const filteredTables = (data.tables || []).filter(
          (t) => t.name === schemaName
        );
        const filteredColumns = (data.columns || []).filter(
          (c) => filteredTables.some((t) => t.id === c.tableId)
        );

        const filtered = {
          ...data,
          tables: filteredTables,
          columns: filteredColumns,
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

  // buildSchemaGraph 함수 수정
  const buildSchemaGraph = useCallback(
    (data) => {
      if (!data?.tables) return { nodes: [], edges: [] };

      const nodes = [];
      const edges = [];
      const processedLinks = new Set();

      // 테이블 노드 생성
      data.tables.forEach((table) => {
        const tableId = `table:${table.name}`;
        nodes.push({
          id: tableId,
          type: 'default',
          data: {
            label: (
              <div className="text-xs font-semibold text-center">
                <div>{table.name}</div>
                <div className="text-[10px] text-gray-500">v{table.version}</div>
                <div className="text-[9px] text-gray-400 mt-1">
                  {(table.columns || []).length} columns
                </div>
              </div>
            ),
            nodeData: { ...table, type: 'schemaTable' },
          },
          style: getDataNodeStyle('schemaTable', false, false, false),
          position: { x: 0, y: 0 },
        });

        // 링크된 데이터 노드와 엣지 생성
        (table.links || []).forEach((link) => {
          if (!processedLinks.has(link)) {
            processedLinks.add(link);
            const linkId = link;
            const linkParts = link.split('/');
            const displayName = linkParts.slice(-2).join('/');

            nodes.push({
              id: linkId,
              type: 'default',
              data: {
                label: (
                  <div className="text-[10px] text-center">
                    {displayName}
                  </div>
                ),
                nodeData: { type: 'dataLink', uri: link },
              },
              style: getDataNodeStyle('dataLink', false, false, false),
              position: { x: 0, y: 0 },
            });

            edges.push({
              id: `edge-${tableId}-${linkId}`,
              source: tableId,
              target: linkId,
              type: 'smoothstep',
              animated: true,
              style: { stroke: '#0284c7', strokeWidth: 1 },
            });
          }
        });
      });

      // // 데이터 관점 라인리지와 연결
      // if (lineageData?.graphData) {
      //   processedLinks.forEach((link) => {
      //     const dataNode = lineageData.graphData.nodes.find(
      //       (n) => n.type === 'dataArtifact' && n.uri === link
      //     );
      //     if (dataNode) {
      //       const processNodes = lineageData.graphData.nodes.filter((n) =>
      //         lineageData.graphData.edges.some(
      //           (e) => (e.source === dataNode.id && e.target === n.id) || (e.source === n.id && e.target === dataNode.id)
      //         )
      //       );

      //       processNodes.forEach((processNode) => {
      //         edges.push({
      //           id: `edge-${link}-${processNode.id}`,
      //           source: link,
      //           target: processNode.id,
      //           type: 'smoothstep',
      //           animated: true,
      //           style: { stroke: '#16a34a', strokeWidth: 1 },
      //         });
      //       });
      //     }
      //   });
      // }

      return { nodes, edges };
    },
    [lineageData]
  );

  /* -------------------- 스타일 유틸리티 함수 -------------------- */

  const getDataNodeStyle = (nodeType, isSelected, isConnected, isDimmed) => {
    const baseStyle = {
      border: '1px solid #e2e8f0',
      borderRadius: '4px',
      padding: '8px',
      fontSize: '12px',
      width: 'auto',
      minWidth: '120px',
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
    buildSchemaGraph,
  };
};

export default useLineage;