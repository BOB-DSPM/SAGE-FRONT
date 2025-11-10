// src/pages/Lineage.js
import React, { useCallback, useState, useEffect } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import {
  X,
  Database,
  CheckCircle,
  XCircle,
  Loader,
  ChevronDown,
  GitBranch,
  Layers,
  Eye,
  EyeOff,
  ShieldAlert,
} from 'lucide-react';
import { useLineage } from '../hooks/useLineage';

const Lineage = () => {
  const {
    pipelines,
    loadingPipelines,
    lineageData,
    loading,
    error,
    loadPipelines,
    loadLineage,
    domains = [],
    schemas,
    loadingSchemas,
    schemaLineageData,
    loadSchemas,
    loadSchemaLineage,
  } = useLineage();

  const domainsSafe = Array.isArray(domains) ? domains : [];

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const [selectedDomain, setSelectedDomain] = useState({
    id: '__all__',
    name: '전체 도메인',
    region: 'ap-northeast-2',
  });
  const [showDomainDropdown, setShowDomainDropdown] = useState(false);

  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [viewMode, setViewMode] = useState('pipeline');
  const [selectedSchema, setSelectedSchema] = useState(null);
  const [showSchemaDropdown, setShowSchemaDropdown] = useState(false);

  // 노드 상세 패널/데이터
  const [showPanel, setShowPanel] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState(null);

  // PII 값 표시 토글
  const [revealPII, setRevealPII] = useState(false);

  // 🔴 PII 수동 오버라이드(노드별)
  // key: node.id 또는 dataArtifact의 경우 data:<s3-uri>
  // value: { hasPII, types, fields, sampleValues, lastScanAt, scanner, riskScore }
  const [piiOverrides, setPiiOverrides] = useState({});

  // 선택 노드에 대한 오버라이드 키 생성
  const getOverrideKey = (nodeLike) => {
    const n = nodeLike?.data?.nodeData || nodeLike?.nodeData || nodeLike || {};
    if (n.type === 'dataArtifact' && n.uri) return `data:${String(n.uri)}`;
    return String(n.id || n.stepId || n.label || '');
  };

  // 공통 유틸
  const safeValue = (v) => {
    if (v == null) return 'N/A';
    if (typeof v === 'object') {
      if ('Get' in v) return v.Get;
      try {
        return JSON.stringify(v);
      } catch {
        return '[Object]';
      }
    }
    return String(v);
  };

  const formatDuration = (sec) => {
    if (sec == null || isNaN(sec)) return 'N/A';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const getStatusIcon = (status) => {
    const s = safeValue(status);
    if (s === 'Succeeded') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === 'Failed') return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === 'Executing') return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
    return null;
  };

  // ----- PII 메타 추출/플래그 -----
  const extractPIIMeta = (nodeLike) => {
    const n = nodeLike?.data?.nodeData || nodeLike?.nodeData || nodeLike || {};
    const overrideKey = getOverrideKey({ nodeData: n });
    const ov = piiOverrides[overrideKey] || null;

    const base = n?.meta?.pii || n?.pii || {};
    // 오버라이드가 있으면 base 위에 덮어쓰기
    const merged = ov ? { ...base, ...ov } : base;

    const hasPII = Boolean(merged?.hasPII);
    const types = Array.isArray(merged?.types) ? merged.types : [];
    const fields = Array.isArray(merged?.fields) ? merged.fields : [];
    const sampleValues = Array.isArray(merged?.sampleValues) ? merged.sampleValues : [];
    const lastScanAt = merged?.lastScanAt || null;
    const scanner = merged?.scanner || null;
    const riskScore =
      typeof merged?.riskScore === 'number'
        ? merged.riskScore
        : typeof merged?.risk === 'number'
        ? merged.risk
        : null;

    return { hasPII, types, fields, sampleValues, lastScanAt, scanner, riskScore };
  };

  const hasPIIFlag = (nodeLike) => extractPIIMeta(nodeLike).hasPII;

  // ----- 보존기간(만료) 메타/플래그 -----
  const extractRetentionMeta = (nodeLike) => {
    const n = nodeLike?.data?.nodeData || nodeLike?.nodeData || nodeLike || {};
    const retention = n?.meta?.retention || n?.retention || {};
    const expired = Boolean(retention?.expired);
    const matchedIds = Array.isArray(retention?.matchedIds) ? retention.matchedIds : [];
    return { expired, matchedIds, sources: retention?.sources || {} };
  };

  const hasRetentionExpired = (nodeLike) => extractRetentionMeta(nodeLike).expired;

  // 스타일
  const getNodeStyle = (type, status, isSelected, isConnected, isDimmed) => {
    let background = '#f3f4f6';
    let border = '2px solid #9ca3af';
    let opacity = 1;
    let boxShadow = 'none';

    if (status === 'Succeeded') {
      background = '#d1fae5';
      border = '2px solid #10b981';
    } else if (status === 'Failed') {
      background = '#fee2e2';
      border = '2px solid #ef4444';
    } else if (status === 'Executing') {
      background = '#dbeafe';
      border = '2px solid #3b82f6';
    } else if (status === 'Unknown') {
      background = '#f3f4f6';
      border = '2px solid #d1d5db';
    }

    if (type === 'Condition') {
      background = '#fef3c7';
      border = '2px solid #f59e0b';
    }

    if (isSelected) {
      border = '4px solid #dc2626';
      boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.3)';
    } else if (isConnected) {
      border = '3px solid #ef4444';
    }

    if (isDimmed) {
      opacity = 0.15;
    }

    return {
      background,
      border,
      borderRadius: '8px',
      padding: '12px',
      width: '180px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      transition: 'all 0.2s ease',
      boxShadow,
    };
  };

  /**
   * 데이터 노드 스타일
   * - 기본: 하늘색(sky)
   * - PII만: 빨간색(red)
   * - 보존기간만료만: 보라색(violet)
   * - PII+보존기간만료 둘다: 반반(그라디언트)
   */
  const getDataNodeStyle = (
    nodeType,
    isSelected,
    isConnected,
    isDimmed,
    flags = { pii: false, retention: false }
  ) => {
    const redBg = '#fee2e2'; // red-100
    const redBd = '#ef4444'; // red-500
    const skyBg = '#e0f2fe'; // sky-100
    const skyBd = '#0284c7'; // sky-600
    const vioBg = '#ede9fe'; // violet-100
    const vioBd = '#7c3aed'; // violet-600

    let border = `2px solid ${skyBd}`;
    let opacity = 1;
    let background = skyBg;
    let boxShadow = 'none';

    if (nodeType === 'dataArtifact') {
      if (flags.pii && flags.retention) {
        // 반반(좌: 빨강, 우: 보라)
        background = `linear-gradient(90deg, ${redBg} 50%, ${vioBg} 50%)`;
        // 테두리는 보라색으로 통일
        border = `2px solid ${vioBd}`;
      } else if (flags.pii) {
        background = redBg;
        border = `2px solid ${redBd}`;
      } else if (flags.retention) {
        background = vioBg;
        border = `2px solid ${vioBd}`;
      } else {
        background = skyBg;
        border = `2px solid ${skyBd}`;
      }
    } else {
      background = '#f0fdf4'; // green-50
      border = '2px solid #16a34a'; // green-600
    }

    if (isSelected) {
      border = '4px solid #dc2626';
      boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.3)';
    } else if (isConnected) {
      border = '3px solid #ef4444';
    }

    if (isDimmed) {
      opacity = 0.15;
    }

    return {
      background,
      border,
      borderRadius: '8px',
      padding: '12px',
      width: '180px',
      height: '80px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
      transition: 'all 0.2s ease',
      boxShadow,
    };
  };

  const getPipelineStepOrder = () => {
    return ['Extract', 'Validate', 'Preprocess', 'Train', 'Evaluate', 'ModelQualityCheck'];
  };

  // 연결 탐색
  const getAllConnectedNodes = useCallback((nodeId, edges) => {
    const connected = new Set([nodeId]);
    const toVisit = [nodeId];
    const visited = new Set();

    while (toVisit.length > 0) {
      const current = toVisit.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      edges.forEach((edge) => {
        if (edge.source === current && !connected.has(edge.target)) {
          connected.add(edge.target);
          toVisit.push(edge.target);
        }
        if (edge.target === current && !connected.has(edge.source)) {
          connected.add(edge.source);
          toVisit.push(edge.source);
        }
      });
    }
    return connected;
  }, []);

  const getConnectedEdges = useCallback((connectedNodeIds, edges) => {
    const connectedEdgeIds = new Set();
    edges.forEach((edge) => {
      if (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)) {
        connectedEdgeIds.add(edge.id);
      }
    });
    return connectedEdgeIds;
  }, []);

  // 클릭 핸들러
  const handlePaneClick = () => {
    setSelectedNode(null);
    setSelectedNodeData(null);
    setShowPanel(false);
  };

  const handleNodeClick = useCallback((event, node) => {
    const nodeData = node.data?.nodeData || node.data || {};
    setSelectedNode(node);
    setSelectedNodeData(nodeData);
    setShowPanel(true);
  }, []);

  const onNodeClick = useCallback(
    (event, node) => {
      setSelectedNode(node.id);
      setShowPanel(true);
      setSelectedNodeData(node.data.nodeData || null);

      const connectedNodeIds = getAllConnectedNodes(node.id, edges);
      const connectedEdgeIds = getConnectedEdges(connectedNodeIds, edges);

      setNodes((nds) =>
        nds.map((n) => {
          const isSelected = n.id === node.id;
          const isConnected = connectedNodeIds.has(n.id) && !isSelected;
          const isDimmed = !connectedNodeIds.has(n.id);
          const nodeType = n.data.nodeData?.type;

          if (nodeType === 'dataArtifact' || nodeType === 'processNode') {
            const pii = hasPIIFlag(n);
            const retention = hasRetentionExpired(n);
            return {
              ...n,
              style: getDataNodeStyle(nodeType, isSelected, isConnected, isDimmed, {
                pii,
                retention,
              }),
            };
          }
          return {
            ...n,
            style: getNodeStyle(
              n.data.nodeData?.type || n.data.nodeData?.stepType,
              n.data.nodeData?.run?.status,
              isSelected,
              isConnected,
              isDimmed
            ),
          };
        })
      );

      setEdges((eds) =>
        eds.map((e) => {
          const isConnected = connectedEdgeIds.has(e.id);
          return {
            ...e,
            animated: false,
            style: {
              ...e.style,
              stroke: isConnected
                ? '#ef4444'
                : e.style?.originalStroke || e.style?.stroke || '#9ca3af',
              strokeDasharray: isConnected ? '5,5' : 'none',
              opacity: isConnected ? 1 : 0.1,
              strokeWidth: isConnected ? 3 : 2,
            },
          };
        })
      );
    },
    [edges, setNodes, setEdges, getAllConnectedNodes, getConnectedEdges]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);

    setNodes((nds) =>
      nds.map((n) => {
        const nodeType = n.data.nodeData?.type;
        if (nodeType === 'dataArtifact' || nodeType === 'processNode') {
          const pii = hasPIIFlag(n);
          const retention = hasRetentionExpired(n);
          return {
            ...n,
            style: getDataNodeStyle(nodeType, false, false, false, { pii, retention }),
          };
        }
        return {
          ...n,
          style: getNodeStyle(
            n.data.nodeData?.type || n.data.nodeData?.stepType,
            n.data.nodeData?.run?.status,
            false,
            false,
            false
          ),
        };
      })
    );

    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: false,
        style: {
          ...e.style,
          stroke: e.style?.originalStroke || e.style?.stroke || '#9ca3af',
          strokeDasharray: 'none',
          opacity: 1,
          strokeWidth: 2,
        },
      }))
    );
  }, [setNodes, setEdges]);

  // 그래프 빌더 (파이프라인 관점)
  const buildPipelineGraph = useCallback((lineageData) => {
    if (!lineageData?.graphPipeline?.nodes) return { nodes: [], edges: [] };

    const graphData = lineageData.graphPipeline;
    const stepOrder = getPipelineStepOrder();
    const newNodes = [];
    const newEdges = [];

    const sortedNodes = [...graphData.nodes].sort((a, b) => {
      const orderA = stepOrder.indexOf(a.id);
      const orderB = stepOrder.indexOf(b.id);
      if (orderA === -1) return 1;
      if (orderB === -1) return -1;
      return orderA - orderB;
    });

    const nodeSpacing = 250;
    const startX = 50;
    const fixedY = 250;

    sortedNodes.forEach((node, index) => {
      const nodeId = node.id;
      const nodeType = node.type;
      const status = node.run?.status || 'Unknown';

      newNodes.push({
        id: nodeId,
        type: 'default',
        data: {
          label: (
            <div style={{ textAlign: 'center', width: '100%' }}>
              <div
                style={{
                  fontWeight: 'bold',
                  fontSize: '13px',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {getStatusIcon(status)}
                <span>{node.label || nodeId}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>{nodeType}</div>
              {node.run?.elapsedSec != null && node.run.elapsedSec > 0 && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {formatDuration(node.run.elapsedSec)}
                </div>
              )}
            </div>
          ),
          nodeData: node,
        },
        style: getNodeStyle(nodeType, status, false, false, false),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: {
          x: startX + index * nodeSpacing,
          y: fixedY,
        },
        draggable: false,
      });
    });

    for (let i = 1; i < sortedNodes.length; i++) {
      const prevNode = sortedNodes[i - 1];
      const currNode = sortedNodes[i];

      newEdges.push({
        id: `edge-${prevNode.id}-${currNode.id}`,
        source: prevNode.id,
        target: currNode.id,
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#9ca3af', strokeWidth: 2, originalStroke: '#9ca3af' },
      });
    }

    return { nodes: newNodes, edges: newEdges };
  }, []);

  // 그래프 빌더 (데이터 관점)
  const buildDataGraph = useCallback(
    (lineageData) => {
      if (!lineageData?.graphData?.nodes) return { nodes: [], edges: [] };

      const graphData = lineageData.graphData;
      const pipelineNodes = lineageData.graphPipeline?.nodes || [];
      const stepOrder = getPipelineStepOrder();

      const newNodes = [];
      const newEdges = [];
      const dataNodeMap = new Map();
      const processNodeMap = new Map();

      graphData.nodes.forEach((node) => {
        if (node.type === 'processNode') {
          processNodeMap.set(node.id, node);
        } else if (node.type === 'dataArtifact') {
          dataNodeMap.set(node.id, node);
        }
      });

      const sortedProcessNodes = Array.from(processNodeMap.values()).sort((a, b) => {
        const orderA = stepOrder.indexOf(a.stepId);
        const orderB = stepOrder.indexOf(b.stepId);
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      });

      sortedProcessNodes.forEach((processNode) => {
        const status = processNode.run?.status || 'Unknown';

        newNodes.push({
          id: processNode.id,
          type: 'default',
          data: {
            label: (
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div
                  style={{
                    fontWeight: 'bold',
                    fontSize: '12px',
                    marginBottom: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                  }}
                >
                  {getStatusIcon(status)}
                  <span>{processNode.label || 'Process'}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>
                  {processNode.stepType || 'Processing'}
                </div>
                {processNode.run?.elapsedSec != null && processNode.run.elapsedSec > 0 && (
                  <div style={{ fontSize: '9px', color: '#9ca3af', marginTop: '2px' }}>
                    {formatDuration(processNode.run.elapsedSec)}
                  </div>
                )}
              </div>
            ),
            nodeData: processNode,
          },
          style: getDataNodeStyle('processNode', false, false, false),
          position: { x: 0, y: 0 },
          draggable: false,
        });

        const pipelineNode = pipelineNodes.find((pn) => pn.id === processNode.stepId);
        if (pipelineNode?.inputs) {
          pipelineNode.inputs.forEach((input) => {
            const uri = safeValue(input.uri);
            if (
              uri &&
              uri !== 'N/A' &&
              !uri.includes('Get') &&
              !uri.includes('Std:Join') &&
              uri.startsWith('s3://')
            ) {
              const dataNodeId = `data:${uri}`;
              if (dataNodeMap.has(dataNodeId) && !newNodes.find((n) => n.id === dataNodeId)) {
                const dataNode = dataNodeMap.get(dataNodeId);
                const pii = hasPIIFlag({ data: { nodeData: dataNode } });
                const retention = hasRetentionExpired({ data: { nodeData: dataNode } });

                newNodes.push({
                  id: dataNodeId,
                  type: 'default',
                  data: {
                    label: (
                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div
                          style={{
                            fontWeight: 'bold',
                            fontSize: '11px',
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <Database className="w-3 h-3 text-blue-600" />
                          <span>{input.name || 'Data'}</span>

                          {/* 뱃지: PII / EXP(ired) */}
                          {pii && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 9999,
                                background: '#fee2e2',
                                color: '#b91c1c',
                                border: '1px solid #fecaca',
                                fontWeight: 700,
                              }}
                              title="PII detected"
                            >
                              PII
                            </span>
                          )}
                          {retention && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '2px 6px',
                                borderRadius: 9999,
                                background: '#ede9fe',
                                color: '#5b21b6',
                                border: '1px solid #ddd6fe',
                                fontWeight: 700,
                              }}
                              title="Retention expired"
                            >
                              EXP
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: '9px',
                            color: '#6b7280',
                            wordBreak: 'break-all',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '160px',
                            margin: '0 auto',
                          }}
                        >
                          {uri.split('/').slice(-1)[0]}
                        </div>
                      </div>
                    ),
                    nodeData: dataNode,
                  },
                  style: getDataNodeStyle('dataArtifact', false, false, false, {
                    pii,
                    retention,
                  }),
                  position: { x: 0, y: 0 },
                  draggable: false,
                });

                // 엣지 색상 규칙:
                //  - PII만: 빨강
                //  - 보존만료만: 보라
                //  - 둘 다: 보라 + 점선 (라벨로 PII+EXP)
                const strokeBase = pii && retention ? '#7c3aed' : retention ? '#7c3aed' : pii ? '#ef4444' : '#0284c7';
                const dashed = pii && retention ? '6,3' : 'none';
                const label = pii && retention ? 'PII+EXP' : retention ? 'EXP' : pii ? 'PII' : undefined;

                newEdges.push({
                  id: `edge-data-${dataNodeId}-${processNode.id}`,
                  source: dataNodeId,
                  target: processNode.id,
                  type: 'smoothstep',
                  animated: false,
                  label,
                  style: {
                    stroke: strokeBase,
                    strokeWidth: 2,
                    strokeDasharray: dashed,
                    originalStroke: strokeBase,
                  },
                });
              }
            }
          });
        }

        const currentIndex = sortedProcessNodes.indexOf(processNode);
        if (currentIndex > 0) {
          const prevProcess = sortedProcessNodes[currentIndex - 1];
          newEdges.push({
            id: `edge-proc-${prevProcess.id}-${processNode.id}`,
            source: prevProcess.id,
            target: processNode.id,
            type: 'smoothstep',
            animated: false,
            style: { stroke: '#16a34a', strokeWidth: 2, originalStroke: '#16a34a' },
          });
        }
      });

      // 레이아웃
      const dagreGraph = new dagre.graphlib.Graph();
      dagreGraph.setDefaultEdgeLabel(() => ({}));
      dagreGraph.setGraph({ rankdir: 'LR', nodesep: 100, ranksep: 150, ranker: 'network-simplex' });

      const nodeW = 180;
      const nodeH = 80;

      newNodes.forEach((n) => dagreGraph.setNode(n.id, { width: nodeW, height: nodeH }));
      newEdges.forEach((e) => dagreGraph.setEdge(e.source, e.target));

      try {
        dagre.layout(dagreGraph);
        const layoutedNodes = newNodes.map((n) => {
          const pos = dagreGraph.node(n.id);
          if (!pos) {
            return {
              ...n,
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
              position: { x: 0, y: 0 },
            };
          }
          return {
            ...n,
            sourcePosition: Position.Right,
            targetPosition: Position.Left,
            position: {
              x: pos.x - nodeW / 2,
              y: pos.y - nodeH / 2,
            },
          };
        });
        return { nodes: layoutedNodes, edges: newEdges };
      } catch (e) {
        console.error('Dagre layout error:', e);
        return { nodes: newNodes, edges: newEdges };
      }
    },
    [piiOverrides] // 오버라이드 변화 시 스타일 갱신
  );

  // 데이터셋 하이라이트 (기존 로직 유지)
  const buildDatasetGraph = useCallback(
    (schemaLineageData, lineageData) => {
      if (
        !schemaLineageData ||
        !schemaLineageData.tables ||
        schemaLineageData.tables.length === 0 ||
        !lineageData
      ) {
        return { nodes: [], edges: [] };
      }
      const { nodes: baseNodes, edges: baseEdges } = buildDataGraph(lineageData);
      if (!baseNodes.length) return { nodes: [], edges: [] };

      const table = schemaLineageData.tables[0];
      const tableName = (table.name || '').toLowerCase();
      const synonyms = [tableName].filter(Boolean);
      if (tableName === 'evaluation') synonyms.push('evaluate', 'eval');

      const linkUris = [
        ...(table.links || []),
        ...(schemaLineageData.columns || [])
          .filter((c) => (c.tableId || c.table_id || c.table) === table.id)
          .flatMap((c) => c.links || []),
      ]
        .map(String)
        .filter(Boolean);
      const explicitLinks = new Set(linkUris);

      const isUriMatch = (uriRaw) => {
        if (!uriRaw) return false;
        const uri = String(uriRaw);
        const lower = uri.toLowerCase();
        for (const link of explicitLinks) {
          if (!link) continue;
          if (uri === link || uri.startsWith(link)) return true;
        }
        for (const name of synonyms) {
          if (!name) continue;
          if (lower.includes(`/${name}/`)) return true;
          if (lower.endsWith(`/${name}`)) return true;
          if (lower.endsWith(`/${name}.csv`)) return true;
          if (lower.endsWith(`/${name}.parquet`)) return true;
          if (lower.includes(`/${name}_`)) return true;
          if (lower.includes(`_${name}.`)) return true;
        }
        if (tableName === 'evaluation') {
          if (lower.includes('/eval/')) return true;
          if (lower.endsWith('/eval')) return true;
          if (lower.includes('_eval')) return true;
          if (lower.includes('evaluate')) return true;
        }
        return false;
      };

      const dataNodes = baseNodes.filter((n) => {
        const t = n.data?.nodeData?.type || n.data?.type || n.type;
        return t === 'dataArtifact';
      });

      const seedIds = new Set(
        dataNodes
          .filter((n) => {
            const uri = n.data?.nodeData?.uri || n.data?.uri || n.uri;
            return isUriMatch(uri);
          })
          .map((n) => n.id)
      );

      if (seedIds.size === 0) {
        const DIM = 0.25;
        return {
          nodes: baseNodes.map((n) => ({
            ...n,
            style: { ...(n.style || {}), opacity: DIM },
            data: { ...(n.data || {}), isDimmed: true },
          })),
          edges: baseEdges.map((e) => ({
            ...e,
            style: { ...(e.style || {}), opacity: DIM },
          })),
        };
      }

      const activeNodeIds = new Set(seedIds);
      const activeEdgeIds = new Set();
      baseEdges.forEach((e) => {
        const sourceIsSeed = seedIds.has(e.source);
        const targetIsSeed = seedIds.has(e.target);
        if (sourceIsSeed && !targetIsSeed) {
          activeNodeIds.add(e.target);
          activeEdgeIds.add(e.id);
        } else if (targetIsSeed && !sourceIsSeed) {
          activeNodeIds.add(e.source);
          activeEdgeIds.add(e.id);
        }
      });

      const DIM = 0.3;
      return {
        nodes: baseNodes.map((n) => {
          const active = activeNodeIds.has(n.id);
          return {
            ...n,
            style: { ...(n.style || {}), opacity: active ? 1 : DIM },
            data: { ...(n.data || {}), isDimmed: !active },
          };
        }),
        edges: baseEdges.map((e) => {
          const active = activeEdgeIds.has(e.id);
          return {
            ...e,
            style: { ...(e.style || {}), opacity: active ? 1 : DIM },
            animated: active && e.animated,
          };
        }),
      };
    },
    [buildDataGraph]
  );

  // 데이터 로딩 & 그래프 갱신
  useEffect(() => {
    loadPipelines({ regions: 'ap-northeast-2', includeLatestExec: true });
  }, [loadPipelines]);

  useEffect(() => {
    if (!lineageData) return;

    if (viewMode === 'schema' && schemaLineageData) {
      const { nodes, edges } = buildDatasetGraph(schemaLineageData, lineageData);
      setNodes(nodes);
      setEdges(edges);
      setSelectedNode(null);
      setSelectedNodeData(null);
      setShowPanel(false);
      return;
    }

    if (viewMode === 'pipeline') {
      const { nodes, edges } = buildPipelineGraph(lineageData);
      setNodes(nodes);
      setEdges(edges);
    } else if (viewMode === 'data') {
      const { nodes, edges } = buildDataGraph(lineageData);
      setNodes(nodes);
      setEdges(edges);
    }

    setSelectedNode(null);
    setSelectedNodeData(null);
    setShowPanel(false);
  }, [
    viewMode,
    selectedSchema,
    lineageData,
    schemaLineageData,
    buildPipelineGraph,
    buildDataGraph,
    buildDatasetGraph,
    piiOverrides, // 오버라이드 반영
  ]);

  // 핸들러
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);
    if (mode !== 'schema') setSelectedSchema(null);
  };

  const handlePipelineSelect = useCallback(
    async (pipeline) => {
      setSelectedPipeline(pipeline);
      setShowDropdown(false);
      setViewMode('pipeline');
      setSelectedSchema(null);

      const region = pipeline.region || 'ap-northeast-2';
      let domain = null;
      if (pipeline.matchedDomain?.domainName) domain = pipeline.matchedDomain.domainName;
      else if (pipeline.tags?.DomainName) domain = pipeline.tags.DomainName;

      await loadLineage(pipeline.name, region, domain);
    },
    [loadLineage]
  );

  const handleSchemaSelect = useCallback(
    async (schema) => {
      if (!schema || !selectedPipeline) return;
      setSelectedSchema(schema);
      setShowSchemaDropdown(false);
      await loadSchemaLineage(
        schema.name,
        selectedPipeline.name,
        selectedPipeline.region || 'ap-northeast-2'
      );
      setViewMode('schema');
      setShowPanel(false);
      setSelectedNode(null);
    },
    [loadSchemaLineage, selectedPipeline]
  );

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setShowDomainDropdown(false);
    setSelectedPipeline(null);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);
  };

  const getDomainPipelineCount = (domainId) => {
    if (domainId === '__untagged__') {
      return pipelines.filter((p) => {
        const hasDomainTag = p.matchedDomain || (p.tags && p.tags['sagemaker:domain-arn']);
        return !hasDomainTag;
      }).length;
    }
    return pipelines.filter((p) => {
      if (p.matchedDomain) return p.matchedDomain.domainId === domainId;
      if (p.tags && p.tags['sagemaker:domain-arn']) {
        return p.tags['sagemaker:domain-arn'].includes(domainId);
      }
      return false;
    }).length;
  };

  // 렌더링
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 mr-6">Lineage</h1>

        {/* 도메인 선택 */}
        <div className="relative mr-4">
          <button
            onClick={() => setShowDomainDropdown(!showDomainDropdown)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            <span className="text-sm font-medium">{selectedDomain.name}</span>
            <ChevronDown className="w-4 h-4" />
          </button>

          {showDomainDropdown && (
            <div className="absolute top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              <div
                onClick={() =>
                  handleDomainSelect({ id: '__all__', name: '전체 도메인', region: 'ap-northeast-2' })
                }
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
              >
                <div className="font-medium text-sm">전체 도메인</div>
                <div className="text-xs text-gray-500 mt-1">모든 파이프라인 ({pipelines.length}개)</div>
              </div>

              {domainsSafe.map((domain) => (
                <div
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain)}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  <div className="font-medium text-sm">{domain.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {domain.region} | {getDomainPipelineCount(domain.id)}개
                  </div>
                </div>
              ))}

              <div
                onClick={() =>
                  handleDomainSelect({ id: '__untagged__', name: '태그 없음', region: 'ap-northeast-2' })
                }
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
              >
                <div className="font-medium text-sm">태그 없음</div>
                <div className="text-xs text-gray-500 mt-1">{getDomainPipelineCount('__untagged__')}개</div>
              </div>
            </div>
          )}
        </div>

        {/* 파이프라인 선택 */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loadingPipelines}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loadingPipelines ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">로딩 중...</span>
              </>
            ) : (
              <>
                <span className="text-sm font-medium max-w-md truncate">
                  {selectedPipeline ? selectedPipeline.name : '파이프라인 선택'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </button>

          {showDropdown && !loadingPipelines && (
            <div className="absolute top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {(() => {
                const list =
                  selectedDomain.id === '__all__'
                    ? pipelines
                    : selectedDomain.id === '__untagged__'
                    ? pipelines.filter((p) => {
                        const hasDomainTag =
                          p.matchedDomain || (p.tags && p.tags['sagemaker:domain-arn']);
                        return !hasDomainTag;
                      })
                    : pipelines.filter((p) => {
                        if (p.matchedDomain) return p.matchedDomain.domainId === selectedDomain.id;
                        if (p.tags && p.tags['sagemaker:domain-arn']) {
                          return p.tags['sagemaker:domain-arn'].includes(selectedDomain.id);
                        }
                        return false;
                      });

                if (list.length === 0) {
                  return <div className="px-4 py-8 text-center text-gray-500">파이프라인이 없습니다</div>;
                }

                return list.map((pipeline) => (
                  <div
                    key={pipeline.arn}
                    onClick={() => handlePipelineSelect(pipeline)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                  >
                    <div className="font-medium text-sm">{pipeline.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{pipeline.region}</div>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>

        {/* 관점/스키마 */}
        {selectedPipeline && lineageData && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleViewModeChange('pipeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'pipeline'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              <span className="text-sm font-medium">파이프라인 관점</span>
            </button>
            <button
              onClick={() => handleViewModeChange('data')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                viewMode === 'data'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span className="text-sm font-medium">데이터 관점</span>
            </button>

            <div className="relative ml-2">
              <button
                onClick={async () => {
                  const next = !showSchemaDropdown;
                  setShowSchemaDropdown(next);
                  if (next && selectedPipeline) {
                    await loadSchemas(
                      selectedPipeline.name,
                      selectedPipeline.region || 'ap-northeast-2'
                    );
                  }
                }}
                disabled={!selectedPipeline}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  viewMode === 'schema'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-sm font-medium">
                  {selectedSchema ? `데이터셋: ${selectedSchema.name}` : '데이터셋 선택'}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {showSchemaDropdown && (
                <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {loadingSchemas ? (
                    <div className="text-center py-4 text-gray-500">불러오는 중...</div>
                  ) : schemas && schemas.length > 0 ? (
                    schemas.map((table) => {
                      const isActive = selectedSchema?.name === table.name;
                      return (
                        <div
                          key={table.name}
                          onClick={() => handleSchemaSelect(table)}
                          className={`px-4 py-2 cursor-pointer border-b ${
                            isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'hover:bg-gray-50'
                          }`}
                        >
                          <div className="font-medium text-sm">{table.name}</div>
                          <div className="text-xs text-gray-500">
                            {(table.columns || []).length} columns
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4 text-gray-500">데이터셋 정보가 없습니다</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedPipeline && (
          <button
            onClick={() => {
              setSelectedPipeline(null);
              setNodes([]);
              setEdges([]);
            }}
            className="ml-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75 z-10">
            <div className="text-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">라인리지를 불러오는 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center max-w-md">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-2" />
              <p className="text-red-600 font-semibold mb-2">오류가 발생했습니다</p>
              <p className="text-gray-600 text-sm">{error}</p>
            </div>
          </div>
        ) : nodes.length > 0 ? (
          <div className="h-full w-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={handleNodeClick}
              onPaneClick={handlePaneClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              attributionPosition="bottom-left"
            >
              <Background color="#e5e7eb" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg font-medium">파이프라인을 선택하세요</p>
            </div>
          </div>
        )}

        {/* 상세 패널 */}
        {showPanel && selectedNodeData && (
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 className="text-lg font-bold">Step Details</h3>
                <button
                  onClick={() => {
                    setShowPanel(false);
                    onPaneClick();
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-sm">
                {/* Basic Information */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-blue-600 rounded" />
                    <h4 className="font-bold text-gray-800">Basic Information</h4>
                  </div>
                  <div className="space-y-3 pl-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Step ID</div>
                      <div className="font-medium break-all">
                        {selectedNodeData.id || selectedNodeData.label}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <div className="font-medium">
                        {safeValue(selectedNodeData.type || selectedNodeData.stepType)}
                      </div>
                    </div>

                    {selectedNodeData.run?.status && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Status</div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedNodeData.run.status)}
                          <span className="font-medium">
                            {safeValue(selectedNodeData.run.status)}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedNodeData.run?.jobName && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Job Name</div>
                        <div className="font-mono text-xs break-all">
                          {selectedNodeData.run.jobName}
                        </div>
                      </div>
                    )}
                    {selectedNodeData.run?.jobArn && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Job ARN</div>
                        <div className="font-mono text-xs break-all text-gray-600">
                          {selectedNodeData.run.jobArn}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Execution Info */}
                {selectedNodeData.run && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded" />
                      <h4 className="font-bold text-gray-800">Execution Info</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      {selectedNodeData.run.startTime && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Start Time</div>
                          <div className="font-medium">
                            {new Date(selectedNodeData.run.startTime).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })}
                          </div>
                        </div>
                      )}
                      {selectedNodeData.run.endTime && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">End Time</div>
                          <div className="font-medium">
                            {new Date(selectedNodeData.run.endTime).toLocaleString('ko-KR', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                              hour12: false,
                            })}
                          </div>
                        </div>
                      )}
                      {selectedNodeData.run.elapsedSec != null && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Duration</div>
                          <div className="font-medium">
                            {formatDuration(selectedNodeData.run.elapsedSec)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Data Location (dataArtifact 전용) */}
                {selectedNodeData.type === 'dataArtifact' && selectedNodeData.uri && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded" />
                      <h4 className="font-bold text-gray-800">Data Location</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      <div className="font-mono text-xs break-all text-blue-600 mb-3">
                        {selectedNodeData.uri}
                      </div>

                      {selectedNodeData.meta?.s3 && (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Bucket</div>
                            <div className="font-medium">
                              {selectedNodeData.meta.s3.bucket}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Region</div>
                            <div className="font-medium">
                              {selectedNodeData.meta.s3.region}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Encryption</div>
                            <div className="font-medium">
                              {selectedNodeData.meta.s3.encryption}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Versioning</div>
                            <div className="font-medium">
                              {selectedNodeData.meta.s3.versioning}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Public Access</div>
                            <div
                              className={`font-medium ${
                                selectedNodeData.meta.s3.publicAccess === 'Blocked'
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {selectedNodeData.meta.s3.publicAccess}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 🔴 PII Detection (dataArtifact 전용) */}
                {selectedNodeData.type === 'dataArtifact' && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-5 bg-red-600 rounded" />
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                          PII Detection
                          <ShieldAlert className="w-4 h-4 text-red-600" />
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRevealPII((v) => !v)}
                          className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-50"
                          title={revealPII ? '가려보기' : '일부 보기'}
                        >
                          {revealPII ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {revealPII ? 'Mask' : 'Unmask'}
                        </button>

                        {/* 수동 오버라이드 버튼 */}
                        {(() => {
                          const key = getOverrideKey({ nodeData: selectedNodeData });
                          const override = piiOverrides[key];
                          return override?.hasPII ? (
                            <button
                              onClick={() =>
                                setPiiOverrides((prev) => {
                                  const next = { ...prev };
                                  delete next[key];
                                  return next;
                                })
                              }
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                              title="이 노드의 PII 강제 표시 해제"
                            >
                              강제 해제
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const now = new Date().toISOString();
                                setPiiOverrides((prev) => ({
                                  ...prev,
                                  [key]: {
                                    hasPII: true,
                                    types: ['NAME', 'EMAIL'],
                                    fields: ['customer_name', 'email'],
                                    sampleValues: ['홍길동', 'test@example.com'],
                                    lastScanAt: now,
                                    scanner: 'Manual-Override',
                                    riskScore: 80,
                                  },
                                }));
                              }}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                              title="이 노드를 PII 있음으로 강제 표시"
                            >
                              강제로 PII 표시
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {(() => {
                      const { hasPII, types, fields, sampleValues, lastScanAt, scanner, riskScore } =
                        extractPIIMeta({ nodeData: selectedNodeData });

                      return (
                        <div className="space-y-3 pl-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Has PII</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border ${
                                hasPII
                                  ? 'bg-red-50 text-red-700 border-red-200'
                                  : 'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {hasPII ? 'Yes' : 'No'}
                            </span>
                            {typeof riskScore === 'number' && (
                              <span className="ml-2 text-xs text-gray-500">
                                Risk Score:{' '}
                                <span
                                  className={`font-semibold ${
                                    riskScore >= 70
                                      ? 'text-red-600'
                                      : riskScore >= 40
                                      ? 'text-yellow-600'
                                      : 'text-green-600'
                                  }`}
                                >
                                  {riskScore}
                                </span>
                              </span>
                            )}
                          </div>

                          {types?.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Types</div>
                              <div className="flex flex-wrap gap-1">
                                {types.map((t, i) => (
                                  <span
                                    key={`${t}-${i}`}
                                    className="px-2 py-0.5 text-xs rounded-full bg-gray-100 border border-gray-200"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {fields?.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Fields</div>
                              <div className="flex flex-wrap gap-1">
                                {fields.map((f, i) => (
                                  <span
                                    key={`${f}-${i}`}
                                    className="px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 border border-blue-200"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {sampleValues?.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Samples</div>
                              <ul className="space-y-1">
                                {sampleValues.slice(0, 5).map((v, i) => {
                                  const masked =
                                    typeof v === 'string' && !revealPII
                                      ? v.replace(/[\S]/g, (c, idx) => (idx % 3 === 0 ? c : '•'))
                                      : v;
                                  return (
                                    <li
                                      key={`sv-${i}`}
                                      className="font-mono text-xs break-all bg-gray-50 border border-gray-200 rounded px-2 py-1"
                                    >
                                      {masked}
                                    </li>
                                  );
                                })}
                              </ul>
                              {!revealPII && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  일부 문자는 마스킹되어 표시됩니다.
                                </div>
                              )}
                            </div>
                          )}

                          {(lastScanAt || scanner) && (
                            <div className="text-xs text-gray-500">
                              {scanner && <span>Scanner: {scanner}</span>}
                              {scanner && lastScanAt && <span className="mx-1">·</span>}
                              {lastScanAt && (
                                <span>
                                  Last Scan{' '}
                                  {new Date(lastScanAt).toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: false,
                                  })}
                                </span>
                              )}
                            </div>
                          )}

                          {!hasPII && types.length === 0 && fields.length === 0 && (
                            <div className="text-xs text-gray-500">
                              스캔 결과 PII 항목이 발견되지 않았습니다.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 🟣 Retention (dataArtifact 전용) */}
                {selectedNodeData.type === 'dataArtifact' && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-violet-600 rounded" />
                      <h4 className="font-bold text-gray-800">Retention Status</h4>
                    </div>
                    {(() => {
                      const { expired, matchedIds, sources } = extractRetentionMeta({
                        nodeData: selectedNodeData,
                      });
                      return (
                        <div className="space-y-3 pl-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Expired</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full border ${
                                expired
                                  ? 'bg-violet-50 text-violet-700 border-violet-200'
                                  : 'bg-green-50 text-green-700 border-green-200'
                              }`}
                            >
                              {expired ? 'Yes' : 'No'}
                            </span>
                            {expired && (
                              <span className="ml-2 text-xs text-gray-500">
                                Matched IDs: <span className="font-semibold">{matchedIds.length}</span>
                              </span>
                            )}
                          </div>
                          {expired && matchedIds.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Sample IDs</div>
                              <ul className="space-y-1">
                                {matchedIds.slice(0, 5).map((v, i) => (
                                  <li
                                    key={`mid-${i}`}
                                    className="font-mono text-xs break-all bg-gray-50 border border-gray-200 rounded px-2 py-1"
                                  >
                                    {v}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="text-[11px] text-gray-500">
                            Sources: RDS Report {sources?.rdsReport ? '✔' : '✖'} · Cross-Check{' '}
                            {sources?.crossCheckReport ? '✔' : '✖'}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 요약 */}
      {selectedPipeline && lineageData?.summary && (
        <div className="h-32 p-4 bg-white border-t border-gray-200 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4 h-full">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-sm text-gray-600">Overall Status</p>
              <div className="flex items-center gap-2 mt-1">
                {getStatusIcon(lineageData.summary.overallStatus)}
                <p className="text-xl font-bold">{safeValue(lineageData.summary.overallStatus)}</p>
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-sm text-gray-600">Failed Steps</p>
              <p className="text-2xl font-bold text-red-600">
                {lineageData.summary.nodeStatus?.Failed || 0}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-sm text-gray-600">Total Steps</p>
              <p className="text-2xl font-bold">{nodes.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-2xl font-bold">{formatDuration(lineageData.summary.elapsedSec)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lineage;
