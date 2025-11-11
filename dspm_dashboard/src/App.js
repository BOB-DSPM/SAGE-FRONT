// ==============================
// src/App.js
// (사용자 제공안 + /opensource/:code 상세 라우트 포함)
// ==============================
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
//import Login from './pages/Login';
import Header from './components/navigation/Header';
import Sidebar from './components/navigation/Sidebar';
import Overview from './pages/Overview';
import Inventory from './pages/DataTarget';
//import Alerts from './pages/Alerts';
import Policies from './pages/Policies';
import Policies2 from './pages/Policies2';
import Lineage from './pages/Lineage';
//import AwsSetup from './pages/AwsSetup';
import AegisResults from './pages/AegisResults';
import ThreatCompliance from './pages/ThreatCompliance';
import ThreatComplianceDetail from './pages/ThreatComplianceDetail';

// ✅ 추가: Opensource 페이지 임포트
import Opensource from './pages/Opensource';
import OpensourceDetail from './pages/OpensourceDetail';

// ✅ 추가: 아이콘 임포트 확장 (lucide-react)
import { Activity, Database, Bell, Shield, GitBranch, Cloud, Target, BarChart3, ClipboardList, FolderSearch, ShieldAlert, Boxes } from 'lucide-react';

const tabs = [
  { id: '메인', name: 'Overview', icon: Activity },
  //{ id: 'aws-setup', name: 'AWS Setup', icon: Cloud },
  { id: '데이터 수집/식별', name: 'Data Collector', icon: FolderSearch },
  { id: '라인리지', name: 'Lineage', icon: GitBranch },

  // 아코디언 메뉴
  { 
    id: 'audit', 
    name: '감사', 
    icon: ClipboardList,
    children: [
      { id: 'policies2', name: '컴플라이언스', icon: ClipboardList },
      { id: 'threat-compliance', name: '위협', icon: ShieldAlert },
    ]
  },
  //{ id: 'alerts', name: 'Alerts', icon: Bell },
  // { id: 'policies', name: 'Compliance Result', icon: BarChart3 },

  { id: 'opensource', name: '오픈소스', icon: Boxes },
];

const DashboardLayout = ({ children, onLogout, showSidebar = true }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [componentKeys, setComponentKeys] = useState({
    overview: 0,
    //'aws-setup': 0,
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    'threat-compliance': 0,
    // ✅ 추가: opensource 키
    opensource: 0,
    //alerts: 0,
  });

  const handleLogout = () => {
    onLogout();
    setActiveTab('overview');
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys(prev => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onLogout={handleLogout} />
      <div className="flex flex-1">
        {showSidebar && <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />}
        <div className="flex-1 px-6 py-8">{children}</div>
      </div>
    </div>
  );
};

const MainDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [componentKeys, setComponentKeys] = useState({
    overview: 0,
    //'aws-setup': 0,
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    'threat-compliance': 0,
    // ✅ 추가: opensource 키
    opensource: 0,
    //alerts: 0,
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys(prev => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview key={componentKeys.overview} securityScoreData={{ score: 79 }} />;
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

      // ✅ 추가: opensource 렌더
      case 'opensource':
        return <Opensource key={componentKeys.opensource} />;

      //case 'aws-setup':
      //  return <AwsSetup key={componentKeys['aws-setup']} />;
      default:
        return <Overview key={componentKeys.overview} securityScoreData={{ score: 79 }} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header onLogout={onLogout} />
      <div className="flex flex-1">
        <Sidebar tabs={tabs} activeTab={activeTab} setActiveTab={handleTabChange} />
        <div className="flex-1 px-6 py-8">{renderContent()}</div>
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
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/*" element={<MainDashboard onLogout={() => setIsLoggedIn(false)} />} />
        <Route 
          path="/aegis-results" 
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8">
                <AegisResults />
              </div>
            </div>
          } 
        />
        <Route 
          path="/threat-compliance/:reqId" 
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8">
                <ThreatComplianceDetail />
              </div>
            </div>
          } 
        />
        <Route 
          path="/opensource/:code"
          element={
            <div className="min-h-screen flex flex-col bg-gray-50">
              <Header onLogout={() => setIsLoggedIn(false)} />
              <div className="flex-1 px-6 py-8">
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
