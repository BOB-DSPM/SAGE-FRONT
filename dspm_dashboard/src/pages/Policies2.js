// src/pages/Policies2.js
import React, { useState, useEffect } from 'react';
import { ClipboardList, ChevronRight, CheckCircle, XCircle, AlertCircle, Play, X, ChevronDown, ChevronUp } from 'lucide-react';
import { complianceApi } from '../services/complianceApi';
import gdprLogo from './logo/gdpr.png';
import ismspLogo from './logo/ismsp.png';
import iso27001Logo from './logo/iso27001.png';
import iso27017Logo from './logo/iso27017.png';
import nistairmflogo from './logo/nistairmf.png';
import euaiactlogo from './logo/euaiact.png';
import iso27701Logo from './logo/iso27701.png';
import iso42001Logo from './logo/iso42001.png';
import soc2Logo from './logo/soc2.png';
import pipaLogo from './logo/pipa.png';

const API_BASE = 'http://211.44.183.248:8003';

// ============= 세션 키 구분 =============
const SESSION_KEY_PREFIX = 'compliance_session_';
const SESSION_KEY_FULL = 'compliance_session_full';

const getSessionKey = (frameworkCode) => {
  if (!frameworkCode) return SESSION_KEY_FULL;
  return `${SESSION_KEY_PREFIX}${frameworkCode}`;
};

const getSessionId = (frameworkCode) => {
  const key = getSessionKey(frameworkCode);
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === key) {
      return decodeURIComponent(value);
    }
  }
  return null;
};

