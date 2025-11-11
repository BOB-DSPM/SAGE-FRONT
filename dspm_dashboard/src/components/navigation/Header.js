import React from 'react';
import { Download } from 'lucide-react';

const Header = ({ onLogout }) => {
  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">SAGE Dashboard</h1>
        <p className="h-subtitle">MLOPS's Data Security Posture Management</p>
      </div>

      {/* 필요하면 내보내기/액션 영역 */}
      <button className="btn">
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  );
};

export default Header;
