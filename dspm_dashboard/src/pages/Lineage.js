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
import { X, Database, Clock, CheckCircle, XCircle, Loader, RefreshCw, ChevronDown, GitBranch, Layers } from 'lucide-react';
import { useLineage } from '../hooks/useLineage';

const Lineage = () => {
  const { 
    lineageData, 
    loading, 
    error, 
    loadLineage,
    pipelines = [],
    domains = [],
    loadingPipelines,
    loadPipelines,
  } = useLineage();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [showPanel, setShowPanel] = useState(false);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showPipelineList, setShowPipelineList] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDomainDropdown, setShowDomainDropdown] = useState(false); 
  const [selectedDomain, setSelectedDomain] = useState({ id: '__all__', name: '전체 도메인', region: 'ap-northeast-2' });
  const [viewMode, setViewMode] = useState('pipeline');

  const getDomainPipelineCount = (domainId) => {
    if (domainId === '__untagged__') {
      return pipelines.filter(p => {
        const hasDomainTag = p.matchedDomain || (p.tags && p.tags['sagemaker:domain-arn']);
        return !hasDomainTag;
      }).length;
    }
    
    return pipelines.filter(p => {
      if (p.matchedDomain) return p.matchedDomain.domainId === domainId;
      if (p.tags && p.tags['sagemaker:domain-arn']) {
        return p.tags['sagemaker:domain-arn'].includes(domainId);
      }
      return false;
    }).length;
  };

  const filteredPipelines = selectedDomain 
    ? selectedDomain.id === '__all__'
      ? pipelines
      : selectedDomain.id === '__untagged__'
        ? pipelines.filter(p => {
            const hasDomainTag = p.matchedDomain || (p.tags && p.tags['sagemaker:domain-arn']);
            return !hasDomainTag;
          })
        : pipelines.filter(p => {
            if (p.matchedDomain) return p.matchedDomain.domainId === selectedDomain.id;
            if (p.tags && p.tags['sagemaker:domain-arn']) {
              return p.tags['sagemaker:domain-arn'].includes(selectedDomain.id);
            }
            return false;
          })
    : pipelines;

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
    }
    else if (isConnected) {
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

  const getStatusIcon = (status) => {
    const s = safeValue(status);
    if (s === 'Succeeded') return <CheckCircle className="w-4 h-4 text-green-600" />;
    if (s === 'Failed') return <XCircle className="w-4 h-4 text-red-600" />;
    if (s === 'Executing') return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
    return null;
  };

  const getDataNodeStyle = (nodeType, isSelected, isConnected, isDimmed) => {
    let border = '2px solid #0284c7';
    let opacity = 1;
    let background = '#e0f2fe';
    let boxShadow = 'none';

    if (nodeType === 'dataArtifact') {
      background = '#e0f2fe';
      border = '2px solid #0284c7';
    } else {
      background = '#f0fdf4';
      border = '2px solid #16a34a';
    }

    if (isSelected) {
      border = '4px solid #dc2626';
      boxShadow = '0 0 0 4px rgba(220, 38, 38, 0.3)';
    }
    else if (isConnected) {
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

  const getAllConnectedNodes = useCallback((nodeId, edges) => {
    const connected = new Set([nodeId]);
    const toVisit = [nodeId];
    const visited = new Set();

    while (toVisit.length > 0) {
      const current = toVisit.pop();
      if (visited.has(current)) continue;
      visited.add(current);

      edges.forEach(edge => {
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
    
    edges.forEach(edge => {
      if (connectedNodeIds.has(edge.source) && connectedNodeIds.has(edge.target)) {
        connectedEdgeIds.add(edge.id);
      }
    });

    return connectedEdgeIds;
  }, []);

  const onNodeClick = useCallback((event, node) => {
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

        return {
          ...n,
          style: n.data.nodeData?.type === 'dataArtifact' || n.data.nodeData?.type === 'processNode'
            ? getDataNodeStyle(n.data.nodeData?.type, isSelected, isConnected, isDimmed)
            : getNodeStyle(
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
            stroke: isConnected ? '#ef4444' : (e.style?.originalStroke || e.style?.stroke || '#9ca3af'),
            strokeDasharray: isConnected ? '5,5' : 'none',
            opacity: isConnected ? 1 : 0.1,
            strokeWidth: isConnected ? 3 : 2,
          },
        };
      })
    );
  }, [edges, setNodes, setEdges, getAllConnectedNodes, getConnectedEdges]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);

    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        style: n.data.nodeData?.type === 'dataArtifact' || n.data.nodeData?.type === 'processNode'
          ? getDataNodeStyle(n.data.nodeData?.type, false, false, false)
          : getNodeStyle(
              n.data.nodeData?.type || n.data.nodeData?.stepType,
              n.data.nodeData?.run?.status,
              false,
              false,
              false
            ),
      }))
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

  const buildPipelineGraph = useCallback((lineageData) => {
    console.log('Building pipeline graph from:', lineageData);
    
    if (!lineageData?.graphPipeline?.nodes) {
      console.warn('No graphPipeline.nodes in lineageData');
      return { nodes: [], edges: [] };
    }

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

    const nodeWidth = 180;
    const nodeHeight = 80;
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
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '13px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                {getStatusIcon(status)}
                <span>{node.label || nodeId}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                {nodeType}
              </div>
              {node.run?.elapsedSec != null && node.run.elapsedSec > 0 && (
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {formatDuration(node.run.elapsedSec)}
                </div>
              )}
            </div>
          ),
          nodeData: node
        },
        style: getNodeStyle(nodeType, status, false, false, false),
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        position: { 
          x: startX + (index * nodeSpacing), 
          y: fixedY 
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
        style: { 
          stroke: '#9ca3af', 
          strokeWidth: 2,
          originalStroke: '#9ca3af'
        },
      });
    }

    console.log('Pipeline graph built (linear):', { nodes: newNodes.length, edges: newEdges.length });
    return { nodes: newNodes, edges: newEdges };
  }, []);

  const buildDataGraph = useCallback((lineageData) => {
    console.log('Building data graph from:', lineageData);
    
    if (!lineageData?.graphData?.nodes) {
      console.warn('No graphData.nodes in lineageData');
      return { nodes: [], edges: [] };
    }

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
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '12px',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px'
              }}>
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
          nodeData: processNode
        },
        style: getDataNodeStyle('processNode', false, false, false),
        position: { x: 0, y: 0 },        
        draggable: false,
      });

      const pipelineNode = pipelineNodes.find(pn => pn.id === processNode.stepId);
      if (pipelineNode?.inputs) {
        pipelineNode.inputs.forEach((input) => {
          const uri = safeValue(input.uri);
          if (uri && uri !== 'N/A' && !uri.includes('Get') && !uri.includes('Std:Join') && uri.startsWith('s3://')) {
            const dataNodeId = `data:${uri}`;
            if (dataNodeMap.has(dataNodeId) && !newNodes.find(n => n.id === dataNodeId)) {
              const dataNode = dataNodeMap.get(dataNodeId);
              
              newNodes.push({
                id: dataNodeId,
                type: 'default',
                data: {
                  label: (
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <div style={{ 
                        fontWeight: 'bold', 
                        fontSize: '11px',
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}>
                        <Database className="w-3 h-3 text-blue-600" />
                        <span>{input.name || 'Data'}</span>
                      </div>
                      <div style={{ 
                        fontSize: '9px', 
                        color: '#6b7280', 
                        wordBreak: 'break-all',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '160px',
                        margin: '0 auto'
                      }}>
                        {uri.split('/').slice(-1)[0]}
                      </div>
                    </div>
                  ),
                  nodeData: dataNode
                },
                style: getDataNodeStyle('dataArtifact', false, false, false),
                position: { x: 0, y: 0 },        
                draggable: false,
              });

              newEdges.push({
                id: `edge-data-${dataNodeId}-${processNode.id}`,
                source: dataNodeId,
                target: processNode.id,
                type: 'smoothstep',
                animated: false,
                style: { 
                  stroke: '#0284c7', 
                  strokeWidth: 2,
                  originalStroke: '#0284c7'
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
          style: { 
            stroke: '#16a34a', 
            strokeWidth: 2,
            originalStroke: '#16a34a'
          },
        });
      }
    });

    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({
      rankdir: 'LR',
      nodesep: 100,
      ranksep: 150,
      ranker: 'network-simplex',
    });

    const nodeWidth = 180;
    const nodeHeight = 80;

    newNodes.forEach((n) => {
      dagreGraph.setNode(n.id, { width: nodeWidth, height: nodeHeight });
    });

    newEdges.forEach((e) => {
      if (e.source && e.target) {
        dagreGraph.setEdge(e.source, e.target);
      }
    });

    try {
      dagre.layout(dagreGraph);
      
      const layoutedNodes = newNodes.map((n) => {
        const nodeWithPosition = dagreGraph.node(n.id);
        if (!nodeWithPosition) {
          return { 
            ...n, 
            sourcePosition: Position.Right, 
            targetPosition: Position.Left,
            position: { x: 0, y: 0 }
          };
        }
        return {
          ...n,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          position: {
            x: nodeWithPosition.x - nodeWidth / 2,
            y: nodeWithPosition.y - nodeHeight / 2,
          },
        };
      });

      console.log('Data graph built:', { nodes: layoutedNodes.length, edges: newEdges.length });
      return { nodes: layoutedNodes, edges: newEdges };
    } catch (error) {
      console.error('Dagre layout error:', error);
      return { nodes: newNodes, edges: newEdges };
    }
  }, []);

  useEffect(() => {
    if (lineageData) {
      console.log('Lineage data changed, view mode:', viewMode);
      if (viewMode === 'pipeline') {
        const { nodes: pipelineNodes, edges: pipelineEdges } = buildPipelineGraph(lineageData);
        setNodes(pipelineNodes);
        setEdges(pipelineEdges);
      } else {
        const { nodes: dataNodes, edges: dataEdges } = buildDataGraph(lineageData);
        setNodes(dataNodes);
        setEdges(dataEdges);
      }
      setSelectedNode(null);
      setShowPanel(false);
      setSelectedNodeData(null);
    }
  }, [lineageData, viewMode, buildPipelineGraph, buildDataGraph, setNodes, setEdges]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);
  };

  const handlePipelineSelect = useCallback(async (pipeline) => {
    setSelectedPipeline(pipeline);
    setShowPipelineList(false);
    setShowDropdown(false);

    const region = pipeline.region || 'ap-northeast-2';
    let domain = null;
    
    if (pipeline.matchedDomain && pipeline.matchedDomain.domainName) {
      domain = pipeline.matchedDomain.domainName;
    } else if (pipeline.tags && pipeline.tags['DomainName']) {
      domain = pipeline.tags['DomainName'];
    }

    await loadLineage(pipeline.name, region, domain);
  }, [loadLineage]);

  useEffect(() => {
    loadPipelines({ regions: 'ap-northeast-2', includeLatestExec: true });
  }, [loadPipelines]);

  const handleDomainSelect = (domain) => {
    setSelectedDomain(domain);
    setShowDomainDropdown(false);
    setSelectedPipeline(null);
    setShowPipelineList(true);
    
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setShowPanel(false);
    setSelectedNodeData(null);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 헤더 영역 */}
      <div className="bg-white border-b border-gray-200 px-6 shadow-sm flex-shrink-0">
        {/* 첫 번째 줄: 기존 헤더 */}
        <div className="h-16 flex items-center">
          <h1 className="text-2xl font-bold text-gray-800 mr-6">Lineage</h1>
          
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
                  onClick={() => handleDomainSelect({ id: '__all__', name: '전체 도메인', region: 'ap-northeast-2' })}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                >
                  <div className="font-medium text-sm">전체 도메인</div>
                  <div className="text-xs text-gray-500 mt-1">모든 파이프라인 ({pipelines.length}개)</div>
                </div>
                
                {domains.map((domain) => (
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
                  onClick={() => handleDomainSelect({ id: '__untagged__', name: '태그 없음', region: 'ap-northeast-2' })}
                  className="px-4 py-3 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="font-medium text-sm">태그 없음</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getDomainPipelineCount('__untagged__')}개
                  </div>
                </div>
              </div>
            )}
          </div>

          {showPipelineList && (
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
                    <span className="text-sm font-medium">
                      {selectedPipeline ? selectedPipeline.name : '파이프라인 선택'}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
              
              {showDropdown && !loadingPipelines && (
                <div className="absolute top-full mt-2 w-96 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {filteredPipelines.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-500">
                      파이프라인이 없습니다
                    </div>
                  ) : (
                    filteredPipelines.map((pipeline) => (
                      <div 
                        key={pipeline.arn}
                        onClick={() => handlePipelineSelect(pipeline)}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                      >
                        <div className="font-medium text-sm">{pipeline.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{pipeline.region}</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

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
            </div>
          )}

          {selectedPipeline && (
            <button
              onClick={() => {
                setSelectedPipeline(null);
                setShowPipelineList(true);
                setNodes([]);
                setEdges([]);
              }}
              className="ml-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 두 번째 줄: 파이프라인 상세 정보 */}
        {selectedPipeline && lineageData && (
          <div className="pb-4 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">파이프라인 이름</div>
                <div className="font-semibold text-sm text-gray-900 truncate" title={lineageData.pipeline?.name || selectedPipeline.name}>
                  {lineageData.pipeline?.name || selectedPipeline.name}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">도메인</div>
                <div className="font-semibold text-sm text-gray-900 truncate" title={lineageData.domain?.name || selectedDomain.name}>
                  {lineageData.domain?.name || selectedDomain.name}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">리전</div>
                <div className="font-semibold text-sm text-gray-900">
                  {selectedPipeline.region || 'ap-northeast-2'}
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">마지막 수정</div>
                <div className="font-semibold text-sm text-gray-900">
                  {selectedPipeline.lastModifiedTime 
                    ? new Date(selectedPipeline.lastModifiedTime).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit'
                      })
                    : lineageData.pipeline?.lastModifiedTime
                      ? new Date(lineageData.pipeline.lastModifiedTime).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit'
                        })
                      : 'N/A'
                  }
                </div>
              </div>
            </div>

            {lineageData.pipeline?.arn && (
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">ARN</div>
                <div className="font-mono text-xs text-gray-700 break-all">
                  {lineageData.pipeline.arn}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 본문 영역 - 남은 공간 차지 */}
      <div className="flex-1 min-h-0 relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
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
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
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

        {showPanel && selectedNodeData && (
          <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto z-20">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4 pb-3 border-b">
                <h3 className="text-lg font-bold">Step Details</h3>
                <button onClick={() => {
                  setShowPanel(false);
                  onPaneClick();
                }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-sm">
                {/* Basic Information Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-blue-600 rounded"></div>
                    <h4 className="font-bold text-gray-800">Basic Information</h4>
                  </div>
                  <div className="space-y-3 pl-3">
                    {/* Step ID */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Step ID</div>
                      <div className="font-medium break-all">{selectedNodeData.id || selectedNodeData.label}</div>
                    </div>

                    {/* Type */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Type</div>
                      <div className="font-medium">{safeValue(selectedNodeData.type || selectedNodeData.stepType)}</div>
                    </div>

                    {/* Status - processNode만 */}
                    {selectedNodeData.type === 'processNode' && selectedNodeData.run?.status && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Status</div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedNodeData.run.status)}
                          <span className="font-medium">{safeValue(selectedNodeData.run.status)}</span>
                        </div>
                      </div>
                    )}

                    {/* Status - 파이프라인 관점 */}
                    {viewMode === 'pipeline' && selectedNodeData.run?.status && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Status</div>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(selectedNodeData.run.status)}
                          <span className="font-medium">{safeValue(selectedNodeData.run.status)}</span>
                        </div>
                      </div>
                    )}

                    {/* Job Name */}
                    {selectedNodeData.run?.jobName && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Job Name</div>
                        <div className="font-mono text-xs break-all">
                          {selectedNodeData.run.jobName}
                        </div>
                      </div>
                    )}

                    {/* Job ARN */}
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

                {/* Execution Info Section - processNode만 */}
                {selectedNodeData.type === 'processNode' && selectedNodeData.run && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded"></div>
                      <h4 className="font-bold text-gray-800">Execution Info</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      {/* Start Time */}
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
                              hour12: false
                            })}
                          </div>
                        </div>
                      )}

                      {/* End Time */}
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
                              hour12: false
                            })}
                          </div>
                        </div>
                      )}

                      {/* Duration */}
                      {selectedNodeData.run.elapsedSec != null && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Duration</div>
                          <div className="font-medium">{formatDuration(selectedNodeData.run.elapsedSec)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Execution Info Section - 파이프라인 관점 */}
                {viewMode === 'pipeline' && selectedNodeData.run && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded"></div>
                      <h4 className="font-bold text-gray-800">Execution Info</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      {/* Start Time */}
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
                              hour12: false
                            })}
                          </div>
                        </div>
                      )}

                      {/* End Time */}
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
                              hour12: false
                            })}
                          </div>
                        </div>
                      )}

                      {/* Duration */}
                      {selectedNodeData.run.elapsedSec != null && (
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Duration</div>
                          <div className="font-medium">{formatDuration(selectedNodeData.run.elapsedSec)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Data Location Section - dataArtifact만 */}
                {selectedNodeData.type === 'dataArtifact' && selectedNodeData.uri && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded"></div>
                      <h4 className="font-bold text-gray-800">Data Location</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      <div className="font-mono text-xs break-all text-blue-600 mb-3">
                        {selectedNodeData.uri}
                      </div>
                      
                      {selectedNodeData.meta?.s3 && (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Bucket:</div>
                            <div className="font-medium">{selectedNodeData.meta.s3.bucket}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Region:</div>
                            <div className="font-medium">{selectedNodeData.meta.s3.region}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Encryption:</div>
                            <div className="font-medium">{selectedNodeData.meta.s3.encryption}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Versioning:</div>
                            <div className="font-medium">{selectedNodeData.meta.s3.versioning}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Public Access:</div>
                            <div className={`font-medium ${selectedNodeData.meta.s3.publicAccess === 'Blocked' ? 'text-green-600' : 'text-red-600'}`}>
                              {selectedNodeData.meta.s3.publicAccess}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Inputs Section - 파이프라인 관점만 (viewMode === 'pipeline') */}
                {viewMode === 'pipeline' && selectedNodeData.inputs && selectedNodeData.inputs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded"></div>
                      <h4 className="font-bold text-gray-800">Inputs ({selectedNodeData.inputs.length})</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      {selectedNodeData.inputs.map((input, idx) => {
                        const uri = safeValue(input.uri);
                        const isS3Uri = uri.startsWith('s3://');
                        const bucket = isS3Uri ? uri.split('/')[2] : null;

                        return (
                          <div key={idx} className="border-l-2 border-blue-200 pl-3">
                            <div className="font-semibold text-sm mb-2">{input.name}</div>
                            <div className="font-mono text-xs break-all text-blue-600 bg-blue-50 p-2 rounded mb-2">
                              {uri}
                            </div>
                            {isS3Uri && bucket && (
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Bucket:</span>
                                  <span className="font-mono">{bucket}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Region:</span>
                                  <span>{selectedNodeData.meta?.s3?.region || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Encryption:</span>
                                  <span>{selectedNodeData.meta?.s3?.encryption || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Versioning:</span>
                                  <span>{selectedNodeData.meta?.s3?.versioning || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Public Access:</span>
                                  <span className={selectedNodeData.meta?.s3?.publicAccess === 'Blocked' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {selectedNodeData.meta?.s3?.publicAccess || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Outputs Section - 파이프라인 관점만 (viewMode === 'pipeline') */}
                {viewMode === 'pipeline' && selectedNodeData.outputs && selectedNodeData.outputs.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-600 rounded"></div>
                      <h4 className="font-bold text-gray-800">Outputs ({selectedNodeData.outputs.length})</h4>
                    </div>
                    <div className="space-y-3 pl-3">
                      {selectedNodeData.outputs.map((output, idx) => {
                        const uri = safeValue(output.uri);
                        const isS3Uri = uri.startsWith('s3://');
                        const bucket = isS3Uri ? uri.split('/')[2] : null;

                        return (
                          <div key={idx} className="border-l-2 border-green-200 pl-3">
                            <div className="font-semibold text-sm mb-2">{output.name}</div>
                            <div className="font-mono text-xs break-all text-green-600 bg-green-50 p-2 rounded mb-2">
                              {uri}
                            </div>
                            {isS3Uri && bucket && (
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Bucket:</span>
                                  <span className="font-mono">{bucket}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Region:</span>
                                  <span>{selectedNodeData.meta?.s3?.region || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Encryption:</span>
                                  <span>{selectedNodeData.meta?.s3?.encryption || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Versioning:</span>
                                  <span>{selectedNodeData.meta?.s3?.versioning || 'Unknown'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Public Access:</span>
                                  <span className={selectedNodeData.meta?.s3?.publicAccess === 'Blocked' ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                    {selectedNodeData.meta?.s3?.publicAccess || 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 하단 통계 영역 - 128px 고정 */}
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
              <p className="text-2xl font-bold text-red-600">{lineageData.summary.nodeStatus?.Failed || 0}</p>
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