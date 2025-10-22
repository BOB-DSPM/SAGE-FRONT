// src/pages/AegisResults.js
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { aegisApi } from '../services/aegisApi';
import { AlertTriangle, CheckCircle, XCircle, Info, ChevronLeft, ChevronRight, RefreshCw, X } from 'lucide-react';

const AegisResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { services, timestamp, selectedItems } = location.state || {};

  console.log('AegisResults - location.state:', location.state);
  console.log('AegisResults - services:', services);
  console.log('AegisResults - selectedItems:', selectedItems);
  console.log('AegisResults - timestamp:', timestamp);

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

  const pageSize = 20;

  // 선택된 리소스 이름들 가져오기
  const getSourceNames = () => {
    if (!services || services.length === 0) return [];
    console.log('services:', services);
    console.log('selectedItems:', selectedItems);
    return services;
  };

  // 필터링된 아이템들로부터 카테고리 통계 계산
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

  // 초기 로드
  useEffect(() => {
    console.log('AegisResults - useEffect 실행');
    loadData();
    if (!stats) {
      loadStats();
    }
  }, [currentPage, selectedCategory, selectedResource]);

  // 자동 새로고침 (10초마다)
  useEffect(() => {
    if (!autoRefresh || !isAnalyzing) return;

    const interval = setInterval(() => {
      console.log('자동 새로고침 실행');
      loadData();
      loadStats();
      setCountdown(10);
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, isAnalyzing, currentPage, selectedCategory, selectedResource]);

  // 카운트다운
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
    console.log('loadData 시작');
    setIsLoading(true);
    setError(null);

    try {
      const sourceNames = getSourceNames();
      console.log('Source names:', sourceNames);

      // 전체 데이터를 가져오기 위한 함수
      const fetchAllItems = async () => {
        let allItems = [];
        let currentFetchPage = 1;
        const fetchPageSize = 200;
        let hasMore = true;

        while (hasMore) {
          console.log(`페이지 ${currentFetchPage} 로딩 중...`);
          
          const response = await aegisApi.getFrontList({
            page: currentFetchPage,
            size: fetchPageSize,
          });

          console.log(`페이지 ${currentFetchPage} 응답:`, response);

          if (response.items && response.items.length > 0) {
            allItems = [...allItems, ...response.items];
            console.log(`누적 아이템 수: ${allItems.length}`);

            // 더 이상 데이터가 없으면 중단
            if (response.items.length < fetchPageSize) {
              hasMore = false;
              console.log('마지막 페이지 도달');
            } else {
              currentFetchPage++;
            }
          } else {
            hasMore = false;
            console.log('더 이상 데이터 없음');
          }

          // 무한 루프 방지 (최대 50페이지 = 10,000개)
          if (currentFetchPage > 50) {
            console.warn('최대 페이지 수 도달');
            hasMore = false;
          }
        }

        console.log(`총 ${allItems.length}개 아이템 로드 완료`);
        return allItems;
      };

      // 전체 아이템 가져오기
      let filteredItems = await fetchAllItems();
      console.log('전체 로드된 items 개수:', filteredItems.length);

      // sourceNames가 있으면 필터링 (모든 선택된 리소스 포함)
      if (sourceNames && sourceNames.length > 0) {
        console.log('=== 리소스 필터링 시작 ===');
        console.log('필터링 기준 sourceNames:', sourceNames);
        
        filteredItems = filteredItems.filter(item => {
          if (!item.source) return false;
          
          // 선택된 리소스 중 하나라도 매칭되면 true
          return sourceNames.some(sourceName => {
            const matches = item.source.includes(sourceName) || 
                           item.source.includes(`s3/${sourceName}`) ||
                           item.source.includes(`s3://${sourceName}`);
            
            if (matches) {
              console.log(`  ✓ 매칭: ${item.source} <- ${sourceName}`);
            }
            
            return matches;
          });
        });
      }

      console.log('리소스 필터링된 items 개수:', filteredItems.length);

      // 선택된 리소스가 있으면 추가 필터링
      if (selectedResource) {
        console.log('=== 선택된 리소스 필터링 ===');
        console.log('선택된 리소스:', selectedResource);
        
        filteredItems = filteredItems.filter(item => {
          if (!item.source) return false;
          
          return item.source.includes(selectedResource) || 
                 item.source.includes(`s3/${selectedResource}`) ||
                 item.source.includes(`s3://${selectedResource}`);
        });
        
        console.log('리소스별 필터링 후 개수:', filteredItems.length);
      }

      // 전체 필터링된 아이템 저장
      setAllFilteredItems(filteredItems);

      // 카테고리 통계 재계산 (리소스 필터 변경 시마다)
      const newCategoryCounts = calculateCategoryCounts(filteredItems);
      console.log('카테고리 통계 계산:', newCategoryCounts);
      setCategoryCounts(newCategoryCounts);

      // 선택된 카테고리가 있으면 해당 카테고리만 필터링
      let displayItems = filteredItems;
      if (selectedCategory) {
        console.log('=== 카테고리 필터링 시작 ===');
        console.log('선택된 카테고리:', selectedCategory);
        displayItems = filteredItems.filter(item => item.category === selectedCategory);
        console.log('카테고리 필터링된 items 개수:', displayItems.length);
      }

      // 페이지네이션 처리
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = displayItems.slice(startIndex, endIndex);

      setItems(paginatedItems);
      setTotalItems(displayItems.length);
      setTotalPages(Math.ceil(displayItems.length / pageSize));
    } catch (err) {
      console.error('loadData 에러:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    console.log('loadStats 시작');
    try {
      const statsData = await aegisApi.getFrontStats();
      
      console.log('getFrontStats 응답:', statsData);
      
      setStats(statsData);

      // 분석 완료 여부 판단
      if (statsData && statsData.total_objects !== undefined && statsData.total_objects >= 0) {
        setIsAnalyzing(false);
        setAutoRefresh(false);
      }
    } catch (err) {
      console.error('통계 로드 실패:', err);
    }
  };

  const handleManualRefresh = () => {
    loadData();
    loadStats();
    setCountdown(10);
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
  };

  if (!services) {
    console.log('services가 없음 - 잘못된 접근');
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
      {/* 헤더 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">데이터 위협 분석 결과</h2>
            <p className="text-gray-600 mt-1">
              분석 시작: {new Date(timestamp).toLocaleString('ko-KR')}
            </p>
            {isAnalyzing ? (
              <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                분석 진행 중... {countdown}초 후 자동 새로고침
              </p>
            ) : categoryCounts && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                분석 완료: {categoryCounts.total}개 객체 중 {categoryCounts.categories.public + categoryCounts.categories.sensitive + categoryCounts.categories.identifiers}개 검출
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualRefresh}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
            {isAnalyzing && (
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
                  autoRefresh ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'
                }`}
              >
                {autoRefresh ? '자동 새로고침 중지' : '자동 새로고침 시작'}
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              돌아가기
            </button>
          </div>
        </div>

        {/* 선택된 서비스 목록 */}
        <div className="flex flex-wrap gap-2">
          {services.map((service, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {service}
            </span>
          ))}
        </div>
      </div>

      {/* 리소스 필터 */}
      {!isAnalyzing && services && services.length > 1 && (
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <label className="text-sm font-medium text-gray-700 mb-2 block">리소스별 필터</label>
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

      {/* 통계 카드 */}
      {categoryCounts && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>
      )}

      {/* 분석 중 상태 */}
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

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* 결과 목록 */}
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

                        {item.stats && (
                          <div className="flex gap-4 mt-3 text-sm text-gray-600">
                            {item.stats.rows_scanned && (
                              <span>스캔: {item.stats.rows_scanned}행</span>
                            )}
                            {item.stats.total_entities && (
                              <span>엔티티: {item.stats.total_entities}개</span>
                            )}
                          </div>
                        )}
                      </div>

                      {Object.keys(item.entities || {}).length > 0 && (
                        <div className="ml-4">
                          <span className="text-sm text-gray-600">
                            {Object.keys(item.entities).length}개 엔티티 유형
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 페이지네이션 */}
              {totalPages > 1 && (
                <div className="p-6 border-t flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    이전
                  </button>

                  <span className="text-sm text-gray-600">
                    {currentPage} / {totalPages} 페이지
                  </span>

                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    다음
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">분석 완료</p>
              <p className="text-gray-600">
                {selectedCategory 
                  ? `${selectedCategory} 카테고리에서 민감 정보가 검출되지 않았습니다.`
                  : '스캔한 데이터에서 민감 정보가 검출되지 않았습니다.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* 상세 모달 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto m-4">
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between z-10">
              <h3 className="text-xl font-semibold">{selectedItem.file}</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 기본 정보 */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">기본 정보</h4>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-600">ID</dt>
                    <dd className="text-sm font-mono text-gray-900">{selectedItem.id}</dd>
                  </div>
                  {selectedItem.source && (
                    <div>
                      <dt className="text-sm text-gray-600">소스</dt>
                      <dd className="text-sm text-gray-900">{selectedItem.source}</dd>
                    </div>
                  )}
                  {selectedItem.type && (
                    <div>
                      <dt className="text-sm text-gray-600">타입</dt>
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
                </dl>
              </div>

              {/* 이유 */}
              {selectedItem.reason && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">분류 이유</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedItem.reason}
                  </p>
                </div>
              )}

              {/* 엔티티 정보 */}
              {selectedItem.entities && Object.keys(selectedItem.entities).length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">검출된 엔티티</h4>
                  <div className="space-y-3">
                    {Object.entries(selectedItem.entities).map(([entityType, entityData]) => (
                      <div key={entityType} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-900">{entityType}</span>
                          <span className="text-sm text-gray-600">{entityData.count}개</span>
                        </div>
                        {entityData.values && entityData.values.length > 0 && (
                          <div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {entityData.values.slice(0, 5).map((value, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                                >
                                  {value}
                                </span>
                              ))}
                            </div>
                            {entityData.values.length > 5 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedEntityModal({ 
                                    type: entityType, 
                                    values: entityData.values,
                                    count: entityData.count 
                                  });
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 mt-2 cursor-pointer font-medium"
                              >
                                +{entityData.values.length - 5}개 더
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 통계 */}
              {selectedItem.stats && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">통계</h4>
                  <dl className="grid grid-cols-2 gap-4">
                    {selectedItem.stats.rows_scanned && (
                      <div>
                        <dt className="text-sm text-gray-600">스캔된 행 수</dt>
                        <dd className="text-sm text-gray-900">{selectedItem.stats.rows_scanned.toLocaleString()}</dd>
                      </div>
                    )}
                    {selectedItem.stats.total_entities && (
                      <div>
                        <dt className="text-sm text-gray-600">총 엔티티 수</dt>
                        <dd className="text-sm text-gray-900">{selectedItem.stats.total_entities.toLocaleString()}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 엔티티 전체 보기 모달 */}
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
    </div>
  );
};

export default AegisResults;