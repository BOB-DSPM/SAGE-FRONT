// DataTarget.js - 실제 API 스펙에 맞춘 버전
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataTarget } from '../hooks/useDataTarget';
import DataTargetList from '../components/DataTarget/DataTargetList';
import { aegisApi } from '../services/aegisApi';
import { Database, AlertCircle } from 'lucide-react';

const ANALYZER_API_BASE = 'http://127.0.0.1:8400';
const COLLECTOR_API = 'http://211.44.183.248:8000';

const DataTarget = ({ activeTab }) => {
  const { inventoryData, loadingInventory, error, raw } = useDataTarget(activeTab);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedResources, setSelectedResources] = useState(new Set());
  const navigate = useNavigate();

  // 1. 콜렉터 실행 (S3, EBS 등 데이터 수집)
  const handleRunCollector = async () => {
    if (window.confirm('콜렉터를 실행하여 모든 리소스의 데이터를 수집합니다. (수 분 소요될 수 있습니다)')) {
      setIsCollecting(true);
      
      try {
        console.log('콜렉터 실행 시작...');
        const response = await aegisApi.runCollector();
        
        console.log('콜렉터 실행 완료:', response);
        alert('데이터 수집이 완료되었습니다.');
        
      } catch (error) {
        console.error('콜렉터 실행 실패:', error);
        alert('콜렉터 실행 중 오류가 발생했습니다: ' + error.message);
      } finally {
        setIsCollecting(false);
      }
    }
  };

  // 2. RDS 자동 스캔 실행 (v2 API)
  const runRdsAutoScan = async () => {
    try {
      console.log('RDS 자동 스캔 시작...');
      
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/rds-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collector_api: COLLECTOR_API,
          default_user: 'madeit',
          default_password: 'madeit1022!'
        })
      });

      if (!response.ok) {
        throw new Error(`RDS 스캔 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log('RDS 자동 스캔 완료:', result);
      
      return result;
    } catch (error) {
      console.error('RDS 자동 스캔 오류:', error);
      throw error;
    }
  };

  // 3. RDS-S3 교차 검증 실행
  const runCrossCheck = async () => {
    try {
      console.log('RDS-S3 교차 검증 시작...');
      
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/cross-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collector_api: COLLECTOR_API,
          bucket_names: null, // 전체 버킷 검색
          file_extensions: ['.csv', '.json', '.txt'],
          max_files_per_bucket: 100
        })
      });

      if (!response.ok) {
        throw new Error(`교차 검증 실패: ${response.status}`);
      }

      const result = await response.json();
      console.log('RDS-S3 교차 검증 완료:', result);
      
      return result;
    } catch (error) {
      console.error('RDS-S3 교차 검증 오류:', error);
      throw error;
    }
  };

  // 4. 교차 검증 리포트 조회
  const getCrossCheckReport = async () => {
    try {
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/cross-check/report`);
      
      if (!response.ok) {
        throw new Error(`리포트 조회 실패: ${response.status}`);
      }

      const report = await response.json();
      console.log('교차 검증 리포트:', report);
      
      return report;
    } catch (error) {
      console.error('리포트 조회 오류:', error);
      return null;
    }
  };

  // 위협 식별 결과 조회 (통합 실행)
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

      // RDS 인스턴스 필터링
      const rdsInstances = selectedItems.filter(item => item.type === 'rds');
      const hasRds = rdsInstances.length > 0;

      let rdsAutoResult = null;
      let crossCheckResult = null;
      let threatResults = null;

      // Step 1: RDS가 선택된 경우 RDS 자동 스캔 실행
      if (hasRds) {
        console.log(`\n[1/3] ${rdsInstances.length}개의 RDS 인스턴스 자동 스캔 시작...`);
        
        try {
          rdsAutoResult = await runRdsAutoScan();
          console.log('✓ RDS 자동 스캔 완료');
        } catch (error) {
          console.error('✗ RDS 자동 스캔 실패:', error);
          alert(`RDS 스캔 실패: ${error.message}`);
          // RDS 스캔 실패 시 전체 프로세스 중단
          setIsSending(false);
          return;
        }

        // Step 2: RDS-S3 교차 검증 실행
        console.log('\n[2/3] RDS-S3 교차 검증 시작...');
        
        try {
          crossCheckResult = await runCrossCheck();
          console.log('✓ RDS-S3 교차 검증 완료');
        } catch (error) {
          console.error('✗ RDS-S3 교차 검증 실패:', error);
          // 교차 검증 실패해도 계속 진행
        }
      }

      // Step 3: 일반 위협 식별 결과 조회 (S3, EBS 등)
      console.log('\n[3/3] 위협 식별 결과 조회 시작...');
      
      try {
        threatResults = await aegisApi.getFrontList();
        console.log('✓ 위협 식별 결과 조회 완료');
      } catch (error) {
        console.error('✗ 위협 식별 결과 조회 실패:', error);
      }

      // Step 4: 교차 검증 리포트 조회 (있는 경우)
      let crossCheckReport = null;
      if (hasRds) {
        console.log('\n[추가] 교차 검증 리포트 조회...');
        crossCheckReport = await getCrossCheckReport();
      }

      console.log('\n=== 모든 스캔 완료 ===\n');

      // Step 5: 통합 결과 페이지로 이동
      navigate('/aegis-results', {
        state: {
          services: selectedItems.map(item => item.name || item.id),
          timestamp: new Date().toISOString(),
          selectedItems: selectedItems,
          threatResults: threatResults,
          rdsAutoResult: rdsAutoResult,
          crossCheckResult: crossCheckResult,
          crossCheckReport: crossCheckReport,
          hasRds: hasRds
        }
      });

    } catch (error) {
      console.error('조회 실패:', error);
      alert('결과 조회 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 rounded-lg bg-red-100 text-red-700">
          <p className="font-medium">오류 발생</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* RDS 인스턴스 안내 */}
      {inventoryData.filter(item => item.type === 'rds').length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Database className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <div className="font-medium text-blue-900 mb-1">RDS 통합 검증</div>
              <div className="text-sm text-blue-700">
                RDS 인스턴스를 선택하면 다음 작업이 자동으로 실행됩니다:
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li>RDS 익명화 검증 스캔 (자동 메타데이터 활용)</li>
                  <li>RDS-S3 교차 검증 (익명화된 ID의 S3 원본 검색)</li>
                  <li>통합 리포트 생성</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <DataTargetList 
        inventoryData={inventoryData} 
        loading={loadingInventory}
        onRunCollector={handleRunCollector}
        onSendToAnalyzer={handleSendToAnalyzer}
        isCollecting={isCollecting}
        isSending={isSending}
        selectedResources={selectedResources}
        setSelectedResources={setSelectedResources}
      />
    </div>
  );
};

export default DataTarget;