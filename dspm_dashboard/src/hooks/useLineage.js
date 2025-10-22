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

  // 파이프라인 목록 조회 (기존 Catalog API 사용)
  const loadPipelines = useCallback(async (regions = 'ap-northeast-2') => {
    setLoadingPipelines(true);
    setError(null);

    try {
      const data = await lineageApi.getCatalog(regions);
      
      console.log('Catalog data:', data);
      
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
              });
            });
          }
        });
      }
      
      // 도메인 ID 추출
      const domainIdSet = new Set();
      pipelineList.forEach(pipe => {
        if (pipe.tags && pipe.tags['sagemaker:domain-arn']) {
          const match = pipe.tags['sagemaker:domain-arn'].match(/domain\/(d-[a-z0-9]+)/);
          if (match) {
            domainIdSet.add(match[1]);
          }
        }
      });
      
      const domainList = Array.from(domainIdSet).map(domainId => ({
        id: domainId,
        name: domainId,
        region: regions,
      }));
      
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
  const loadLineage = useCallback(async (pipelineName, region = 'ap-northeast-2') => {
    if (!pipelineName || !pipelineName.trim()) {
      setError('파이프라인 이름을 입력하세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await lineageApi.getLineage(pipelineName, region, true);
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

  return { 
    lineageData, 
    loading, 
    error, 
    loadLineage,
    pipelines,
    domains,
    loadingPipelines,
    loadPipelines
  };
};