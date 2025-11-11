// src/pages/ThreatCompliance.js
// (하단 페이지네이션 영역에 10/20/50/전체 버튼 추가, select 제거, localStorage 유지)
import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, ChevronRight, CheckCircle, XCircle, AlertCircle, Play, X, ChevronDown, ChevronUp } from 'lucide-react';
import { sessionService } from '../services/sessionService';
import { complianceApi } from '../services/complianceApi';

const API_BASE = 'http://43.202.228.52:8003';
const LS_PAGE_SIZE_KEY = 'threat.itemsPerPage';

const PAGE_SIZE_OPTIONS = [
  { label: '10', value: '10' },
  { label: '20', value: '20' },
  { label: '50', value: '50' },
  { label: '전체', value: 'all' },
];

const ThreatCompliance = () => {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState('SAGE-Threat');
  const [requirements, setRequirements] = useState([]);
  const [mappingDetail, setMappingDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState({});
  const [auditResults, setAuditResults] = useState({});
  const [streaming, setStreaming] = useState(false);
  const [progress, setProgress] = useState({ total: 0, executed: 0 });
  const [expandedText, setExpandedText] = useState(null);

  // ── 페이지네이션 상태 ───────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(LS_PAGE_SIZE_KEY) : null;
    return saved && ['10', '20', '50', 'all'].includes(saved) ? saved : '10'; // 문자열로 관리
  });

  const [selectedThreatGroup, setSelectedThreatGroup] = useState('전체');
  const [threatGroups, setThreatGroups] = useState([]);

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
    fetchRequirements('SAGE-Threat');
  }, []);

  const fetchRequirements = async (frameworkCode) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/${frameworkCode}/requirements:groups`);
      const data = await response.json();

      if (Array.isArray(data)) {
        setRequirements(data);
        const groups = new Set();
        data.forEach((req) => {
          if (req.threat_groups && Array.isArray(req.threat_groups)) {
            req.threat_groups.forEach((g) => g && groups.add(g));
          }
        });
        setThreatGroups(['전체', ...Array.from(groups).sort()]);
      } else if (data && typeof data === 'object') {
        const arrayData = Object.values(data);
        setRequirements(arrayData);
        const groups = new Set();
        arrayData.forEach((req) => {
          if (req.threat_groups && Array.isArray(req.threat_groups)) {
            req.threat_groups.forEach((g) => g && groups.add(g));
          }
        });
        setThreatGroups(['전체', ...Array.from(groups).sort()]);
      } else {
        console.error('예상치 못한 응답 형식:', data);
        setRequirements([]);
        setThreatGroups(['전체']);
        setError('잘못된 데이터 형식입니다.');
      }

      setSelectedFramework(frameworkCode);
      setSelectedThreatGroup('전체');
      setSidePanelOpen(false);
      setMappingDetail(null);
      setAuditResults({});
      setExpandedItems({});
      setCurrentPage(1);
    } catch (err) {
      console.error('요구사항 조회 실패:', err);
      setError(err.message);
      setRequirements([]);
      setThreatGroups(['전체']);
    } finally {
      setLoading(false);
    }
  };

  const fetchMappingDetail = async (frameworkCode, reqId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/${frameworkCode}/requirements/${reqId}/mappings:groups`);
      const data = await response.json();
      setMappingDetail(data);
      setSidePanelOpen(true);
    } catch (err) {
      console.error('매핑 상세 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const auditRequirement = async (frameworkCode, reqId) => {
    setAuditing(true);
    try {
      const sid = sessionService.getId();
      const auditData = await complianceApi.auditRequirement(frameworkCode, reqId, sid);

      setAuditResults((prev) => ({ ...prev, [reqId]: auditData }));
      setRequirements((prev) =>
        prev.map((req) =>
          req.id === reqId
            ? { ...req, mapping_status: auditData.requirement_status || 'Audited', audit_result: auditData }
            : req
        )
      );
      alert('진단이 완료되었습니다.');
    } catch (err) {
      console.error('진단 실패:', err);
      alert('진단 실패했습니다: ' + err.message);
    } finally {
      setAuditing(false);
    }
  };

  const auditAllFramework = async (frameworkCode) => {
    if (!window.confirm(`${frameworkCode} 전체 항목에 대한 진단을 수행하시겠습니까?`)) return;

    setAuditing(true);
    setStreaming(true);
    setProgress({ total: 0, executed: 0 });

    try {
      let executed = 0;
      let total = 0;
      const sid = sessionService.getId();

      await complianceApi.auditAllStreaming(frameworkCode, sid, (evt) => {
        if (evt.type === 'meta') {
          total = evt.total || 0;
          setProgress({ total, executed });
        } else if (evt.type === 'requirement') {
          executed += 1;
          setProgress({ total, executed });
          setRequirements((prev) =>
            prev.map((r) =>
              r.id === evt.requirement_id ? { ...r, mapping_status: evt.requirement_status, audit_result: evt } : r
            )
          );
          setAuditResults((prev) => ({ ...prev, [evt.requirement_id]: evt }));
        } else if (evt.type === 'summary') {
          // 필요시 요약 처리
        }
      });

      alert('전체 진단이 완료되었습니다.');
    } catch (err) {
      console.error('전체 진단 실패:', err);
      alert('전체 진단에 실패했습니다: ' + err.message);
    } finally {
      setStreaming(false);
      setAuditing(false);
    }
  };

  const getMappingStatusBadge = (status) => {
    if (status === 'COMPLIANT' || status === 'Compliant') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-blue-800">준수</span>;
    }
    if (status === 'NON_COMPLIANT' || status === 'Non-Compliant') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">미준수</span>;
    }
    if (status === 'SKIPPED' || status === 'Skipped') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">건너뜀</span>;
    }
    if (status === 'ERROR') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">오류</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">-</span>;
  };

  const getStatusText = (status) => {
    if (status === 'COMPLIANT' || status === 'Compliant') return '준수';
    if (status === 'NON_COMPLIANT' || status === 'Non-Compliant') return '미준수';
    if (status === 'SKIPPED' || status === 'Skipped') return '건너뜀';
    if (status === 'ERROR') return '오류';
    return status;
  };

  const getStatusIcon = (status) => {
    if (status === 'COMPLIANT') return <CheckCircle className="w-4 h-4 text-blue-600" />;
    if (status === 'NON_COMPLIANT') return <XCircle className="w-4 h-4 text-red-600" />;
    if (status === 'SKIPPED') return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    if (status === 'ERROR') return <XCircle className="w-4 h-4 text-red-600" />;
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  const toggleExpand = (mappingCode) => {
    setExpandedItems((prev) => ({ ...prev, [mappingCode]: !prev[mappingCode] }));
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setMappingDetail(null);
    setExpandedItems({});
  };

  const safeRequirements = Array.isArray(requirements) ? requirements : [];
  const filteredRequirements = useMemo(() => {
    const arr = selectedThreatGroup === '전체'
      ? safeRequirements
      : safeRequirements.filter((req) => req.threat_groups && req.threat_groups.includes(selectedThreatGroup));
    return arr;
  }, [safeRequirements, selectedThreatGroup]);

  // ── 페이지 크기 숫자/effective 계산 ───────────────────────────────────────────
  const effectivePageSize = useMemo(() => {
    if (itemsPerPage === 'all') return filteredRequirements.length || 1;
    const n = parseInt(itemsPerPage, 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  }, [itemsPerPage, filteredRequirements.length]);

  const totalPages = useMemo(() => {
    if (filteredRequirements.length === 0) return 1;
    if (itemsPerPage === 'all') return 1;
    return Math.max(1, Math.ceil(filteredRequirements.length / effectivePageSize));
  }, [filteredRequirements.length, itemsPerPage, effectivePageSize]);

  // 페이지 크기 변경 시 초기화 + 저장
  useEffect(() => {
    setCurrentPage(1);
    try { window.localStorage.setItem(LS_PAGE_SIZE_KEY, itemsPerPage); } catch {}
  }, [itemsPerPage]);

  // 그룹/데이터 변동 시 현재 페이지 보정
  useEffect(() => {
    setCurrentPage((p) => {
      const maxP = totalPages;
      return Math.min(Math.max(1, p), maxP);
    });
  }, [totalPages]);

  // 현재 페이지의 표시 데이터
  const displayedRequirements = useMemo(() => {
    if (itemsPerPage === 'all') return filteredRequirements;
    const start = (currentPage - 1) * effectivePageSize;
    const end = start + effectivePageSize;
    return filteredRequirements.slice(start, end);
  }, [filteredRequirements, itemsPerPage, currentPage, effectivePageSize]);

  const rangeStart = filteredRequirements.length === 0 ? 0 : (itemsPerPage === 'all' ? 1 : (currentPage - 1) * effectivePageSize + 1);
  const rangeEnd = itemsPerPage === 'all' ? filteredRequirements.length : Math.min(currentPage * effectivePageSize, filteredRequirements.length);

  return (
    <div className="relative">
      <style>{`
        .requirements-table .id-column { display: none; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; }
      `}</style>

      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-gray-900">위협</h1>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 py-2 px-2">
        <span className="text-gray-900">{selectedFramework}</span>
      </div>

      {loading && !sidePanelOpen && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">에러: {error}</p>
        </div>
      )}

      {selectedFramework && !loading && safeRequirements.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <ClipboardList className="w-24 h-24 text-gray-300 mb-6" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">프레임워크 데이터가 없습니다.</h3>
          <p className="text-gray-500">API 연결 상태를 확인해주세요.</p>
        </div>
      )}

      {selectedFramework && !loading && safeRequirements.length > 0 && (
        <div className={`bg-white rounded-lg shadow-sm border transition-all ${sidePanelOpen ? 'mr-[50%]' : ''}`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{selectedFramework} Requirements</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {filteredRequirements.length} 항목 · {rangeStart}-{rangeEnd} 표시
                </span>

                <div className="flex items-center gap-3">
                  {streaming && <span className="text-xs text-gray-500">진행 {progress.executed}/{progress.total}</span>}
                  <button
                    onClick={() => auditAllFramework(selectedFramework)}
                    disabled={auditing}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {auditing ? '진단 중...' : '전체 진단'}
                  </button>
                </div>
              </div>

              {/* 위협 그룹 필터 */}
              <div className="flex flex-wrap gap-4 mt-2">
                {threatGroups.map((group) => (
                  <button
                    key={group}
                    onClick={() => { setSelectedThreatGroup(group); setCurrentPage(1); }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedThreatGroup === group ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {group}
                    {group !== '전체' && (
                      <span className="ml-2 text-xs opacity-75">
                        ({safeRequirements.filter((req) => req.threat_groups && req.threat_groups.includes(group)).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <>
              <div className="overflow-x-auto">
                <table className="w-full requirements-table">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '40px' }}></th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>No</th>
                      <th className="id-column px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '200px' }}>보안 위협</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '350px' }}>세부 사항</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>준수 여부</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '200px' }}>컴플라이언스</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>액션</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {displayedRequirements.map((req, index) => (
                      <React.Fragment key={req.id}>
                        <tr className="hover:bg-gray-50 border-b border-gray-200">
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '40px' }}>
                            {req.audit_result && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleExpand(`req-${req.id}`); }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                {expandedItems[`req-${req.id}`] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium" style={{ width: '60px' }}>
                            {itemsPerPage === 'all'
                              ? index + 1
                              : (currentPage - 1) * effectivePageSize + index + 1}
                          </td>
                          <td className="id-column px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.id}</td>
                          <td className="px-6 py-2 text-sm text-gray-900" style={{ width: '200px' }}>
                            <span
                              className="line-clamp-2 block cursor-pointer hover:text-primary-600 transition-colors"
                              onClick={() =>
                                setExpandedText({
                                  title: '보안 위협 상세',
                                  threatData: {
                                    threat: req.item_code,
                                    details: req.regulation || req.title,
                                    services: req.mapping_services || [],
                                  },
                                })
                              }
                            >
                              {req.item_code || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900" style={{ minWidth: '350px' }}>
                            <span
                              className="line-clamp-3 block cursor-pointer hover:text-primary-600 transition-colors"
                              onClick={() => setExpandedText({ title: '세부 사항', content: req.regulation || req.title })}
                            >
                              {req.regulation || req.title || '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap" style={{ width: '100px' }}>
                            {getMappingStatusBadge(req.mapping_status)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700" style={{ width: '200px' }}>
                            <div
                              className="line-clamp-2 cursor-pointer hover:text-primary-600"
                              onClick={() => {
                                const complianceData =
                                  req.applicable_hits?.map((hit) => ({
                                    frameworks:
                                      hit.matches?.map((m) => ({
                                        code: m.framework_code?.toUpperCase(),
                                        itemCode: m.item_code,
                                        title: m.title,
                                        regulation: m.regulation,
                                      })) || [],
                                  })) || [];
                                setExpandedText({ title: '컴플라이언스', content: complianceData, isTable: true });
                              }}
                            >
                              {req.applicable_hits
                                ?.flatMap((hit) => hit.matches?.map((m) => m.framework_code?.toUpperCase()) || [])
                                .filter((v, i, arr) => v && arr.indexOf(v) === i)
                                .join(', ') || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ width: '180px' }}>
                            <div className="flex items-center gap-4">
                              <button onClick={() => fetchMappingDetail(selectedFramework, req.id)} className="text-blue-600 hover:text-blue-800">
                                상세보기
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  auditRequirement(selectedFramework, req.id);
                                }}
                                disabled={auditing}
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                              >
                                <Play className="w-3 h-3" />
                                진단
                              </button>
                            </div>
                          </td>
                        </tr>

                        {expandedItems[`req-${req.id}`] && req.audit_result && (
                          <tr className="bg-gray-50">
                            <td colSpan="8" className="px-6 py-4">
                              <div className="space-y-4">
                                {req.audit_result.summary && (
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                      <div className="text-2xl font-bold text-green-600">{req.audit_result.summary.COMPLIANT || 0}</div>
                                      <div className="text-xs text-gray-600">준수</div>
                                    </div>
                                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                      <div className="text-2xl font-bold text-red-600">{req.audit_result.summary.NON_COMPLIANT || 0}</div>
                                      <div className="text-xs text-gray-600">미준수</div>
                                    </div>
                                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                      <div className="text-2xl font-bold text-yellow-600">{req.audit_result.summary.SKIPPED || 0}</div>
                                      <div className="text-xs text-gray-600">건너뜀</div>
                                    </div>
                                  </div>
                                )}

                                {req.audit_result.results && req.audit_result.results.length > 0 ? (
                                  <div className="space-y-2">
                                    {req.audit_result.results.map((result, idx) => {
                                      const isResultExpanded = expandedItems[`result-${req.id}-${idx}`];
                                      const borderColor =
                                        result.status === 'COMPLIANT'
                                          ? 'border-green-500'
                                          : result.status === 'NON_COMPLIANT'
                                          ? 'border-red-500'
                                          : result.status === 'SKIPPED'
                                          ? 'border-yellow-500'
                                          : 'border-gray-500';
                                      const statusBadge =
                                        result.status === 'COMPLIANT'
                                          ? 'bg-green-100 text-green-800'
                                          : result.status === 'NON_COMPLIANT'
                                          ? 'bg-red-100 text-red-800'
                                          : result.status === 'SKIPPED'
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : 'bg-gray-100 text-gray-800';

                                      return (
                                        <div key={idx} className={`border-l-4 ${borderColor} bg-white rounded-r-lg shadow-sm overflow-hidden`}>
                                          <button
                                            onClick={() => toggleExpand(`result-${req.id}-${idx}`)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                          >
                                            <div className="flex items-center gap-4">
                                              <span className="font-bold text-gray-900">{result.mapping_code}</span>
                                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>{getStatusText(result.status)}</span>
                                              {result.evaluations && result.evaluations.length > 0 && (
                                                <span className="text-sm text-gray-600">{result.evaluations.length}개 리소스 확인</span>
                                              )}
                                            </div>
                                            {isResultExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                                          </button>

                                          {isResultExpanded && (
                                            <div className="border-t border-gray-200">
                                              {result.evaluations && result.evaluations.length > 0 ? (
                                                <div className="p-4 space-y-2">
                                                  {result.evaluations.map((evaluation, evalIdx) => {
                                                    const evalBgColor =
                                                      evaluation.status === 'COMPLIANT' ? 'bg-green-50' : evaluation.status === 'NON_COMPLIANT' ? 'bg-red-50' : 'bg-gray-50';
                                                    return (
                                                      <div key={evalIdx} className={`flex items-center justify-between p-3 ${evalBgColor} rounded`}>
                                                        <div className="flex-1">
                                                          <div className="text-sm font-medium text-gray-900">
                                                            {evaluation.service}
                                                            {evaluation.resource_id && `: ${evaluation.resource_id}`}
                                                          </div>
                                                          <div className="text-xs text-gray-600 mt-1">{evaluation.decision}</div>
                                                          {evaluation.extra?.error && (
                                                            <div className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded">{evaluation.extra.error}</div>
                                                          )}
                                                        </div>
                                                        {getStatusIcon(evaluation.status)}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              ) : result.reason ? (
                                                <div className="p-4 bg-yellow-50 text-sm text-yellow-800">{result.reason}</div>
                                              ) : (
                                                <div className="p-4 text-sm text-gray-500">진단 결과 상세 없음</div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500">진단 결과가 없습니다.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination + 하단 페이지 크기 버튼 */}
              <div className="px-6 py-4 border-t border-gray-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* 왼쪽: 범위 정보 */}
                <div className="text-sm text-gray-700">
                  {filteredRequirements.length}개 중 {rangeStart}-{rangeEnd} 표시
                </div>

                {/* 가운데: 페이지 버튼 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1 || itemsPerPage === 'all'}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <div className="flex items-center gap-1">
                    {itemsPerPage === 'all'
                      ? (
                        <button className="px-3 py-1 rounded bg-primary-600 text-white">1</button>
                        )
                      : Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            if (totalPages <= 7) return true;
                            if (page === 1 || page === totalPages) return true;
                            if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                            if (page === currentPage - 2 || page === currentPage + 2) return page;
                            return false;
                          })
                          .map((page, idx, array) => (
                            <React.Fragment key={page}>
                              {idx > 0 && array[idx - 1] !== page - 1 && <span className="px-2 text-gray-500">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                disabled={itemsPerPage === 'all'}
                                className={`px-3 py-1 rounded ${currentPage === page ? 'bg-primary-600 text-white' : 'border border-gray-300 hover:bg-gray-50'} ${
                                  itemsPerPage === 'all' ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages || itemsPerPage === 'all'}
                    className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>

                {/* 오른쪽: 페이지 크기 버튼 그룹 */}
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-sm text-gray-600 mr-1">표시 수</span>
                  <div className="inline-flex rounded-xl overflow-hidden border border-gray-300">
                    {PAGE_SIZE_OPTIONS.map((opt, i) => {
                      const active = itemsPerPage === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => { setItemsPerPage(opt.value); setCurrentPage(1); }}
                          className={[
                            'px-3 py-1 text-sm transition-colors',
                            active ? 'bg-primary-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700',
                            i !== PAGE_SIZE_OPTIONS.length - 1 ? 'border-r border-gray-300' : '',
                          ].join(' ')}
                          title={`${opt.label}개 표시`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          </div>
        </div>
      )}

      {expandedText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setExpandedText(null)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden m-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{expandedText.title}</h3>
              <button onClick={() => setExpandedText(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-6">
              {expandedText.isTable ? (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프레임워크</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">항목 코드</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">상세 내용</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {expandedText.content?.flatMap((item) =>
                          item.frameworks?.map((fw, idx) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">{fw.code || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-700">{fw.itemCode || fw.title || '-'}</td>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                <div className="max-w-2xl">{fw.regulation || '-'}</div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : expandedText.threatData ? (
                <div className="space-y-6">
                  <div className="bg-primary-50 border border-primary-200 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-primary-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      보안 위협
                    </h4>
                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{expandedText.threatData.threat || '-'}</p>
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">세부 사항</h4>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{expandedText.threatData.details || '-'}</p>
                  </div>

                  {expandedText.threatData.services && expandedText.threatData.services.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <ChevronRight className="w-5 h-5 text-primary-600" />
                        관련 AWS 서비스 ({expandedText.threatData.services.length}개)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {expandedText.threatData.services.map((service, idx) => (
                          <div key={idx} className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-lg px-3 py-2 text-sm text-gray-800 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                              <span className="font-medium">{service}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{expandedText.content || '-'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {sidePanelOpen && mappingDetail && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-30 z-40" onClick={closeSidePanel}></div>
          <div className="fixed right-0 top-0 h-screen w-1/2 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{mappingDetail.requirement.title}</h2>
                <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                  <span>ID: {mappingDetail.requirement.id}</span>
                  <span>코드: {mappingDetail.requirement.item_code}</span>
                </div>
              </div>
              <button onClick={closeSidePanel} className="p-2 hover:bg-gray-100 rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">매핑 정보 ({mappingDetail.mappings.length}건)</h3>
              <div className="space-y-6">
                {mappingDetail.mappings.map((mapping, idx) => (
                  <div key={idx} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">기본 정보</h4>
                        <dl className="space-y-2">
                          <div><dt className="text-xs text-gray-500">코드</dt><dd className="text-sm text-gray-900">{mapping.code}</dd></div>
                          <div><dt className="text-xs text-gray-500">카테고리</dt><dd className="text-sm text-gray-900">{mapping.category || '-'}</dd></div>
                          <div><dt className="text-xs text-gray-500">서비스</dt><dd className="text-sm text-gray-900">{mapping.service || '-'}</dd></div>
                          <div>
                            <dt className="text-xs text-gray-500">컴플라이언스</dt>
                            <dd className="text-sm text-gray-900">
                              {mappingDetail.requirement.applicable_hits?.flatMap(hit => hit.matches?.map(m => `${m.framework_code?.toUpperCase()} (${m.item_code})`) || []).filter(Boolean).join(', ') || '-'}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">점검 방법</h4>
                        <dl className="space-y-2">
                          <div><dt className="text-xs text-gray-500">점검 방식</dt><dd className="text-sm text-gray-900">{mapping.check_how || '-'}</dd></div>
                          <div><dt className="text-xs text-gray-500">콘솔 경로</dt><dd className="text-sm text-gray-900 break-all">{mapping.console_path || '-'}</dd></div>
                          {mapping.cli_cmd && (<div><dt className="text-xs text-gray-500">CLI 명령어</dt><dd className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">{mapping.cli_cmd}</dd></div>)}
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">판단 기준</h4>
                        <dl className="space-y-2">
                          <div><dt className="text-xs text-gray-500">반환 필드</dt><dd className="text-sm text-gray-900">{mapping.return_field || '-'}</dd></div>
                          <div><dt className="text-xs text-gray-500">준수 값</dt><dd className="text-sm text-green-600">{mapping.compliant_value || '-'}</dd></div>
                          <div><dt className="text-xs text-gray-500">미준수 값</dt><dd className="text-sm text-red-600">{mapping.non_compliant_value || '-'}</dd></div>
                        </dl>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">수정 방법</h4>
                        <dl className="space-y-2">
                          <div><dt className="text-xs text-gray-500">콘솔 수정</dt><dd className="text-sm text-gray-900 break-all">{mapping.console_fix || '-'}</dd></div>
                          {mapping.cli_fix_cmd && (
                            <div>
                              <dt className="text-xs text-gray-500">CLI 수정 명령어</dt>
                              <dd className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">{mapping.cli_fix_cmd}</dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThreatCompliance;
