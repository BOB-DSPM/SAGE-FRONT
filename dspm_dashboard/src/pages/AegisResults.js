// src/pages/AegisResults.js
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { aegisApi } from '../services/aegisApi';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  X,
  Clock,
} from 'lucide-react';

/**
 * 카테고리 한글 패치
 *  - public: 고유식별정보, 민감정보가 아닌 개인정보
 *  - sensitive: 민감정보
 *  - identifiers: 고유식별정보
 *  - none: 개인정보 미포함 데이터
 */
const CATEGORY_META = {
  sensitive: {
    key: 'sensitive',
    label: '민감정보',
    badge: 'bg-red-100 text-red-800 border-red-300',
    icon: <AlertTriangle className="w-6 h-6 text-red-600" />,
  },
  public: {
    key: 'public',
    label: '개인정보',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: <CheckCircle className="w-6 h-6 text-orange-600" />,
  },
  identifiers: {
    key: 'identifiers',
    label: '고유식별정보',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: <Info className="w-6 h-6 text-yellow-400" />,
  },
  none: {
    key: 'none',
    label: '개인정보 미포함',
    badge: 'bg-green-100 text-green-800 border-green-300',
    icon: <XCircle className="w-6 h-6 text-green-600" />,
  },
};

// 교차 검증 API가 비어 있을 때를 위한 데모용 보존기간 위반 데이터
const RETENTION_DEMO_DATA = {
  count: 3,
  matched_ids: ['cust-1023', 'cust-2048', 'cust-3410'],
  matched_files: [
    {
      bucket: 'aegis-backup-prod',
      file_key: 'backup/2023-11-01/customer_export.csv',
      file_size: 268432,
      found_ids: ['cust-1023', 'cust-2048'],
      matches: [
        {
          id: 'cust-1023',
          row_number: 42,
          row_data: {
            customer_id: 'cust-1023',
            name: '최원겸',
            email: 'gyum@naver.com',
            expired_at: '2023-10-30',
          },
        },
        {
          id: 'cust-2048',
          row_number: 107,
          row_data: {
            customer_id: 'cust-2048',
            name: '이원찬',
            email: 'wonjjani@gmail.com',
            expired_at: '2023-10-28',
          },
        },
      ],
    },
    {
      bucket: 'aegis-backup-prod',
      file_key: 'backup/2023-10-25/order_history.json',
      file_size: 145120,
      found_ids: ['cust-3410'],
      matches: [
        {
          id: 'cust-3410',
          row_number: 12,
          row_data: {
            customer_id: 'cust-3410',
            order_id: 'ORD-9981',
            status: 'canceled',
            expired_at: '2023-09-30',
          },
        },
      ],
    },
  ],
  rds_ids_checked: ['cust-1023', 'cust-2048', 'cust-3410', 'cust-4100'],
  not_found_ids: ['cust-4100'],
  total_matched_ids: 3,
  total_matched_files: 2,
  isDemo: true,
};

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
  const [selectedResource, setSelectedResource] = useState(null);
  const [expandedEntityModal, setExpandedEntityModal] = useState(null);
  const [retentionViolations, setRetentionViolations] = useState(null);
  const [showRetentionModal, setShowRetentionModal] = useState(false);

  const pageSize = 20;

  // 목록으로 돌아가는 공통 처리
  const handleBackToList = () => {
    // TODO: 실제 "목록" 화면의 라우트로 수정 (예: '/aegis' 등)
    navigate('/data-target');
  };

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

    filteredItems.forEach((item) => {
      const category = item.category || 'none';
      if (Object.prototype.hasOwnProperty.call(categories, category)) {
        categories[category]++;
      }
    });

    return {
      total: filteredItems.length,
      categories,
    };
  };

  const processRetentionViolations = () => {
    if (!crossCheckReport || !crossCheckReport.s3_scan) {
      setRetentionViolations({ ...RETENTION_DEMO_DATA });
      return;
    }

    const s3Matches = crossCheckReport.s3_scan.matches;

    const selectedBuckets = new Set(
      selectedItems?.filter((item) => item.type === 's3').map((item) => item.name) || []
    );

    const filteredMatchedFiles =
      s3Matches.matched_files?.filter((file) => selectedBuckets.has(file.bucket)) || [];

    const filteredFoundIds = new Set();
    filteredMatchedFiles.forEach((file) => {
      file.found_ids?.forEach((id) => filteredFoundIds.add(id));
    });

    const processedViolations = {
      count: filteredFoundIds.size,
      matched_ids: Array.from(filteredFoundIds),
      matched_files: filteredMatchedFiles,
      rds_ids_checked: s3Matches.rds_ids_checked || [],
      not_found_ids: s3Matches.not_found_ids || [],
      total_matched_ids: s3Matches.found_ids?.length || 0,
      total_matched_files: s3Matches.matched_files?.length || 0,
      isDemo: false,
    };

    const hasRealViolations =
      processedViolations.count > 0 && processedViolations.matched_files.length > 0;

    if (!hasRealViolations) {
      setRetentionViolations({ ...RETENTION_DEMO_DATA });
      return;
    }

    setRetentionViolations(processedViolations);
  };

  const handleRetentionCardClick = () => {
    if (retentionViolations && retentionViolations.count > 0) {
      setShowRetentionModal(true);
    } else {
      alert('선택한 버킷에서 보존기간이 만료된 데이터가 없습니다.');
    }
  };

  useEffect(() => {
    processRetentionViolations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crossCheckReport]);

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
      setCountdown((prev) => {
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
        baseFiltered = allItems.filter((item) => {
          const itemSource = item.source || '';
          return sourceNames.some((name) => itemSource.includes(name));
        });
      }

      let resourceFiltered = baseFiltered;
      if (selectedResource) {
        resourceFiltered = baseFiltered.filter((item) => {
          const itemSource = item.source || '';
          return itemSource.includes(selectedResource);
        });
      }

      if (!categoryCounts || selectedResource !== null) {
        const counts = calculateCategoryCounts(resourceFiltered);
        setCategoryCounts(counts);
      }

      let displayFiltered = resourceFiltered;
      if (selectedCategory) {
        displayFiltered = resourceFiltered.filter((item) => item.category === selectedCategory);
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

  const getCategoryColor = (category) =>
    CATEGORY_META[category]?.badge || CATEGORY_META.none.badge;

  const getCategoryIcon = (category) => CATEGORY_META[category]?.icon || CATEGORY_META.none.icon;

  const getCategoryLabel = (category) =>
    CATEGORY_META[category]?.label || CATEGORY_META.none.label;

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
            onClick={handleBackToList}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // 메인 렌더
  // ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 text-[17px] leading-relaxed">
      {/* 헤더 카드 */}
      <div className="bg-white rounded-lg p-6 shadow-sm border-[3px] border-gray-300">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">데이터 위협 분석 결과</h2>
            <p className="text-gray-700 mt-1">
              분석 시작: {new Date(timestamp).toLocaleString('ko-KR')}
            </p>
            {isAnalyzing ? (
              <p className="text-[15px] text-blue-700 mt-2">
                🔍 분석 진행 중... {autoRefresh && `(${countdown}초 후 자동 새로고침)`}
              </p>
            ) : (
              <p className="text-[15px] text-green-700 mt-2">✓ 분석 완료</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                loadData();
                loadStats();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              새로고침
            </button>
            <button
              onClick={handleBackToList}
              className="px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
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
                className={`px-4 py-2 rounded-lg text-[16px] font-semibold transition-colors border-2 ${
                  !selectedResource
                    ? 'bg-primary-600 text-white border-primary-700'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                }`}
              >
                전체 ({services.length}개)
              </button>
              {services.map((service, idx) => (
                <button
                  key={idx}
                  onClick={() => handleResourceFilter(service)}
                  className={`px-4 py-2 rounded-lg text-[16px] font-semibold transition-colors border-2 ${
                    selectedResource === service
                      ? 'bg-primary-600 text-white border-primary-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-300'
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 카테고리 카드 */}
      {categoryCounts && !isAnalyzing && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 전체 */}
          <div
            className={`bg-white rounded-xl p-6 shadow-sm border-[3px] border-gray-400 cursor-pointer transition-all ${
              !selectedCategory ? 'ring-2 ring-primary-600' : 'hover:shadow-md'
            }`}
            onClick={() => handleCategoryClick(null)}
          >
            <div className="text-lg text-gray-800 font-semibold mb-1 flex items-center gap-2">
              전체
            </div>
            <div className="text-3xl font-bold text-gray-900 tracking-tight">
              {categoryCounts.total}
            </div>
          </div>

          {/* 분류별 */}
          {Object.entries(categoryCounts.categories || {}).map(([category, count]) => (
            <div
              key={category}
              className={`bg-white rounded-xl p-6 shadow-sm border-[3px] border-gray-400 cursor-pointer transition-all ${
                selectedCategory === category ? 'ring-2 ring-primary-600' : 'hover:shadow-md'
              }`}
              onClick={() => handleCategoryClick(category)}
            >
              <div className="flex items-center gap-3 text-lg text-gray-800 font-semibold mb-1">
                {getCategoryIcon(category)}
                <span>{getCategoryLabel(category)}</span>
              </div>
              <div className="text-3xl font-bold text-gray-900 tracking-tight">{count}</div>
            </div>
          ))}

          {/* 보존기간 만료 */}
              {retentionViolations !== null && (
            <div
              className={`bg-white rounded-xl p-6 shadow-sm border-[3px] cursor-pointer transition-all hover:shadow-md ${
                retentionViolations.count > 0
                  ? 'border-purple-300 ring-2 ring-purple-200'
                  : 'border-gray-300'
              }`}
              onClick={handleRetentionCardClick}
            >
              <div className="flex items-center gap-3 text-lg text-gray-800 font-semibold mb-1">
                <Clock className="w-7 h-7 text-purple-600" />
                <span>보존기간 만료</span>
              </div>
              <div
                className={`text-3xl font-bold tracking-tight ${
                  retentionViolations.count > 0 ? 'text-red-900' : 'text-gray-900'
                }`}
              >
                {retentionViolations.count}
              </div>
              {retentionViolations.count > 0 ? (
                <div className="mt-2 text-sm text-red-700 font-bold">⚠️ 위반 발견</div>
              ) : (
                <div className="mt-2 text-sm text-green-700 font-semibold">✓ 정상</div>
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
              <p className="font-semibold text-blue-900">분석이 진행 중입니다</p>
              <p className="text-[15px] text-blue-800 mt-1">
                데이터를 스캔하고 민감 정보를 탐지하는 중입니다.
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

      {/* 결과 리스트 카드 */}
      {!isAnalyzing && (
        <div className="bg-white rounded-lg shadow-sm border-[3px] border-gray-300">
          <div className="p-6 border-b">
            <h3 className="text-2xl font-semibold text-gray-900">
              검출된 항목 ({totalItems}개)
            </h3>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-700">로딩 중...</div>
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
                          <h4 className="font-semibold text-gray-900 text-[18px]">{item.file}</h4>
                          {item.category && (
                            <span
                              className={`px-2 py-1 rounded text-[13px] font-medium border ${getCategoryColor(
                                item.category
                              )}`}
                            >
                              {getCategoryLabel(item.category)}
                            </span>
                          )}
                          {item.type && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-[13px]">
                              {item.type}
                            </span>
                          )}
                        </div>

                        {item.source && (
                          <p className="text-[15px] text-gray-700 mb-2">소스: {item.source}</p>
                        )}

                        {item.reason && (
                          <p className="text-[15px] text-gray-800">{item.reason}</p>
                        )}

                        {item.ai_hits && item.ai_hits.length > 0 && (
                          <div className="mt-3">
                            <div className="flex flex-wrap gap-2">
                              {item.ai_hits.slice(0, 5).map((hit, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 text-gray-900 rounded text-[13px]"
                                >
                                  <span className="font-semibold">{hit.entity}</span>
                                  <span className="text-gray-600">·</span>
                                  <span className="font-mono">{hit.text}</span>
                                </span>
                              ))}
                              {item.ai_hits.length > 5 && (
                                <span className="px-2 py-1 text-[13px] text-gray-600">
                                  +{item.ai_hits.length - 5}개 더
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {item.stats && (
                          <div className="flex gap-4 mt-3 text-[15px] text-gray-700">
                            {item.stats.rows_scanned && (
                              <span>스캔: {item.stats.rows_scanned}행</span>
                            )}
                            {item.stats.total_entities && (
                              <span>엔티티: {item.stats.total_entities}개</span>
                            )}
                            {item.ai_hits && item.ai_hits.length > 0 && (
                              <span>AI 탐지: {item.ai_hits.length}건</span>
                            )}
                          </div>
                        )}
                      </div>

                      {(Object.keys(item.entities || {}).length > 0 ||
                        (item.ai_hits && item.ai_hits.length > 0)) && (
                        <div className="ml-4 text-right">
                          {Object.keys(item.entities || {}).length > 0 && (
                            <span className="text-[15px] text-gray-700 block">
                              {Object.keys(item.entities).length}개 엔티티 유형
                            </span>
                          )}
                          {item.ai_hits && item.ai_hits.length > 0 && (
                            <span className="text-[15px] text-blue-700 block mt-1">
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
                  <div className="text-[15px] text-gray-700">
                    페이지 {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center text-gray-600">검출된 항목이 없습니다.</div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────
          모달들: React Portal 로 body 최상단에 렌더
          ──────────────────────────────────────────────────── */}

      {/* 상세 모달 (포탈) */}
      {selectedItem &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]"
            onClick={() => setSelectedItem(null)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedItem.file}</h3>
                  {selectedItem.source && (
                    <p className="text-[15px] text-gray-700 mt-1">소스: {selectedItem.source}</p>
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
                  <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">기본 정보</h4>
                  <dl className="grid grid-cols-2 gap-4">
                    {selectedItem.type && (
                      <div>
                        <dt className="text-[14px] text-gray-700">파일 타입</dt>
                        <dd className="text-[15px] text-gray-900">{selectedItem.type}</dd>
                      </div>
                    )}
                    {selectedItem.category && (
                      <div>
                        <dt className="text-[14px] text-gray-700">카테고리</dt>
                        <dd>
                          <span
                            className={`px-2 py-1 rounded text-[13px] font-medium border ${getCategoryColor(
                              selectedItem.category
                            )}`}
                          >
                            {getCategoryLabel(selectedItem.category)}
                          </span>
                        </dd>
                      </div>
                    )}
                    {selectedItem.stats && selectedItem.stats.rows_scanned && (
                      <div>
                        <dt className="text-[14px] text-gray-700">스캔한 행 수</dt>
                        <dd className="text-[15px] text-gray-900">
                          {selectedItem.stats.rows_scanned.toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {selectedItem.stats && selectedItem.stats.total_entities && (
                      <div>
                        <dt className="text-[14px] text-gray-700">탐지된 엔티티</dt>
                        <dd className="text-[15px] text-gray-900">
                          {selectedItem.stats.total_entities.toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {selectedItem.ai_hits && (
                      <div>
                        <dt className="text-[14px] text-gray-700">AI 탐지 건수</dt>
                        <dd className="text-[15px] text-gray-900">
                          {selectedItem.ai_hits.length.toLocaleString()}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                {selectedItem.reason && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">분류 이유</h4>
                    <p className="text-[15px] text-gray-800 bg-gray-50 p-4 rounded-lg">
                      {selectedItem.reason}
                    </p>
                  </div>
                )}

                {selectedItem.ai_hits && selectedItem.ai_hits.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">
                      AI 탐지 결과 ({selectedItem.ai_hits.length}건)
                    </h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedItem.ai_hits.map((hit, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 border-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-1 bg-gray-200 text-gray-900 rounded text-[13px] font-semibold min-w-[80px] text-center">
                              {hit.entity}
                            </span>
                            <span className="text-[15px] text-gray-900 font-mono">{hit.text}</span>
                          </div>
                          <span className="text-[13px] text-gray-700">
                            신뢰도: {(hit.score * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedItem.entities && Object.keys(selectedItem.entities).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">탐지된 엔티티</h4>
                    <div className="space-y-3">
                      {Object.entries(selectedItem.entities).map(([type, entityData]) => {
                        const valueArray =
                          entityData?.values && Array.isArray(entityData.values)
                            ? entityData.values
                            : Array.isArray(entityData)
                            ? entityData
                            : [];

                        if (valueArray.length === 0) return null;

                        return (
                          <div key={type} className="border-2 border-gray-300 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900 text-[16px]">{type}</span>
                              <span className="text-[14px] text-gray-700">{valueArray.length}개</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {valueArray.slice(0, 10).map((value, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-[13px] font-mono"
                                >
                                  {value}
                                </span>
                              ))}
                              {valueArray.length > 10 && (
                                <button
                                  onClick={() =>
                                    setExpandedEntityModal({
                                      type,
                                      values: valueArray,
                                      count: valueArray.length,
                                    })
                                  }
                                  className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-[13px] hover:bg-gray-300 transition-colors"
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
          </div>,
          document.body
        )}

      {/* 엔티티 확장 모달 (포탈) */}
      {expandedEntityModal &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setExpandedEntityModal(null)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {expandedEntityModal.type}
                  </h3>
                  <p className="text-[15px] text-gray-700 mt-1">
                    총 {expandedEntityModal.count}개
                  </p>
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
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded text-[14px] font-mono"
                  >
                    {value}
                  </span>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* 보존기간 위반 모달 (포탈) */}
      {showRetentionModal &&
        retentionViolations &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]"
            onClick={() => setShowRetentionModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[80vh] overflow-auto m-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">보존기간 만료 데이터</h3>
                  <p className="text-[15px] text-gray-700 mt-1">
                    선택한 S3 버킷에서 보존기간이 만료된 데이터가 남아있는 것을 발견했습니다.
                  </p>
                  {retentionViolations.total_matched_files >
                    retentionViolations.matched_files.length && (
                    <p className="text-[14px] text-orange-700 mt-1">
                      ※ 전체 {retentionViolations.total_matched_files}개 파일 중 선택한 버킷의{' '}
                      {retentionViolations.matched_files.length}개 파일만 표시
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
                  <div className="text-[14px] text-blue-700 mb-1">검사한 RDS ID</div>
                  <div className="text-2xl font-bold text-blue-900">
                    {retentionViolations.rds_ids_checked.length}개
                  </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-[14px] text-red-700 mb-1">선택한 버킷에서 발견된 ID</div>
                  <div className="text-2xl font-bold text-red-900">
                    {retentionViolations.matched_ids.length}개
                  </div>
                  {retentionViolations.total_matched_ids >
                    retentionViolations.matched_ids.length && (
                    <div className="text-[13px] text-red-700 mt-1">
                      (전체: {retentionViolations.total_matched_ids}개)
                    </div>
                  )}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-[14px] text-green-700 mb-1">정상 처리된 ID</div>
                  <div className="text-2xl font-bold text-green-900">
                    {retentionViolations.not_found_ids.length}개
                  </div>
                </div>
              </div>

              {retentionViolations.matched_ids.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">
                    선택한 S3 버킷에 남아있는 ID 목록 ({retentionViolations.matched_ids.length}개)
                  </h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {retentionViolations.matched_ids.map((id) => (
                        <span
                          key={id}
                          className="px-3 py-1.5 bg-red-100 text-red-800 rounded font-mono text-[14px] font-semibold"
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
                  <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">
                    위반 파일 상세 ({retentionViolations.matched_files.length}개 파일)
                  </h4>
                  <div className="space-y-4">
                    {retentionViolations.matched_files.map((file, idx) => (
                      <div key={idx} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-gray-900 text-[16px]">
                                {file.file_key}
                              </div>
                              <div className="text-[14px] text-gray-700 mt-1">
                                버킷: {file.bucket} | 크기:{' '}
                                {(file.file_size / 1024).toFixed(2)} KB
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-red-100 text-red-800 rounded text-[14px] font-medium">
                              {file.found_ids.length}개 ID 발견
                            </span>
                          </div>
                        </div>

                        <div className="p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                              <thead className="bg-gray-50">
                                <tr>
                                  <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-600 uppercase">
                                    ID
                                  </th>
                                  <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-600 uppercase">
                                    행 번호
                                  </th>
                                  <th className="px-4 py-2 text-left text-[12px] font-medium text-gray-600 uppercase">
                                    데이터
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {file.matches.map((match, matchIdx) => (
                                  <tr key={matchIdx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-[14px] font-mono font-semibold text-gray-900">
                                      {match.id}
                                    </td>
                                    <td className="px-4 py-3 text-[14px] text-gray-700">
                                      {match.row_number}
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="text-[13px] text-gray-800 font-mono">
                                        {Object.entries(match.row_data).map(([key, value]) => (
                                          <div key={key} className="mb-1">
                                            <span className="font-semibold text-gray-900">{key}:</span>{' '}
                                            <span className="text-gray-800">
                                              {value || 'null'}
                                            </span>
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
                <div className="text-center py-8 text-gray-600 bg-gray-50 rounded-lg">
                  선택한 S3 버킷에서는 보유기간 만료 데이터가 발견되지 않았습니다.
                </div>
              )}

              {retentionViolations.not_found_ids.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-900 mb-3 text-[18px]">
                    정상 처리된 ID ({retentionViolations.not_found_ids.length}개)
                  </h4>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex flex-wrap gap-2">
                      {retentionViolations.not_found_ids.map((id) => (
                        <span
                          key={id}
                          className="px-3 py-1.5 bg-green-100 text-green-800 rounded font-mono text-[14px]"
                        >
                          ID: {id}
                        </span>
                      ))}
                    </div>
                    <p className="text-[14px] text-green-800 mt-3">
                      이 ID들은 RDS에서 익명화되었고 S3에서도 발견되지 않았습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default AegisResults;
