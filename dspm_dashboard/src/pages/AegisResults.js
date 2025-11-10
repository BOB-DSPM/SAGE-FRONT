// src/pages/AegisResults.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { aegisApi } from '../services/aegisApi';
import { AlertTriangle, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, RefreshCw, X, Clock } from 'lucide-react';

const AegisResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { services, timestamp, selectedItems, crossCheckReport } = location.state || {};

  const [items, setItems] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [allFilteredItems, setAllFilteredItems] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [expandedEntityModal, setExpandedEntityModal] = useState(null);
  const [retentionViolations, setRetentionViolations] = useState(null);
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  const pageSize = 20;

  const getSourceNames = () => {
    if (!services || services.length === 0) return [];
    return services;
  };

  const calculateCategoryCounts = (filteredItems) => {
    const categories = {
      none: 0,
      public: 0,
      sensitive: 0,
      identifiers: 0,
    };

    filteredItems.forEach(item => {
      const category = item.category || 'none';
      if (categories.hasOwnProperty(category)) {
        categories[category]++;
      }
    });

    return {
      total: filteredItems.length,
      categories: categories,
    };
  };

  const processRetentionViolations = () => {
    if (!crossCheckReport || !crossCheckReport.s3_scan) {
      setRetentionViolations({
        count: 0,
        matched_ids: [],
        matched_files: [],
        rds_ids_checked: [],
        not_found_ids: []
      });
      return;
    }

    const s3Matches = crossCheckReport.s3_scan.matches;
    
    const selectedBuckets = new Set(
      selectedItems
        ?.filter(item => item.type === 's3')
        .map(item => item.name) || []
    );

    const filteredMatchedFiles = s3Matches.matched_files?.filter(file => {
      return selectedBuckets.has(file.bucket);
    }) || [];

    const filteredFoundIds = new Set();
    filteredMatchedFiles.forEach(file => {
      file.found_ids?.forEach(id => filteredFoundIds.add(id));
    });

    setRetentionViolations({
      count: filteredFoundIds.size,
      matched_ids: Array.from(filteredFoundIds),
      matched_files: filteredMatchedFiles,
      rds_ids_checked: s3Matches.rds_ids_checked || [],
      not_found_ids: s3Matches.not_found_ids || [],
      total_matched_ids: s3Matches.found_ids?.length || 0,
      total_matched_files: s3Matches.matched_files?.length || 0
    });
  };

  const handleRetentionCardClick = () => {
    if (retentionViolations && retentionViolations.count > 0) {
      setShowRetentionModal(true);
    } else {
      alert('선택한 버킷에서 보유기간이 만료된 데이터가 없습니다.');
    }
  };

  useEffect(() => {
    if (crossCheckReport) {
      processRetentionViolations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, selectedCategory, selectedResource]);

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh || !isAnalyzing) return;

    const interval = setInterval(() => {
      loadData();
      loadStats();
      setCountdown(10);
    }, 10000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isAnalyzing]);

  useEffect(() => {
    if (!autoRefresh || !isAnalyzing) return;

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return 10;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, [autoRefresh, isAnalyzing]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const sourceNames = getSourceNames();

      const fetchAllItems = async () => {
        let allItems = [];
        let currentFetchPage = 1;
        const fetchPageSize = 200;
        let hasMore = true;

        while (hasMore) {
          const response = await aegisApi.getFrontList({
            page: currentFetchPage,
            size: fetchPageSize,
          });

          if (response.items && response.items.length > 0) {
            allItems = [...allItems, ...response.items];

            if (response.items.length < fetchPageSize) {
              hasMore = false;
            } else {
              currentFetchPage++;
            }
          } else {
            hasMore = false;
          }

          if (currentFetchPage > 50) {
            hasMore = false;
          }
        }

        return allItems;
      };

      const allItems = await fetchAllItems();

      let baseFiltered = allItems;
      
      if (sourceNames.length > 0) {
        baseFiltered = allItems.filter(item => {
          const itemSource = item.source || '';
          return sourceNames.some(name => itemSource.includes(name));
        });
      }

      let resourceFiltered = baseFiltered;
      if (selectedResource) {
        resourceFiltered = baseFiltered.filter(item => {
          const itemSource = item.source || '';
          return itemSource.includes(selectedResource);
        });
      }

      setAllFilteredItems(resourceFiltered);

      if (!categoryCounts || selectedResource !== null) {
        const counts = calculateCategoryCounts(resourceFiltered);
        setCategoryCounts(counts);
      }

      let displayFiltered = resourceFiltered;
      if (selectedCategory) {
        displayFiltered = resourceFiltered.filter(item => item.category === selectedCategory);
      }

      setTotalItems(displayFiltered.length);

      const startIdx = (currentPage - 1) * pageSize;
      const endIdx = startIdx + pageSize;
      const pageItems = displayFiltered.slice(startIdx, endIdx);

      setItems(pageItems);
      setTotalPages(Math.ceil(displayFiltered.length / pageSize));

      if (baseFiltered.length > 0 && isAnalyzing) {
        setIsAnalyzing(false);
        setAutoRefresh(false);
      }

    } catch (err) {
      console.error('데이터 로드 실패:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await aegisApi.getFrontStats();
      setStats(statsData);
    } catch (err) {
      console.error('통계 로드 실패:', err);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'sensitive': 'bg-red-100 text-red-800 border-red-300',
      'public': 'bg-orange-100 text-orange-800 border-orange-300',
      'identifiers': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'none': 'bg-green-100 text-green-800 border-green-300',
    };
    return colors[category] || colors['none'];
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'sensitive':
        return <AlertTriangle className="w-4 h-4 text-red-600 " />;
      case 'public':
        return <CheckCircle className="w-4 h-4 text-orange-600" />;
      case 'identifiers':
        return <Info className="w-4 h-4 text-yellow-400 " />;
      case 'none':
        return <XCircle className="w-4 h-4 text-green-600" />;
      default:
        return <XCircle className="w-4 h-4" />;
    }
  };

  const handleItemClick = (item) => {
    setSelectedItem(item);
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handleResourceFilter = (resource) => {
    setSelectedResource(resource);
    setSelectedCategory(null);
    setCurrentPage(1);
    setCategoryCounts(null);
  };

  if (!services) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-gray-600 mb-4">잘못된 접근입니다.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">데이터 위협 분석 결과</h2>
            <p className="text-gray-600 mt-1">
              분석 시작: {new Date(timestamp).toLocaleString('ko-KR')}
            </p>
            {isAnalyzing ? (
              <p className="text-sm text-blue-600 mt-2">
                🔍 분석 진행 중... {autoRefresh && `(${countdown}초 후 자동 새로고침)`}
              </p>
            ) : (
              <p className="text-sm text-green-600 mt-2">
                ✓ 분석 완료
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadData();
                loadStats();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              목록으로
            </button>
          </div>
        </div>

        {services && services.length > 1 && (
          <div className="border-t pt-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleResourceFilter(null)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  !selectedResource
                    ? 'bg-primary-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({services.length}개)
              </button>
              {services.map((service, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResourceFilter(service)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedResource === service
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {categoryCounts && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div
            className={`bg-white rounded-lg p-6 shadow-sm border cursor-pointer transition-all ${
              !selectedCategory ? 'ring-2 ring-primary-600' : 'hover:shadow-md'
            }`}
            onClick={() => handleCategoryClick(null)}
          >
            <div className="text-sm text-gray-600 mb-1">전체</div>
            <div className="text-3xl font-bold text-gray-900">{categoryCounts.total}</div>
          </div>

          {Object.entries(categoryCounts.categories || {}).map(([category, count]) => (
            <div
              key={category}
              className={`bg-white rounded-lg p-6 shadow-sm border cursor-pointer transition-all ${
                selectedCategory === category ? 'ring-2 ring-primary-600' : 'hover:shadow-md'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                {getCategoryIcon(category)}
                <span className="capitalize">{category}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{count}</div>
            </div>
          ))}

          {retentionViolations !== null && (
            <div
              className={`bg-white rounded-lg p-6 shadow-sm border cursor-pointer transition-all hover:shadow-md ${
                retentionViolations.count > 0 ? 'border-purple-300 ring-2 ring-purple-200' : ''
              }`}
              onClick={handleRetentionCardClick}
            >
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                <Clock className="w-4 h-4 text-purple-600" />
                <span>보유기간 만료</span>
              </div>
              <div className={`text-3xl font-bold ${retentionViolations.count > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                {retentionViolations.count}
              </div>
              {retentionViolations.count > 0 ? (
                <div className="mt-2 text-xs text-red-600 font-semibold">
                  ⚠️ 위반 발견
                </div>
              ) : (
                <div className="mt-2 text-xs text-green-600">
                  ✓ 정상
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {isAnalyzing && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-2xl">⏳</div>
            <div>
              <p className="font-medium text-blue-900">분석이 진행 중입니다</p>
              <p className="text-sm text-blue-700 mt-1">
                데이터를 스캔하고 민감 정보를 탐지하는 중입니다. 잠시만 기다려주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!isAnalyzing && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              검출된 항목 ({totalItems}개)
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-600">로딩 중...</div>
            </div>
          ) : items.length > 0 ? (
            <>
              <div className="divide-y">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleItemClick(item)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium text-gray-900">{item.file}</h4>
                          {item.category && (
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(item.category)}`}>
                              {item.category}
                            </span>
                          )}
                          {item.type && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                              {item.type}
                            </span>
                          )}
                        </div>

                        {item.source && (
                          <p className="text-sm text-gray-600 mb-2">
                            소스: {item.source}
                          </p>
                        )}

                        {item.reason && (
                          <p className="text-sm text-gray-700">{item.reason}</p>
                        )}

                        {item.ai_hits && item.ai_hits.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {item.ai_hits.slice(0, 5).map((hit, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs"
                                >
                                  <span className="font-semibold">{hit.entity}</span>
                                  <span className="text-gray-600">·</span>
                                  <span className="font-mono">{hit.text}</span>
                                </span>
                              ))}
                              {item.ai_hits.length > 5 && (
                                <span className="px-2 py-1 text-xs text-gray-500">
                                  +{item.ai_hits.length - 5}개 더
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {item.stats && (
                          <div className="flex gap-4 mt-3 text-sm text-gray-600">
                            {item.stats.rows_scanned && (
                              <span>스캔: {item.stats.rows_scanned}행</span>
                            )}
                            {item.stats.total_entities && (
                              <span>엔티티: {item.stats.total_entities}개</span>
                            )}
                            {item.ai_hits && item.ai_hits.length > 0 && (
                              <span>AI 탐지: {item.ai_hits.length}개</span>
                            )}
                          </div>
                        )}
                      </div>

                      {(Object.keys(item.entities || {}).length > 0 || (item.ai_hits && item.ai_hits.length > 0)) && (
                        <div className="ml-4 text-right">
                          {Object.keys(item.entities || {}).length > 0 && (
                            <span className="text-sm text-gray-600 block">
                              {Object.keys(item.entities).length}개 엔티티 유형
                            </span>
                          )}
                          {item.ai_hits && item.ai_hits.length > 0 && (
                            <span className="text-sm text-blue-600 block mt-1">
                              AI 탐지 {item.ai_hits.length}건
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="p-6 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    페이지 {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-gray-500">
              검출된 항목이 없습니다.
            </div>
          )}
        </div>
      )}

      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{selectedItem.file}</h3>
                {selectedItem.source && (
                  <p className="text-sm text-gray-600 mt-1">소스: {selectedItem.source}</p>
                )}
              </div>
              <button 
                onClick={() => setSelectedItem(null)} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">기본 정보</h4>
                <dl className="grid grid-cols-2 gap-4">
                  {selectedItem.type && (
                    <div>
                      <dt className="text-sm text-gray-600">파일 타입</dt>
                      <dd className="text-sm text-gray-900">{selectedItem.type}</dd>
                    </div>
                  )}
                  {selectedItem.category && (
                    <div>
                      <dt className="text-sm text-gray-600">카테고리</dt>
                      <dd>
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${getCategoryColor(selectedItem.category)}`}>
                          {selectedItem.category}
                        </span>
                      </dd>
                    </div>
                  )}
                  {selectedItem.stats && selectedItem.stats.rows_scanned && (
                    <div>
                      <dt className="text-sm text-gray-600">스캔한 행 수</dt>
                      <dd className="text-sm text-gray-900">{selectedItem.stats.rows_scanned.toLocaleString()}</dd>
                    </div>
                  )}
                  {selectedItem.stats && selectedItem.stats.total_entities && (
                    <div>
                      <dt className="text-sm text-gray-600">탐지된 엔티티</dt>
                      <dd className="text-sm text-gray-900">{selectedItem.stats.total_entities.toLocaleString()}</dd>
                    </div>
                  )}
                  {selectedItem.ai_hits && (
                    <div>
                      <dt className="text-sm text-gray-600">AI 탐지 건수</dt>
                      <dd className="text-sm text-gray-900">{selectedItem.ai_hits.length.toLocaleString()}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {selectedItem.reason && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">분류 이유</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedItem.reason}
                  </p>
                </div>
              )}

              {selectedItem.ai_hits && selectedItem.ai_hits.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">AI 탐지 결과 ({selectedItem.ai_hits.length}건)</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedItem.ai_hits.map((hit, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded text-xs font-semibold min-w-[80px] text-center">
                            {hit.entity}
                          </span>
                          <span className="text-sm text-gray-900 font-mono">{hit.text}</span>
                        </div>
                        <span className="text-xs text-gray-600">
                          신뢰도: {(hit.score * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedItem.entities && Object.keys(selectedItem.entities).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">탐지된 엔티티</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedItem.entities).map(([type, entityData]) => {
                      const valueArray = entityData?.values && Array.isArray(entityData.values) 
                        ? entityData.values 
                        : (Array.isArray(entityData) ? entityData : []);
                      
                      if (valueArray.length === 0) return null;
                      
                      return (
                        <div key={type} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-gray-900">{type}</span>
                            <span className="text-sm text-gray-600">{valueArray.length}개</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {valueArray.slice(0, 10).map((value, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-mono"
                              >
                                {value}
                              </span>
                            ))}
                            {valueArray.length > 10 && (
                              <button
                                onClick={() => setExpandedEntityModal({ type, values: valueArray, count: valueArray.length })}
                                className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition-colors"
                              >
                                +{valueArray.length - 10}개 더 보기
                              </button>
                            )}
                          </div>
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

      {expandedEntityModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" 
          onClick={() => setExpandedEntityModal(null)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{expandedEntityModal.type}</h3>
                <p className="text-sm text-gray-600 mt-1">총 {expandedEntityModal.count}개</p>
              </div>
              <button 
                onClick={() => setExpandedEntityModal(null)} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {expandedEntityModal.values.map((value, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-sm font-mono"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRetentionModal && retentionViolations && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" 
          onClick={() => setShowRetentionModal(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[80vh] overflow-auto m-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">보유기간 만료 데이터</h3>
                <p className="text-sm text-gray-600 mt-1">
                  선택한 S3 버킷에서 보존기간이 만료된 데이터가 남아있는 것을 발견했습니다.
                </p>
                {retentionViolations.total_matched_files > retentionViolations.matched_files.length && (
                  <p className="text-sm text-orange-600 mt-1">
                    ※ 전체 {retentionViolations.total_matched_files}개 파일 중 선택한 버킷의 {retentionViolations.matched_files.length}개 파일만 표시
                  </p>
                )}
              </div>
              <button 
                onClick={() => setShowRetentionModal(false)} 
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">검사한 RDS ID</div>
                <div className="text-2xl font-bold text-blue-900">
                  {retentionViolations.rds_ids_checked.length}개
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="text-sm text-red-600 mb-1">선택한 버킷에서 발견된 ID</div>
                <div className="text-2xl font-bold text-red-900">
                  {retentionViolations.matched_ids.length}개
                </div>
                {retentionViolations.total_matched_ids > retentionViolations.matched_ids.length && (
                  <div className="text-xs text-red-600 mt-1">
                    (전체: {retentionViolations.total_matched_ids}개)
                  </div>
                )}
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">정상 처리된 ID</div>
                <div className="text-2xl font-bold text-green-900">
                  {retentionViolations.not_found_ids.length}개
                </div>
              </div>
            </div>

            {retentionViolations.matched_ids.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  선택한 S3 버킷에 남아있는 ID 목록 ({retentionViolations.matched_ids.length}개)
                </h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {retentionViolations.matched_ids.map((id) => (
                      <span
                        key={id}
                        className="px-3 py-1.5 bg-red-100 text-red-800 rounded font-mono text-sm font-semibold"
                      >
                        ID: {id}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {retentionViolations.matched_files.length > 0 ? (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">
                  위반 파일 상세 ({retentionViolations.matched_files.length}개 파일)
                </h4>
                <div className="space-y-4">
                  {retentionViolations.matched_files.map((file, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-gray-900">{file.file_key}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              버킷: {file.bucket} | 크기: {(file.file_size / 1024).toFixed(2)} KB
                            </div>
                          </div>
                          <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm font-medium">
                            {file.found_ids.length}개 ID 발견
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4">
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  행 번호
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                  데이터
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {file.matches.map((match, matchIdx) => (
                                <tr key={matchIdx} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm font-mono font-semibold text-gray-900">
                                    {match.id}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {match.row_number}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-xs text-gray-700 font-mono">
                                      {Object.entries(match.row_data).map(([key, value]) => (
                                        <div key={key} className="mb-1">
                                          <span className="font-semibold text-gray-900">{key}:</span>{' '}
                                          <span className="text-gray-700">{value || 'null'}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                선택한 S3 버킷에서는 보유기간 만료 데이터가 발견되지 않았습니다.
              </div>
            )}

            {retentionViolations.not_found_ids.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  정상 처리된 ID ({retentionViolations.not_found_ids.length}개)
                </h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex flex-wrap gap-2">
                    {retentionViolations.not_found_ids.map((id) => (
                      <span
                        key={id}
                        className="px-3 py-1.5 bg-green-100 text-green-800 rounded font-mono text-sm"
                      >
                        ID: {id}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-green-700 mt-3">
                    이 ID들은 RDS에서 익명화되었고 S3에서도 발견되지 않았습니다.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AegisResults;