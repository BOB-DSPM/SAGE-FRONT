// src/App.js
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Header from './components/navigation/Header';
import Sidebar from './components/navigation/Sidebar';
import Overview from './pages/Overview';
import Inventory from './pages/DataTarget';
import Alerts from './pages/Alerts';
import Policies from './pages/Policies';
import Policies2 from './pages/Policies2';
import Lineage from './pages/Lineage';
import AwsSetup from './pages/AwsSetup';
import AegisResults from './pages/AegisResults';
import { Activity, Database, Bell, Shield, GitBranch, Cloud, Target, BarChart3,ClipboardList,  FolderSearch       } from 'lucide-react';

const tabs = [
  { id: 'overview', name: 'Overview', icon: Activity },
  { id: 'aws-setup', name: 'AWS Setup', icon: Cloud },
  { id: 'data-target', name: 'Data Collector', icon: FolderSearch            },
  { id: 'lineage', name: 'Lineage', icon: GitBranch },
  { id: 'policies', name: 'Compliance Status', icon: BarChart3  },
  { id: 'policies2', name: 'Policies', icon: ClipboardList  },
  { id: 'alerts', name: 'Alerts', icon: Bell },
];

const DashboardLayout = ({ children, onLogout, showSidebar = true }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [componentKeys, setComponentKeys] = useState({
    overview: 0,
    'aws-setup': 0,
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    alerts: 0,
  });

  const handleLogout = () => {
    onLogout();
    setActiveTab('overview');
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys(prev => ({
      ...prev,
      [tabId]: prev[tabId] + 1
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
    'aws-setup': 0,
    'data-target': 0,
    lineage: 0,
    policies: 0,
    policies2: 0,
    alerts: 0,
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setComponentKeys(prev => ({
      ...prev,
      [tabId]: prev[tabId] + 1
    }));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview key={componentKeys.overview} securityScoreData={{ score: 79 }} />;
      case 'data-target':
        return <Inventory key={componentKeys['data-target']} activeTab={activeTab} />;
      case 'alerts':
        return <Alerts key={componentKeys.alerts} />;
      case 'policies':
        return <Policies key={componentKeys.policies} />;
      case 'policies2':
        return <Policies2 key={componentKeys.policies2} />;
      case 'lineage':
        return <Lineage key={componentKeys.lineage} />;
      case 'aws-setup':
        return <AwsSetup key={componentKeys['aws-setup']} />;
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

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

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
      </Routes>
    </BrowserRouter>
  );
};

export default App;
