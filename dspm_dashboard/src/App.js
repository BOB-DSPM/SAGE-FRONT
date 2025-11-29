import React, { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
//import Login from './pages/Login';
import Header from './components/navigation/Header';
import Sidebar from './components/navigation/Sidebar';
import Inventory from './pages/DataTarget';
//import Alerts from './pages/Alerts';
import Policies from './pages/Policies';
import Policies2 from './pages/Policies2';
import Lineage from './pages/Lineage';
//import AwsSetup from './pages/AwsSetup';
import AegisResults from './pages/AegisResults';
import ThreatCompliance from './pages/ThreatCompliance';
import ThreatComplianceDetail from './pages/ThreatComplianceDetail';

/* ✅ 추가: Opensource 페이지 임포트 */
import Opensource from './pages/Opensource';
import OpensourceDetail from './pages/OpensourceDetail';

import OssEvidence from './pages/OssEvidence';

/* ✅ 아이콘 (참고: 실제 사용은 Sidebar 컴포넌트 내부) */
import {
  Database,
  Bell,
  Shield,
  GitBranch,
  Cloud,
  Target,
  BarChart3,
  ClipboardList,
  FolderSearch,
  ShieldAlert,
  Boxes,
  FileText,
} from 'lucide-react';

const tabs = [
  //{ id: 'aws-setup', name: 'AWS Setup', icon: Cloud },
  { id: 'data-target', name: '데이터 수집/식별', icon: FolderSearch },
  { id: 'lineage', name: '데이터 라인리지', icon: GitBranch },

  // 아코디언 메뉴
  {
    id: 'audit',
    name: '진단',
    icon: ClipboardList,
    children: [
      { id: 'policies2', name: '컴플라이언스', icon: ClipboardList },
      { id: 'threat-compliance', name: '보안 위협', icon: ShieldAlert },
    ],
  },
  //{ id: 'alerts', name: 'Alerts', icon: Bell },
  // { id: 'policies', name: 'Compliance Result', icon: BarChart3 },

  { id: 'opensource', name: '오픈소스', icon: Boxes },
  { id: 'oss-evidence', name: '증적 보고서', icon: FileText },
];

// 현재 이 Layout은 사용 안 하고 있어서 그대로 두되, URL 연동은 MainDashboard 쪽에서만 처리
const DashboardLayout = ({ children, onLogout, showSidebar = true }) => {
  const [activeTab, setActiveTab] = useState('data-target');
  const [componentKeys, setComponentKeys] = useState({
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    'threat-compliance': 0,
    // ✅ 추가: opensource 키
    opensource: 0,
    //alerts: 0,
    'oss-evidence': 0,
  });

  const handleLogout = () => {
    onLogout();
    setActiveTab('data-target');
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1,
    }));
  };

  return (
    <div className="min-h-screen flex flex-col app-bg">
      <Header onLogout={handleLogout} />
      <div className="flex flex-1">
        {showSidebar && (
          <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />
        )}
        <div className="flex-1 px-6 py-8 content-wrap">{children}</div>
      </div>
    </div>
  );
};

const MainDashboard = ({ onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const TAB_IDS = [
    'data-target',
    'lineage',
    'policies',
    'policies2',
    'threat-compliance',
    'opensource',
    'oss-evidence',
  ];

  // basename("/dashboard") 를 고려해서 현재 path 에서 탭 id 추출
  const getTabFromPath = (pathname) => {
    const path = pathname.startsWith('/dashboard')
      ? pathname.replace('/dashboard', '') || '/'
      : pathname;

    const segment = path.replace(/^\/+/, '').split('/')[0]; // "data-target", "lineage" 등
    if (TAB_IDS.includes(segment)) return segment;
    return 'data-target';
  };

  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));
  const [componentKeys, setComponentKeys] = useState({
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    'threat-compliance': 0,
    // ✅ 추가: opensource 키
    opensource: 0,
    //alerts: 0,
    'oss-evidence': 0,
  });

  // URL이 바뀔 때(뒤로가기, 직접 입력 등) activeTab 동기화
  useEffect(() => {
    const tabId = getTabFromPath(location.pathname);
    if (tabId !== activeTab) {
      setActiveTab(tabId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1,
    }));
    // 탭 변경 시 URL도 함께 변경
    navigate(`/${tabId}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'data-target':
        return <Inventory key={componentKeys['data-target']} activeTab={activeTab} />;
      //case 'alerts':
      //  return <Alerts key={componentKeys.alerts} />;
      case 'policies':
        return <Policies key={componentKeys.policies} />;
      case 'policies2':
        return <Policies2 key={componentKeys.policies2} />;
      case 'lineage':
        return <Lineage key={componentKeys.lineage} />;
      case 'threat-compliance':
        return <ThreatCompliance key={componentKeys['threat-compliance']} />;
      case 'opensource':
        return <Opensource key={componentKeys.opensource} />;
      case 'oss-evidence':
        return <OssEvidence key={componentKeys['oss-evidence']} />;
      default:
        return <Inventory key={componentKeys['data-target']} activeTab={activeTab} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col app-bg">
      <Header onLogout={onLogout} />
      <div className="flex flex-1">
        <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />
        <div className="flex-1 px-6 py-8 content-wrap">{renderContent()}</div>
      </div>
    </div>
  );
};

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  //if (!isLoggedIn) {
  //  return <Login onLogin={() => setIsLoggedIn(true)} />;
  //}

  return (
    <BrowserRouter basename="/dashboard">
      <Routes>
        {/* 기본 진입 시 /data-target 로 리다이렉트 */}
        <Route path="/" element={<Navigate to="/data-target" replace />} />

        {/* 메인 대시보드: /data-target, /lineage, /policies2, ... 전부 여기서 처리 */}
        <Route path="/*" element={<MainDashboard onLogout={() => setIsLoggedIn(false)} />} />

        {/* Aegis 결과 상세 페이지 */}
        <Route
          path="/aegis-results"
          element={
            <div className="min-h-screen flex flex-col app-bg">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8 content-wrap">
                <AegisResults />
              </div>
            </div>
          }
        />

        {/* 위협-컴플라이언스 상세 */}
        <Route
          path="/threat-compliance/:reqId"
          element={
            <div className="min-h-screen flex flex-col app-bg">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8 content-wrap">
                <ThreatComplianceDetail />
              </div>
            </div>
          }
        />

        {/* 오픈소스 도구별 상세 */}
        <Route
          path="/opensource/:code"
          element={
            <div className="min-h-screen flex flex-col app-bg">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8 content-wrap">
                <OpensourceDetail />
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
