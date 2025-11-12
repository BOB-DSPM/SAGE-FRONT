// src/components/navigation/Header.js
import React from 'react';
import { LogOut } from 'lucide-react';

const Header = ({ onLogout }) => {
  return (
    <div
      className="bg-white border-b-[2.5px] border-gray-300 px-6 py-4 flex items-center justify-between transition-all duration-300"
      style={{
        boxShadow:
          'inset 0 -1px 0 rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* 왼쪽 타이틀 영역 */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          SAGE Dashboard
        </h1>
        <p className="text-sm text-gray-600">
          MLOPS's Data Security Posture Management
        </p>
      </div>

      {/* 로그아웃 버튼 (활성화 시 디자인 일관 적용) */}
      {/* 
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 px-4 py-2 border border-gray-300 
        text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 
        hover:border-gray-400 shadow-sm transition-all duration-200"
      >
        <LogOut className="w-4 h-4 text-gray-600" />
        <span>Logout</span>
      </button>
      */}
    </div>
  );
};

export default Header;
