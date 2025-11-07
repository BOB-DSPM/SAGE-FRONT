// src/hooks/useLineage.js
import { useState, useCallback, useEffect, useMemo } from 'react';
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

  // ---- 스키마 레이어/필터/선택 ----
  const [schemaEnabled, setSchemaEnabled] = useState(false);
  const [schemaLayer, setSchemaLayer] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState(null);

  // 패널에서 고르는 ‘유닛’과 선택 항목들
  // unit: 'table' | 'column' | 'featureGroup' | 'feature'
  const [schemaSelection, setSchemaSelection] = useState({
    unit: 'table',
    selected: new Set(),   // 선택된 schema id 집합
  });

  // (선택) 검색/고급필터도 유지 – 필요 시 UI에서 같이 사용
  const [schemaFilter, setSchemaFilter] = useState({
    query: '',
    versions: 'current', // current|all|changed
    changes: { added:false, removed:false, type_changed:false, nullable_changed:false },
  });

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
      // 스키마 토글 ON이면 스키마 레이어도 지연 로딩
      if (schemaEnabled) {
        try { await loadSchemaLayer(pipelineName, region); } catch { /* no-op */ }
      } else {
        setSchemaLayer(null);
        setSchemaSelection(prev => ({ ...prev, selected: new Set() }));
      }
      return data;
    } catch (err) {
      console.error('Failed to load lineage:', err);
      setError(err.message);
      setLineageData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [schemaEnabled]);

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

  // 스키마 레이어 로딩
  const loadSchemaLayer = useCallback(async (pipelineName, region='ap-northeast-2') => {
    if (!pipelineName) return null;
    setSchemaLoading(true); setSchemaError(null);
    try {
      const layer = await lineageApi.getSchemaLayer(pipelineName, region);
      // 사전 인덱스(빠른 매칭을 위해)
      const artifactToSchema = new Map();
      const pushLinks = (links, schemaId) => {
        (links || []).forEach(aid => {
          if (!artifactToSchema.has(aid)) artifactToSchema.set(aid, new Set());
          artifactToSchema.get(aid).add(schemaId);
        });
      };
      (layer.tables || []).forEach(t => pushLinks(t.links, t.id));
      (layer.columns || []).forEach(c => pushLinks(c.links, c.id));
      (layer.featureGroups || []).forEach(fg => pushLinks(fg.links, fg.id));
      (layer.features || []).forEach(f => pushLinks(f.links, f.id));

      setSchemaLayer({ ...layer, artifactToSchema });
      return layer;
    } catch (e) {
      setSchemaError(e.message);
      setSchemaLayer(null);
      return null;
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  // 스키마 토글
  const toggleSchema = useCallback((on) => {
    setSchemaEnabled(!!on);
    if (!on) {
      setSchemaLayer(null);
      setSchemaSelection(prev => ({ ...prev, selected: new Set() }));
    }
  }, []);

  // 선택 토글/일괄 선택/해제
  const setUnit = useCallback((unit) => {
    setSchemaSelection(prev => ({ unit, selected: new Set() }));
  }, []);

  const toggleSchemaItem = useCallback((id) => {
    setSchemaSelection(prev => {
      const s = new Set(prev.selected);
      if (s.has(id)) s.delete(id); else s.add(id);
      return { ...prev, selected: s };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSchemaSelection(prev => ({ ...prev, selected: new Set() }));
  }, []);

  // 현재 유닛에 해당하는 리스트(표시용)
  const availableByUnit = useMemo(() => {
    if (!schemaLayer) return [];
    if (schemaSelection.unit === 'table') return schemaLayer.tables || [];
    if (schemaSelection.unit === 'column') return schemaLayer.columns || [];
    if (schemaSelection.unit === 'featureGroup') return schemaLayer.featureGroups || [];
    return schemaLayer.features || [];
  }, [schemaLayer, schemaSelection.unit]);

  // 선택된 schemaIds -> artifactIds 집합
  const getSelectedArtifactIds = useCallback(() => {
    if (!schemaLayer) return new Set();
    const pools = new Map();
    (schemaLayer.tables || []).forEach(x => pools.set(x.id, x));
    (schemaLayer.columns || []).forEach(x => pools.set(x.id, x));
    (schemaLayer.featureGroups || []).forEach(x => pools.set(x.id, x));
    (schemaLayer.features || []).forEach(x => pools.set(x.id, x));

    const links = new Set();
    schemaSelection.selected.forEach(id => {
      const item = pools.get(id);
      (item?.links || []).forEach(aid => links.add(aid));
    });
    return links;
  }, [schemaLayer, schemaSelection.selected]);

  return { 
    // lineage
    lineageData, loading, error, loadLineage,
    pipelines, domains, loadingPipelines, loadPipelines,
    domainLineageData, loadingDomainLineage, loadLineageByDomain,

    // schema
    schemaEnabled, toggleSchema,
    schemaLayer, schemaLoading, schemaError,
    schemaFilter, setSchemaFilter,

    schemaSelection, setUnit, toggleSchemaItem, clearSelection,
    availableByUnit, getSelectedArtifactIds,
    loadSchemaLayer,
  };
};