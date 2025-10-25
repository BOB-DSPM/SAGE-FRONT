// src/hooks/useLineage.js
import { useState, useCallback, useEffect } from 'react';
import { sessionService } from '../services/sessionService';
import { lineageApi } from '../services/lineageApi';

export const useLineage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lineageData, setLineageData] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [domains, setDomains] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [domainLineageData, setDomainLineageData] = useState(null);
  const [loadingDomainLineage, setLoadingDomainLineage] = useState(false);

  // Mock 세션 시작
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

  // 파이프라인 목록 조회 (새 API 사용)
  const loadPipelines = useCallback(async (options = {}) => {
    setLoadingPipelines(true);
    setError(null);

    try {
      const data = await lineageApi.getPipelines({
        regions: options.regions || 'ap-northeast-2',
        includeLatestExec: options.includeLatestExec || false,
        name: options.name || null,
        domainName: options.domainName || null,
        domainId: options.domainId || null
      });
      
      console.log('Pipelines data:', data);
      
      // 파이프라인 목록 추출
      const pipelineList = [];
      if (data.regions && Array.isArray(data.regions)) {
        data.regions.forEach(regionData => {
          if (regionData.pipelines && Array.isArray(regionData.pipelines)) {
            regionData.pipelines.forEach(pipe => {
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
      
      // 도메인 정보 추출
      const domainMap = new Map();
      pipelineList.forEach(pipe => {
        // matchedDomain 정보가 있는 경우 사용
        if (pipe.matchedDomain) {
          domainMap.set(pipe.matchedDomain.domainId, {
            id: pipe.matchedDomain.domainId,
            name: pipe.matchedDomain.domainName || pipe.matchedDomain.domainId,
            region: pipe.region,
          });
        }
        // 또는 tags에서 추출
        else if (pipe.tags && pipe.tags['sagemaker:domain-arn']) {
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
      
      const domainList = Array.from(domainMap.values());
      
      setDomains(domainList);
      setPipelines(pipelineList);
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

  // 특정 파이프라인의 lineage 조회
  const loadLineage = useCallback(async (pipelineName, region = 'ap-northeast-2', domain = null) => {
    if (!pipelineName || !pipelineName.trim()) {
      setError('파이프라인 이름을 입력하세요');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await lineageApi.getLineage(pipelineName, region, true, domain);
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
  }, []);

  // 새로운 함수: 도메인으로 라인리지 조회
  const loadLineageByDomain = useCallback(async (domain, region = 'ap-northeast-2') => {
    if (!domain || !domain.trim()) {
      setError('도메인 이름을 입력하세요');
      return null;
    }

    setLoadingDomainLineage(true);
    setError(null);

    try {
      const data = await lineageApi.getLineageByDomain(region, domain, true);
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
  }, []);

  return { 
    lineageData, 
    loading, 
    error, 
    loadLineage,
    pipelines,
    domains,
    loadingPipelines,
    loadPipelines,
    // 새로운 도메인 기반 라인리지 관련 상태와 함수
    domainLineageData,
    loadingDomainLineage,
    loadLineageByDomain
  };
};