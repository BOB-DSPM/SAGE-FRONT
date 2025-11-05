// src/pages/ThreatComplianceDetail.js

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://43.200.30.132:8003';

const ThreatComplianceDetail = () => {
  const { reqId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedMapping, setExpandedMapping] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_BASE_URL}/compliance/SAGE-Threat/requirements/${reqId}/mappings`
        );
        setDetail(response.data);
        setError(null);
      } catch (err) {
        console.error('상세 정보 로드 실패:', err);
        setError('상세 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [reqId]);

  const toggleMapping = (index) => {
    setExpandedMapping(expandedMapping === index ? null : index);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'compliant': { label: '준수', className: 'bg-green-100 text-green-800' },
      'non-compliant': { label: '미준수', className: 'bg-red-100 text-red-800' },
      'partial': { label: '부분준수', className: 'bg-yellow-100 text-yellow-800' },
      'not-mapped': { label: '미매핑', className: 'bg-gray-100 text-gray-800' }
    };
    
    const config = statusConfig[status || ''] || { 
      label: status || '미확인', 
      className: 'bg-gray-100 text-gray-600' 
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '데이터를 찾을 수 없습니다.'}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center"
      >
        ← 목록으로
      </button>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs font-semibold rounded">
            {detail.framework}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{detail.requirement.title}</h1>
        {detail.requirement.item_code && (
          <p className="text-sm text-gray-600 font-mono">항목 코드: {detail.requirement.item_code}</p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">요구사항 정보</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
              준수 여부
            </label>
            <div>{getStatusBadge(detail.requirement.mapping_status)}</div>
          </div>
          {detail.regulation && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                규정
              </label>
              <div className="text-gray-900">{detail.regulation}</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          AWS 보안 통제 매핑 ({detail.mappings.length}개)
        </h2>
        
        {detail.mappings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            매핑된 보안 통제가 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {detail.mappings.map((mapping, index) => (
              <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleMapping(index)}
                >
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-white border border-gray-200 rounded font-mono text-sm font-bold text-blue-600">
                      {mapping.code}
                    </span>
                    {mapping.service && (
                      <span className="px-3 py-1 bg-gray-200 rounded text-sm font-semibold text-gray-700">
                        {mapping.service}
                      </span>
                    )}
                  </div>
                  <button className="text-gray-500">
                    {expandedMapping === index ? '▲' : '▼'}
                  </button>
                </div>

                {expandedMapping === index && (
                  <div className="p-4 space-y-4">
                    {mapping.category && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          카테고리
                        </label>
                        <div className="text-gray-900">{mapping.category}</div>
                      </div>
                    )}

                    {mapping.console_path && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          콘솔 경로
                        </label>
                        <div className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200">
                          {mapping.console_path}
                        </div>
                      </div>
                    )}

                    {mapping.check_how && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          점검 방법
                        </label>
                        <div className="text-gray-900">{mapping.check_how}</div>
                      </div>
                    )}

                    {mapping.cli_cmd && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          CLI 명령어
                        </label>
                        <pre className="font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                          {mapping.cli_cmd}
                        </pre>
                      </div>
                    )}

                    {mapping.return_field && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          반환 필드
                        </label>
                        <div className="font-mono text-sm bg-gray-50 p-3 rounded border border-gray-200">
                          {mapping.return_field}
                        </div>
                      </div>
                    )}

                    {(mapping.compliant_value || mapping.non_compliant_value) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
                        {mapping.compliant_value && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                              준수 값
                            </label>
                            <div className="font-semibold text-green-700 bg-green-50 p-2 rounded">
                              {mapping.compliant_value}
                            </div>
                          </div>
                        )}
                        {mapping.non_compliant_value && (
                          <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                              미준수 값
                            </label>
                            <div className="font-semibold text-red-700 bg-red-50 p-2 rounded">
                              {mapping.non_compliant_value}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {mapping.console_fix && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          콘솔 수정 방법
                        </label>
                        <div className="text-gray-900">{mapping.console_fix}</div>
                      </div>
                    )}

                    {mapping.cli_fix_cmd && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                          CLI 수정 명령어
                        </label>
                        <pre className="font-mono text-sm bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto">
                          {mapping.cli_fix_cmd}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreatComplianceDetail;