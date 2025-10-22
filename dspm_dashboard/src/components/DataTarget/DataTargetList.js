// src/components/DataTarget/DataTargetList.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ResourceCard from './ResourceCard';
import DetailPanel from './DetailPanel';
import { aegisApi } from '../../services/aegisApi';

const DataTargetList = ({ inventoryData, loading }) => {
  const navigate = useNavigate();
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedResources, setSelectedResources] = useState(new Set());
  const [filter, setFilter] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);

  // 모든 리소스 타입 정의
  const allResourceTypes = [
    { type: 's3', label: 'S3' },
    { type: 'ebs', label: 'EBS' },
    { type: 'efs', label: 'EFS' },
    { type: 'fsx', label: 'FSx' },
    { type: 'rds', label: 'RDS' },
    { type: 'rds_snapshot', label: 'RDS_SNAPSHOT' },
    { type: 'dynamodb', label: 'DynamoDB' },
    { type: 'redshift', label: 'Redshift' },
    { type: 'elasticache', label: 'ElastiCache' },
    { type: 'glacier', label: 'Glacier' },
    { type: 'backup', label: 'Backup' },
    { type: 'feature_group', label: 'Feature Group' },
    { type: 'glue', label: 'Glue' },
    { type: 'kinesis', label: 'Kinesis' },
    { type: 'msk', label: 'MSK' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">리소스를 불러오는 중...</div>
      </div>
    );
  }

  const handleResourceClick = (resource) => {
    setSelectedResource(resource);
  };

  const toggleResourceSelection = (e, resourceId) => {
    e.stopPropagation();
    const newSelected = new Set(selectedResources);
    if (newSelected.has(resourceId)) {
      newSelected.delete(resourceId);
    } else {
      newSelected.add(resourceId);
    }
    setSelectedResources(newSelected);
  };

  // 전체 선택/해제 기능
  const handleSelectAll = () => {
    const filteredIds = filteredResources.map(r => r.id);
    const allSelected = filteredIds.every(id => selectedResources.has(id));
    
    if (allSelected) {
      const newSelected = new Set(selectedResources);
      filteredIds.forEach(id => newSelected.delete(id));
      setSelectedResources(newSelected);
    } else {
      const newSelected = new Set(selectedResources);
      filteredIds.forEach(id => newSelected.add(id));
      setSelectedResources(newSelected);
    }
  };

  // 콜렉터 실행 (파일 저장만)
  const handleRunCollector = async () => {
    if (window.confirm('콜렉터를 실행하여 최신 데이터를 수집하시겠습니까? (수 분 소요될 수 있습니다)')) {
      setIsCollecting(true);
      
      try {
        console.log('콜렉터 실행 시작...');
        const response = await aegisApi.runCollector();
        
        console.log('콜렉터 실행 완료:', response);
        alert('데이터 수집이 완료되었습니다. 이제 리소스를 선택하여 위협 식별을 시작할 수 있습니다.');
        
      } catch (error) {
        console.error('콜렉터 실행 실패:', error);
        alert('콜렉터 실행 중 오류가 발생했습니다: ' + error.message);
      } finally {
        setIsCollecting(false);
      }
    }
  };

  // 위협 식별 (저장된 결과 조회만)
  const handleSendToAnalyzer = async () => {
    if (selectedResources.size === 0) {
      alert('위협 식별할 저장소를 선택해주세요.');
      return;
    }

    setIsSending(true);

    try {
      const selectedItems = inventoryData.filter(item => 
        selectedResources.has(item.id)
      );

      console.log('선택된 리소스:', selectedItems);

      // 저장된 결과 조회
      const results = await aegisApi.getFrontList();
      
      console.log('조회된 결과:', results);

      // 결과 페이지로 이동
      navigate('/aegis-results', {
        state: {
          services: selectedItems.map(item => item.name || item.id),
          timestamp: new Date().toISOString(),
          selectedItems: selectedItems,
          results: results
        }
      });

    } catch (error) {
      console.error('조회 실패:', error);
      console.error('에러 상세:', error.message);
      alert('결과 조회 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredResources = filter === 'all' 
    ? inventoryData 
    : inventoryData.filter(r => r.type === filter);

  const getResourceCount = (type) => {
    return inventoryData.filter(r => r.type === type).length;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AWS 리소스 인벤토리</h3>
              <p className="text-gray-600">총 {inventoryData.length}개의 리소스 | {selectedResources.size}개 선택됨</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 콜렉터 실행 버튼 */}
              <button
                onClick={handleRunCollector}
                disabled={isCollecting}
                className="h-10 px-4 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {isCollecting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    수집 중...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    콜렉터 실행
                  </>
                )}
              </button>

              {/* 전체 선택/해제 버튼 */}
              <button
                onClick={handleSelectAll}
                className="h-10 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {filteredResources.length > 0 && filteredResources.every(r => selectedResources.has(r.id)) ? '전체 해제' : '전체 선택'}
              </button>

              {/* 위협 식별 시작 버튼 */}
              {selectedResources.size > 0 && (
                <button
                  onClick={handleSendToAnalyzer}
                  disabled={isSending}
                  className="h-10 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors whitespace-nowrap"
                >
                  {isSending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      조회 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      위협 식별 결과 조회 ({selectedResources.size})
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            전체 ({inventoryData.length})
          </button>
          
          {allResourceTypes.map(({ type, label }) => {
            const count = getResourceCount(type);
            return (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === type ? 'bg-primary-600 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                } ${count === 0 ? 'opacity-50' : ''}`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        {filteredResources.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map(resource => (
              <div key={resource.id} className="relative">
                <ResourceCard
                  resource={resource}
                  onClick={() => handleResourceClick(resource)}
                  isSelected={selectedResources.has(resource.id)}
                  isDetailViewing={selectedResource?.id === resource.id}
                />
                <div className="absolute top-2 right-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedResources.has(resource.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleResourceSelection(e, resource.id);
                    }}
                    className="w-5 h-5 text-primary-600 rounded cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            {filter === 'all' ? '리소스가 없습니다.' : `${allResourceTypes.find(t => t.type === filter)?.label} 리소스가 없습니다.`}
          </div>
        )}
      </div>

      {selectedResource && (
        <DetailPanel 
          resource={selectedResource} 
          onClose={() => setSelectedResource(null)} 
        />
      )}
    </div>
  );
};

export default DataTargetList;