import React from 'react';
import { LogOut } from 'lucide-react';

const Header = ({ onLogout }) => {
  return (
    <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">SAGE Dashboard</h1>
        <p className="text-sm text-gray-600">MLOPS's Data Security Posture Management</p>
      </div>
      <button
        onClick={onLogout}
        className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </div>
  );
};

export default Header;