const setSessionId = (frameworkCode, sessionId) => {
  const key = getSessionKey(frameworkCode);
  const maxAge = 30 * 60; // 30분
  document.cookie = `${key}=${encodeURIComponent(sessionId)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  console.log(`🍪 세션 ID 저장 [${key}]:`, sessionId);
};

const clearSessionId = (frameworkCode) => {
  const key = getSessionKey(frameworkCode);
  document.cookie = `${key}=; path=/; max-age=0`;
  console.log(`🗑️ 세션 ID 삭제 [${key}]`);
};

const generateSessionId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
// ======================================

const Policies2 = () => {
  const [frameworks, setFrameworks] = useState([]);
  const [selectedFramework, setSelectedFramework] = useState(null);
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const frameworkLogos = {
    GDPR: gdprLogo,
    'ISMS-P': ismspLogo,
    'ISO-27001': iso27001Logo,
    'iso-27001': iso27001Logo,
    'ISO-27017': iso27017Logo,
    'iso-27017': iso27017Logo,
    'iso-27701': iso27701Logo,
    'ISO-27701': iso27701Logo,
    'iso-42001': iso42001Logo,
    'ISO-42001': iso42001Logo,
    'eu-ai-act': euaiactlogo,
    'EU-AI-Act': euaiactlogo,
    'nist-ai-rmf': nistairmflogo,
    'NIST-AI-RMF': nistairmflogo,
    'soc2': soc2Logo,
    'SOC2': soc2Logo,
    'pipa': pipaLogo,
    'PIPA': pipaLogo,
    '개인정보보호법': pipaLogo,
    default: null,
  };

  const getFrameworkLogo = (frameworkName) => frameworkLogos[frameworkName] || frameworkLogos.default;

  useEffect(() => {
    fetchFrameworks();
  }, []);

  const fetchFrameworks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/compliance/stats`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const filteredData = data.filter(fw => fw.framework !== 'SAGE-Threat');
      setFrameworks(filteredData);
    } catch (err) {
      console.error('❌ 프레임워크 조회 실패:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequirements = async (frameworkCode) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/${frameworkCode}/requirements`);
      const data = await response.json();
      setRequirements(data);
      setSelectedFramework(frameworkCode);
      setSidePanelOpen(false);
      setMappingDetail(null);
      setAuditResults({});
      setExpandedItems({});
      setCurrentPage(1);

      // ✅ 1. 전체 진단 세션 확인
      const fullSessionId = getSessionId(frameworkCode);
      console.log(`🔍 [전체 진단] 세션 ID 확인:`, fullSessionId);

      if (fullSessionId) {
        console.log(`✅ 전체 진단 세션 존재 - 결과 로드 시도`);
        try {
          const sessionInfo = await complianceApi.checkSession(fullSessionId);
          console.log('📋 전체 진단 sessionInfo:', sessionInfo);

          let frameworksInSession = null;

          if (!sessionInfo) {
            frameworksInSession = null;
          } else if (Array.isArray(sessionInfo.frameworks)) {
            frameworksInSession = sessionInfo.frameworks;
          } else if (sessionInfo.session && Array.isArray(sessionInfo.session.frameworks)) {
            frameworksInSession = sessionInfo.session.frameworks;
          } else if (Array.isArray(sessionInfo.sessions)) {
            frameworksInSession = sessionInfo.sessions.flatMap(s => s.frameworks || []);
          } else if (sessionInfo?.sessions && sessionInfo.sessions.length === 1 && Array.isArray(sessionInfo.sessions[0]?.frameworks)) {
            frameworksInSession = sessionInfo.sessions[0].frameworks;
          } else if (sessionInfo.exists === false) {
            frameworksInSession = null;
          }

          console.log('🔎 전체 진단 frameworksInSession:', frameworksInSession);

          const normalize = s => (s || '').toString().trim().toLowerCase();
          const targetNormalized = normalize(frameworkCode);

          let hasFramework = false;
          if (Array.isArray(frameworksInSession)) {
            for (const fw of frameworksInSession) {
              if (normalize(fw) === targetNormalized) {
                hasFramework = true;
                break;
              }
            }
          }

          if (hasFramework) {
            console.log(`✅ 전체 진단 세션에 ${frameworkCode} 기록 존재 - 캐시 결과 로드`);
            const cachedResults = await complianceApi.auditAll(frameworkCode, fullSessionId);
            console.log('📦 전체 진단 캐시 결과:', cachedResults);

            let requirementsList = [];
            if (cachedResults && cachedResults.results) {
              requirementsList = cachedResults.results;
            } else if (cachedResults && cachedResults.requirements) {
              requirementsList = cachedResults.requirements;
            } else if (Array.isArray(cachedResults)) {
              requirementsList = cachedResults;
            }

            if (requirementsList.length > 0) {
              const resultsMap = {};
              requirementsList.forEach((reqResult) => {
                const reqId = reqResult.requirement_id || reqResult.id;
                if (!reqId) return;

                let requirement_status = 'SKIPPED';
                if (reqResult.results && Array.isArray(reqResult.results)) {
                  const statuses = reqResult.results.map(r => r.status);
                  if (statuses.includes('NON_COMPLIANT')) requirement_status = 'NON_COMPLIANT';
                  else if (statuses.every(s => s === 'COMPLIANT')) requirement_status = 'COMPLIANT';
                  else if (statuses.every(s => s === 'SKIPPED')) requirement_status = 'SKIPPED';
                }

                const summary = { COMPLIANT: 0, NON_COMPLIANT: 0, SKIPPED: 0 };
                if (reqResult.results) {
                  reqResult.results.forEach(r => {
                    if (r.status) summary[r.status] = (summary[r.status] || 0) + 1;
                  });
                }

                resultsMap[reqId] = {
                  ...reqResult,
                  requirement_status: reqResult.requirement_status || requirement_status,
                  summary: summary
                };
              });

              setAuditResults(resultsMap);

              setRequirements(prev => {
                const updated = prev.map(req => {
                  const result = resultsMap[req.id];
                  if (result) {
                    return {
                      ...req,
                      mapping_status: result.requirement_status,
                      audit_result: result
                    };
                  }
                  return req;
                });
                return updated;
              });

              console.log('✅ 전체 진단 캐시 결과 표시 완료');
            }
          } else {
            console.log(`⚠️ 전체 진단 세션에 ${frameworkCode} 기록 없음`);
          }
        } catch (err) {
          console.error('❌ 전체 진단 세션 확인 실패:', err);
        }
      }

      // ✅ 2. 개별 진단 세션들 확인 및 복원
      console.log(`🔍 [개별 진단] 세션 복원 시작`);
      const individualResults = {};
      
      for (const req of data) {
        const individualKey = `${frameworkCode}_req_${req.id}`;
        const individualSessionId = getSessionId(individualKey);
        
        if (individualSessionId) {
          console.log(`✅ 개별 세션 발견 [${individualKey}]:`, individualSessionId);
          try {
            // 개별 진단 결과 조회
            const individualResult = await complianceApi.auditRequirement(
              frameworkCode, 
              req.id, 
              individualSessionId
            );
            
            console.log(`📦 개별 진단 캐시 결과 [${req.id}]:`, individualResult);
            
            if (individualResult) {
              individualResults[req.id] = individualResult;
            }
          } catch (err) {
            console.error(`❌ 개별 진단 세션 복원 실패 [${req.id}]:`, err);
            // 세션이 만료되었으면 삭제
            clearSessionId(individualKey);
          }
        }
      }

      // ✅ 3. 개별 진단 결과를 requirements에 반영
      if (Object.keys(individualResults).length > 0) {
        console.log(`✅ ${Object.keys(individualResults).length}개 개별 진단 결과 복원`);
        
        setAuditResults(prev => ({
          ...prev,
          ...individualResults
        }));

        setRequirements(prev => {
          return prev.map(req => {
            const individualResult = individualResults[req.id];
            if (individualResult) {
              return {
                ...req,
                mapping_status: individualResult.requirement_status,
                audit_result: individualResult
              };
            }
            return req;
          });
        });
      }

    } catch (err) {
      console.error('❌ 요구사항 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMappingDetail = async (frameworkCode, reqId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/compliance/${frameworkCode}/requirements/${reqId}/mappings`);
      const data = await response.json();
      setMappingDetail(data);
      setSidePanelOpen(true);
    } catch (err) {
      console.error('❌ 매핑 상세 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const auditRequirement = async (frameworkCode, reqId) => {
    setAuditing(true);
    try {
      console.log(`🎯 개별 진단 시작 [${frameworkCode}:${reqId}] - 독립 세션 생성`);
      
      // ✅ 개별 진단은 독립적인 세션 키 사용
      const individualKey = `${frameworkCode}_req_${reqId}`;
      const newSessionId = generateSessionId();
      setSessionId(individualKey, newSessionId);
      console.log(`🆕 개별 진단 세션 [${individualKey}]:`, newSessionId);

      const auditData = await complianceApi.auditRequirement(frameworkCode, reqId, newSessionId);
      console.log('✅ 진단 완료:', auditData);

      setAuditResults(prev => ({
        ...prev,
        [reqId]: auditData,
      }));

      setRequirements(prev =>
        prev.map(req =>
          req.id === reqId
            ? {
                ...req,
                mapping_status: auditData.requirement_status,
                audit_result: auditData,
              }
            : req
        )
      );

      alert('진단이 완료되었습니다.');
    } catch (err) {
      console.error('❌ 진단 실패:', err);
      alert('진단에 실패했습니다: ' + err.message);
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
      console.log(`🚀 전체 진단 시작 [${frameworkCode}] - 새 세션 생성`);
      
      // ✅ 전체 진단 세션 생성 (프레임워크별로 독립)
      const newSessionId = generateSessionId();
      setSessionId(frameworkCode, newSessionId);
      console.log(`🆕 전체 진단 세션 [${frameworkCode}]:`, newSessionId);

      let executed = 0;
      let total = 0;

      await complianceApi.auditAllStreaming(frameworkCode, newSessionId, (evt) => {
        if (evt.type === 'meta') {
          total = evt.total || 0;
          setProgress({ total, executed });
        } else if (evt.type === 'requirement') {
          executed += 1;
          setProgress({ total, executed });

          setRequirements(prev =>
            prev.map(r =>
              r.id === evt.requirement_id
                ? { ...r, mapping_status: evt.requirement_status, audit_result: evt }
                : r
            )
          );
          
          setAuditResults(prev => ({
            ...prev,
            [evt.requirement_id]: evt
          }));
        }
      });

      console.log(`✅ 전체 진단 완료 [${frameworkCode}]`);
      alert('전체 진단이 완료되었습니다.');
    } catch (err) {
      console.error('❌ 전체 진단 실패:', err);
      alert('전체 진단에 실패했습니다: ' + err.message);
    } finally {
      setStreaming(false);
      setAuditing(false);
    }
  };

  const getMappingStatusBadge = (status) => {
    if (status === 'COMPLIANT' || status === 'Compliant') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-blue-800">
          준수
        </span>
      );
    }
    if (status === 'NON_COMPLIANT' || status === 'Non-Compliant') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          미준수
        </span>
      );
    }
    if (status === 'SKIPPED' || status === 'Skipped') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          건너뜀
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        -
      </span>
    );
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
    setExpandedItems(prev => ({
      ...prev,
      [mappingCode]: !prev[mappingCode],
    }));
  };

  const closeSidePanel = () => {
    setSidePanelOpen(false);
    setMappingDetail(null);
    setExpandedItems({});
  };

  return (
    <div className="relative">
      <style>{`
        .requirements-table .id-column { display: none; }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>

      <div className="flex items-center gap-3">
        <ClipboardList className="w-8 h-8 text-primary-500" />
        <h1 className="text-3xl font-bold text-gray-900">Compliance</h1>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 py-2 px-2">
        <button
          onClick={() => {
            setSelectedFramework(null);
            setRequirements([]);
            closeSidePanel();
          }}
          className="hover:text-blue-600"
        >
          Frameworks
        </button>
        {selectedFramework && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900">{selectedFramework}</span>
          </>
        )}
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

      {!selectedFramework && !loading && (
        <>
          {frameworks.length === 0 && !error ? (
            <div className="bg-white rounded-lg shadow-sm border p-12 text-center">
              <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">프레임워크 데이터가 없습니다.</p>
              <p className="text-gray-400 text-sm mt-2">API 연결 상태를 확인하세요.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {frameworks.map(fw => (
                <div
                  key={fw.framework}
                  onClick={() => fetchRequirements(fw.framework)}
                  className="bg-white rounded-lg shadow-sm border p-6 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                        <img
                          src={getFrameworkLogo(fw.framework)}
                          alt={`${fw.framework} logo`}
                          className="w-full h-full object-contain p-1"
                          onError={e => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <ClipboardList className="w-6 h-6 text-blue-600" style={{ display: 'none' }} />
                      </div>
                      <div className="flex-1 ml-2">
                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{fw.framework}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">Compliance Framework</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex-shrink-0 w-20">
                      <span className="text-2xl font-bold text-gray-900 ml-2">{fw.count}</span>
                    </div>
                    <span className="text-sm text-gray-500">Requirements</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {selectedFramework && !loading && (
        <div className={`bg-white rounded-lg shadow-sm border transition-all ${sidePanelOpen ? 'mr-[50%]' : ''}`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">{selectedFramework} Requirements</h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{requirements.length} 항목</span>
                <div className="flex items-center gap-3">
                  {streaming && (
                    <span className="text-xs text-gray-500">
                      진행 {progress.executed}/{progress.total}
                    </span>
                  )}
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
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full requirements-table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '40px' }}></th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '60px' }}>No</th>
                  <th className="id-column px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '200px' }}>항목 코드</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ minWidth: '350px' }}>세부 사항</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '100px' }}>매핑 상태</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '200px' }}>위협</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{ width: '180px' }}>액션</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {requirements
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((req, index) => (
                  <React.Fragment key={req.id}>
                    <tr className="hover:bg-gray-50 border-b border-gray-200">
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900" style={{ width: '40px' }}>
                        {req.audit_result && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleExpand(`req-${req.id}`);
                            }}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {expandedItems[`req-${req.id}`] ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-center font-medium" style={{ width: '60px' }}>
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </td>
                      <td className="id-column px-6 py-4 whitespace-nowrap text-sm text-gray-900">{req.id}</td>
                      <td className="px-6 py-2 text-sm text-gray-900" style={{ width: '200px' }}>
                        <span 
                          className="line-clamp-2 block cursor-pointer hover:text-primary-600 transition-colors" 
                          onClick={() => setExpandedText({ title: '항목 코드', content: req.item_code })}
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
                      <td className="px-6 py-4 whitespace-nowrap" style={{ width: '100px' }}>{getMappingStatusBadge(req.mapping_status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-900" style={{ width: '200px' }}>
                        {req.threats && req.threats.length > 0 ? (
                          <div
                            className="space-y-1 cursor-pointer hover:text-blue-600 transition-colors"
                            onClick={() => setExpandedText({
                              title: '관련 위협',
                              content: req.threats,
                              isTable: true
                            })}
                          >
                            {req.threats.slice(0, 2).map((threat, idx) => (
                              <div key={idx} className="text-xs text-gray-700">
                                • {threat.title || `Threat ${idx + 1}`}
                              </div>
                            ))}
                            {req.threats.length > 2 && (
                              <div className="text-xs text-gray-500">+{req.threats.length - 2}개 더</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ width: '180px' }}>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => fetchMappingDetail(selectedFramework, req.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            상세보기
                          </button>
                          <button
                            onClick={e => {
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
                                  <div className="text-2xl font-bold text-green-600">
                                    {req.audit_result.summary.COMPLIANT || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">준수</div>
                                </div>
                                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                                  <div className="text-2xl font-bold text-red-600">
                                    {req.audit_result.summary.NON_COMPLIANT || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">미준수</div>
                                </div>
                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                                  <div className="text-2xl font-bold text-yellow-600">
                                    {req.audit_result.summary.SKIPPED || 0}
                                  </div>
                                  <div className="text-xs text-gray-600">건너뜀</div>
                                </div>
                              </div>
                            )}

                            {req.audit_result.results && req.audit_result.results.length > 0 ? (
                              <div className="space-y-2">
                                {req.audit_result.results.map((result, idx) => {
                                  const isResultExpanded = expandedItems[`result-${req.id}-${idx}`];
                                  const borderColor = 
                                    result.status === 'COMPLIANT' ? 'border-green-500' :
                                    result.status === 'NON_COMPLIANT' ? 'border-red-500' :
                                    result.status === 'SKIPPED' ? 'border-yellow-500' : 'border-gray-500';
                                  const statusBadge =
                                    result.status === 'COMPLIANT' ? 'bg-green-100 text-green-800' :
                                    result.status === 'NON_COMPLIANT' ? 'bg-red-100 text-red-800' :
                                    result.status === 'SKIPPED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800';

                                  return (
                                    <div key={idx} className={`border-l-4 ${borderColor} bg-white rounded-r-lg shadow-sm overflow-hidden`}>
                                      <button
                                        onClick={() => toggleExpand(`result-${req.id}-${idx}`)}
                                        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center gap-4">
                                          <span className="font-bold text-gray-900">{result.mapping_code}</span>
                                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge}`}>
                                            {getStatusText(result.status)}
                                          </span>
                                          {result.evaluations && result.evaluations.length > 0 && (
                                            <span className="text-sm text-gray-600">
                                              {result.evaluations.length}개 리소스 확인
                                            </span>
                                          )}
                                        </div>
                                        {isResultExpanded ? (
                                          <ChevronUp className="w-5 h-5 text-gray-400" />
                                        ) : (
                                          <ChevronDown className="w-5 h-5 text-gray-400" />
                                        )}
                                      </button>

                                      {isResultExpanded && (
                                        <div className="border-t border-gray-200">
                                          {result.evaluations && result.evaluations.length > 0 ? (
                                            <div className="p-4 space-y-2">
                                              {result.evaluations.map((evaluation, evalIdx) => {
                                                const evalBgColor = 
                                                  evaluation.status === 'COMPLIANT' ? 'bg-green-50' :
                                                  evaluation.status === 'NON_COMPLIANT' ? 'bg-red-50' :
                                                  'bg-gray-50';
                                                
                                                return (
                                                  <div key={evalIdx} className={`flex items-center justify-between p-3 ${evalBgColor} rounded`}>
                                                    <div className="flex-1">
                                                      <div className="text-sm font-medium text-gray-900">
                                                        {evaluation.service}
                                                        {evaluation.resource_id && `: ${evaluation.resource_id}`}
                                                      </div>
                                                      <div className="text-xs text-gray-600 mt-1">{evaluation.decision}</div>
                                                      {evaluation.extra?.error && (
                                                        <div className="text-xs text-red-600 mt-1 p-2 bg-red-100 rounded">
                                                          {evaluation.extra.error}
                                                        </div>
                                                      )}
                                                    </div>
                                                    {getStatusIcon(evaluation.status)}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : result.reason ? (
                                            <div className="p-4 bg-yellow-50 text-sm text-yellow-800">
                                              {result.reason}
                                            </div>
                                          ) : (
                                            <div className="p-4 text-sm text-gray-500">
                                              상세 정보 없음
                                            </div>
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

          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              {requirements.length}개 중 {Math.min((currentPage - 1) * itemsPerPage + 1, requirements.length)}-{Math.min(currentPage * itemsPerPage, requirements.length)} 표시
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                이전
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.ceil(requirements.length / itemsPerPage) }, (_, i) => i + 1)
                  .filter(page => {
                    const totalPages = Math.ceil(requirements.length / itemsPerPage);
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                    if (page === currentPage - 2 || page === currentPage + 2) return page;
                    return false;
                  })
                  .map((page, idx, array) => (
                    <React.Fragment key={page}>
                      {idx > 0 && array[idx - 1] !== page - 1 && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(requirements.length / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(requirements.length / itemsPerPage)}
                className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      )}

      {expandedText && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setExpandedText(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{expandedText.title}</h3>
              <button 
                onClick={() => setExpandedText(null)} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-sm text-gray-900 leading-relaxed">
              {expandedText.isTable && Array.isArray(expandedText.content) ? (
                <div className="space-y-2">
                  {expandedText.content.map((item, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200">
                      <div className="font-medium text-gray-900 mb-1">
                        {item.item_code || item.title || `항목 ${idx + 1}`}
                      </div>
                      {item.title && item.title !== item.item_code && (
                        <div className="text-sm text-gray-700">{item.title}</div>
                      )}
                      {item.regulation && (
                        <div className="text-xs text-gray-600 mt-1">{item.regulation}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="whitespace-pre-wrap">
                  {expandedText.content || '-'}
                </div>
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
                          <div>
                            <dt className="text-xs text-gray-500">코드</dt>
                            <dd className="text-sm text-gray-900">{mapping.code}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">카테고리</dt>
                            <dd className="text-sm text-gray-900">{mapping.category || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">서비스</dt>
                            <dd className="text-sm text-gray-900">{mapping.service || '-'}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">점검 방법</h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">점검 방식</dt>
                            <dd className="text-sm text-gray-900">{mapping.check_how || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">콘솔 경로</dt>
                            <dd className="text-sm text-gray-900 break-all">{mapping.console_path || '-'}</dd>
                          </div>
                          {mapping.cli_cmd && (
                            <div>
                              <dt className="text-xs text-gray-500">CLI 명령어</dt>
                              <dd className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">{mapping.cli_cmd}</dd>
                            </div>
                          )}
                        </dl>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">판단 기준</h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">반환 필드</dt>
                            <dd className="text-sm text-gray-900">{mapping.return_field || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">준수 값</dt>
                            <dd className="text-sm text-green-600">{mapping.compliant_value || '-'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">미준수 값</dt>
                            <dd className="text-sm text-red-600">{mapping.non_compliant_value || '-'}</dd>
                          </div>
                        </dl>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">수정 방법</h4>
                        <dl className="space-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">콘솔 수정</dt>
                            <dd className="text-sm text-gray-900 break-all">{mapping.console_fix || '-'}</dd>
                          </div>
                          {mapping.cli_fix_cmd && (
                            <div>
                              <dt className="text-xs text-gray-500">CLI 수정 명령어</dt>
                              <dd className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded break-all">
                                {mapping.cli_fix_cmd}
                              </dd>
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

export default Policies2;