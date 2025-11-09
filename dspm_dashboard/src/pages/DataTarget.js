// DataTarget.js - 에러 처리 및 로깅 강화
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataTarget } from '../hooks/useDataTarget';
import DataTargetList from '../components/DataTarget/DataTargetList';
import { aegisApi } from '../services/aegisApi';
import { Database, AlertCircle } from 'lucide-react';

const ANALYZER_API_BASE = 'http://127.0.0.1:8400';
const COLLECTOR_API = 'http://43.202.228.52:8000';

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
      console.log('=== RDS 자동 스캔 시작 ===');
      console.log('API URL:', `${ANALYZER_API_BASE}/api/v2/scan/rds-auto`);
      
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/rds-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collector_api: COLLECTOR_API,
          default_user: 'madeit',
          default_password: 'madeit1022!'
        })
      });

      console.log('RDS 스캔 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('RDS 스캔 에러 응답:', errorText);
        throw new Error(`RDS 스캔 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✓ RDS 자동 스캔 완료:', result);
      
      return result;
    } catch (error) {
      console.error('✗ RDS 자동 스캔 오류:', error);
      throw error;
    }
  };

  // 3. RDS-S3 교차 검증 실행
  const runCrossCheck = async () => {
    try {
      console.log('=== RDS-S3 교차 검증 시작 ===');
      console.log('API URL:', `${ANALYZER_API_BASE}/api/v2/scan/cross-check`);
      
      const requestBody = {
        collector_api: COLLECTOR_API,
        bucket_names: null,
        file_extensions: ['.csv', '.json', '.txt'],
        max_files_per_bucket: 100
      };
      
      console.log('요청 본문:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/cross-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('교차 검증 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('교차 검증 에러 응답:', errorText);
        throw new Error(`교차 검증 실패: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✓ RDS-S3 교차 검증 완료:', result);
      
      return result;
    } catch (error) {
      console.error('✗ RDS-S3 교차 검증 오류:', error);
      console.error('에러 상세:', error.message);
      console.error('에러 스택:', error.stack);
      throw error;
    }
  };

  // 4. 교차 검증 리포트 조회
  const getCrossCheckReport = async () => {
    try {
      console.log('=== 교차 검증 리포트 조회 시작 ===');
      console.log('API URL:', `${ANALYZER_API_BASE}/api/v2/scan/cross-check/report`);
      
      const response = await fetch(`${ANALYZER_API_BASE}/api/v2/scan/cross-check/report`);
      
      console.log('리포트 조회 응답 상태:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('리포트 조회 에러 응답:', errorText);
        throw new Error(`리포트 조회 실패: ${response.status} - ${errorText}`);
      }

      const report = await response.json();
      console.log('✓ 교차 검증 리포트 조회 완료:', report);
      
      return report;
    } catch (error) {
      console.error('✗ 리포트 조회 오류:', error);
      console.error('에러 상세:', error.message);
      return null;
    }
  };

  // 위협 식별 결과 조회 (통합 실행) - 항상 보유기간 체크
  const handleSendToAnalyzer = async () => {
    if (selectedResources.size === 0) {
      alert('위협 식별할 저장소를 선택해주세요.');
      return;
    }

    setIsSending(true);
    console.log('\n\n========== 통합 검증 프로세스 시작 ==========\n');

    try {
      const selectedItems = inventoryData.filter(item => 
        selectedResources.has(item.id)
      );

      console.log('선택된 리소스:', selectedItems);

      // RDS 인스턴스 필터링
      const rdsInstances = selectedItems.filter(item => item.type === 'rds');
      const hasRds = rdsInstances.length > 0;

      console.log('RDS 인스턴스 포함 여부:', hasRds);
      console.log('RDS 인스턴스 개수:', rdsInstances.length);

      let rdsAutoResult = null;
      let crossCheckResult = null;
      let threatResults = null;
      let crossCheckReport = null;

      // Step 1: RDS가 선택된 경우 RDS 자동 스캔 실행
      if (hasRds) {
        console.log(`\n[1/4] ${rdsInstances.length}개의 RDS 인스턴스 자동 스캔 시작...`);
        
        try {
          rdsAutoResult = await runRdsAutoScan();
          console.log('✓ Step 1 완료: RDS 자동 스캔');
        } catch (error) {
          console.error('✗ Step 1 실패: RDS 자동 스캔');
          console.error('에러:', error);
          alert(`RDS 스캔 실패: ${error.message}\n\n계속 진행하시겠습니까?`);
          // RDS 스캔 실패해도 계속 진행하도록 수정
        }
      } else {
        console.log('\n[1/4] RDS 인스턴스가 선택되지 않음 - RDS 스캔 건너뜀');
      }

      // Step 2: 일반 위협 식별 결과 조회 (S3, EBS 등)
      console.log('\n[2/4] 위협 식별 결과 조회 시작...');
      
      try {
        threatResults = await aegisApi.getFrontList();
        console.log('✓ Step 2 완료: 위협 식별 결과 조회');
        console.log('조회된 항목 수:', threatResults?.items?.length || 0);
      } catch (error) {
        console.error('✗ Step 2 실패: 위협 식별 결과 조회');
        console.error('에러:', error);
      }

      // Step 3: 보유기간 만료 체크 (항상 실행)
      console.log('\n[3/4] 보유기간 만료 체크 (RDS-S3 교차 검증) 시작...');
      
      try {
        crossCheckResult = await runCrossCheck();
        console.log('✓ Step 3 완료: RDS-S3 교차 검증');
      } catch (error) {
        console.error('✗ Step 3 실패: RDS-S3 교차 검증');
        console.error('에러:', error);
        alert(`교차 검증 실패: ${error.message}\n\n이 단계를 건너뛰고 계속 진행합니다.`);
      }

      // Step 4: 교차 검증 리포트 조회 (항상 실행)
      console.log('\n[4/4] 교차 검증 리포트 조회 시작...');
      
      try {
        crossCheckReport = await getCrossCheckReport();
        console.log('✓ Step 4 완료: 교차 검증 리포트 조회');
      } catch (error) {
        console.error('✗ Step 4 실패: 교차 검증 리포트 조회');
        console.error('에러:', error);
      }

      console.log('\n========== 모든 스캔 완료 ==========\n');
      console.log('결과 요약:');
      console.log('- RDS 자동 스캔:', rdsAutoResult ? '성공' : '건너뜀/실패');
      console.log('- 위협 식별:', threatResults ? '성공' : '실패');
      console.log('- 교차 검증:', crossCheckResult ? '성공' : '실패');
      console.log('- 리포트:', crossCheckReport ? '성공' : '실패');

      // Step 5: 통합 결과 페이지로 이동
      console.log('\n결과 페이지로 이동...');
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
      console.error('\n========== 치명적 오류 발생 ==========');
      console.error('조회 실패:', error);
      console.error('에러 메시지:', error.message);
      console.error('에러 스택:', error.stack);
      alert('결과 조회 중 치명적인 오류가 발생했습니다:\n\n' + error.message);
    } finally {
      setIsSending(false);
      console.log('\n========== 프로세스 종료 ==========\n\n');
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