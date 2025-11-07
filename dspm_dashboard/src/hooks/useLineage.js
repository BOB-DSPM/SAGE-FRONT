// src/hooks/useLineage.js
import { useState, useCallback, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import {
  getPipelines,
  getLineage,
  getSchemas,
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

        // 전체 응답 저장 (나중에 컬럼/링크 쓸 수 있음)
        setSchemaLineageData(data);

        // 드롭다운에서 쓸 테이블 목록
        const tables = Array.isArray(data.tables) ? data.tables : [];
        setSchemas(tables);
      } catch (err) {
        console.error('loadSchemas error', err);
        setSchemas([]);
      } finally {
        setLoadingSchemas(false);
      }
    },
    []
  );

  /* -------------------- 스키마 기준 라인리지 -------------------- */

  const loadSchemaLineage = useCallback(
    async (schemaName, region = 'ap-northeast-2') => {
      if (!schemaName || !schemaName.trim()) {
        setError('스키마 이름을 입력하세요');
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getSchemaLineage(schemaName, region);
        setSchemaLineageData(data);
        return data;
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

  /* -------------------- 반환 -------------------- */

  return {
    // 기존
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
    // 새로 추가: 스키마 관련
    schemas,
    loadingSchemas,
    schemaLineageData,
    loadSchemas,
  };
};

export default useLineage;